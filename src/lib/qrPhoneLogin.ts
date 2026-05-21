/**
 * 🔐 QR 기반 전화번호 로그인 유틸리티
 * 
 * 아키텍처:
 * 1. PC: QR 세션 생성 → QR 코드 표시
 * 2. 모바일: QR 스캔 → 전화번호 입력 → SMS 인증
 * 3. 인증 성공: QR 세션에 userId 바인딩
 * 4. PC: 실시간 감지 → 자동 로그인
 */

import { doc, setDoc, onSnapshot, Timestamp, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

/**
 * QR 세션 타입 정의
 */
export interface QRLoginSession {
  sessionId: string;
  status: "pending" | "verified" | "token_ready" | "consumed" | "expired";
  userId?: string;
  customToken?: string; // Cloud Function이 작성
  tokenIssuedAt?: Timestamp;
  consumedAt?: Timestamp; // PC 로그인 성공 후 작성
  createdAt: Timestamp;
  expiresAt: Timestamp;
  phoneNumber?: string; // 인증 진행 중 전화번호 (선택적)
}

/**
 * QR 세션 생성 (PC에서 호출)
 * @param expiresInMinutes 만료 시간 (기본 5분)
 * @returns sessionId
 */
export async function createQRLoginSession(expiresInMinutes: number = 5): Promise<string> {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  const sessionData: Omit<QRLoginSession, "sessionId"> = {
    status: "pending",
    createdAt: serverTimestamp() as Timestamp,
    expiresAt: Timestamp.fromDate(expiresAt),
  };

  await setDoc(doc(db, "qrSessions", sessionId), sessionData);

  console.log("🔐 [qrPhoneLogin] QR 세션 생성:", sessionId);
  return sessionId;
}

/**
 * QR 세션에 사용자 바인딩 (모바일에서 인증 성공 시 호출)
 * @param sessionId QR 세션 ID
 * @param userId Firebase Auth UID
 */
export async function bindUserToQRSession(sessionId: string, userId: string): Promise<void> {
  const sessionRef = doc(db, "qrSessions", sessionId);
  
  // 🔥 트랜잭션으로 Race Condition 방지 (TC-5: QR 중복 스캔 방지)
  try {
    await runTransaction(db, async (transaction) => {
      const sessionSnap = await transaction.get(sessionRef);
      
      if (!sessionSnap.exists()) {
        throw new Error("세션이 존재하지 않습니다.");
      }
      
      const data = sessionSnap.data() as QRLoginSession;
      
      // 이미 verified이면 차단 (중복 스캔 방지)
      if (data.status === "verified" || data.status === "token_ready" || data.status === "consumed") {
        throw new Error("이미 인증된 세션입니다.");
      }
      
      // 만료 체크
      if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
        throw new Error("세션이 만료되었습니다.");
      }
      
      // 원자적 업데이트
      transaction.update(sessionRef, {
        status: "verified",
        userId,
        verifiedAt: serverTimestamp(),
      });
    });
    
    console.log("🔐 [qrPhoneLogin] 사용자 바인딩 완료:", { sessionId, userId });
    // 🔥 Cloud Function trigger가 자동으로 customToken 발급 및 token_ready로 변경
  } catch (error: any) {
    console.error("❌ [qrPhoneLogin] 사용자 바인딩 실패:", error);
    throw error;
  }
}

/**
 * QR 세션 소비 처리 (PC에서 로그인 성공 후 호출)
 * @param sessionId QR 세션 ID
 */
export async function consumeQRSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "qrSessions", sessionId);
  
  await setDoc(
    sessionRef,
    {
      status: "consumed",
      consumedAt: serverTimestamp(),
      customToken: null, // 토큰 노출 최소화
    },
    { merge: true }
  );

  console.log("🔐 [qrPhoneLogin] 세션 소비 완료:", sessionId);
}

/**
 * QR 세션 만료 처리
 * @param sessionId QR 세션 ID
 */
export async function expireQRSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "qrSessions", sessionId);
  
  await setDoc(
    sessionRef,
    {
      status: "expired",
      expiredAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.log("🔐 [qrPhoneLogin] 세션 만료 처리:", sessionId);
}

/**
 * QR 세션 실시간 구독 (PC에서 호출)
 * @param sessionId QR 세션 ID
 * @param onVerified Custom Token 준비 완료 시 콜백 (userId, customToken 전달)
 * @param onExpired 만료 시 콜백
 * @returns 구독 해제 함수
 */
export function subscribeToQRSession(
  sessionId: string,
  onVerified: (userId: string, customToken: string) => void,
  onExpired?: () => void
): () => void {
  const sessionRef = doc(db, "qrSessions", sessionId);

  const unsubscribe = onSnapshot(
    sessionRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        console.warn("🔐 [qrPhoneLogin] 세션 문서가 존재하지 않음:", sessionId);
        return;
      }

      const data = snapshot.data() as QRLoginSession;
      const now = Timestamp.now();

      // 만료 체크
      if (data.expiresAt && data.expiresAt < now) {
        console.log("🔐 [qrPhoneLogin] 세션 만료됨:", sessionId);
        expireQRSession(sessionId);
        onExpired?.();
        return;
      }

      // ✅ token_ready 체크 (Custom Token 준비됨)
      if (data.status === "token_ready" && data.customToken && data.userId) {
        console.log("🔐 [qrPhoneLogin] Custom Token 준비 완료:", data.userId);
        onVerified(data.userId, data.customToken);
        unsubscribe(); // 한 번만 실행되도록 구독 해제
        return;
      }

      // 레거시: verified 상태도 처리 (하위 호환)
      if (data.status === "verified" && data.userId && !data.customToken) {
        console.log("🔐 [qrPhoneLogin] 인증 완료 감지 (토큰 대기 중):", data.userId);
        // token_ready를 기다리므로 여기서는 아무것도 하지 않음
      }
    },
    (error) => {
      console.error("🔐 [qrPhoneLogin] 세션 구독 오류:", error);
    }
  );

  return unsubscribe;
}

/**
 * QR URL 생성
 * @param sessionId QR 세션 ID
 * @returns QR에 담을 URL
 * 
 * 🔥 실서비스 기준: 반드시 대표 도메인(yagovibe.com) 사용
 * - PWA/앱 열기 판단 로직 안정성
 * - 사용자 신뢰 & UX
 * - 결제/인증/딥링크 등 향후 확장성
 * 
 * ⚠️ 중요: window.location.origin / localhost / env 사용 금지
 * - 개발 환경에서도 프로덕션 URL 사용
 * - 모바일에서 localhost 접근 불가 방지
 */
export function generateQRLoginURL(sessionId: string): string {
  // 🔥 전자 QR 단일 진입점: www.yagovibe.com으로 통일
  // PC에서 세션 생성 후 sessionId를 포함한 QR URL 생성
  // 모바일에서 스캔 시 바로 /qr-login?sessionId=xxx로 이동
  // 
  // 이렇게 하면:
  // - QR 하나로 모든 UX 통일
  // - "전자 QR" 브랜드 유지
  // - 로그인/지도/이벤트 확장 쉬움
  // - CS 문의 0에 가까워짐
  const QR_BASE_URL = "https://www.yagovibe.com";
  
  return `${QR_BASE_URL}/qr-login?sessionId=${sessionId}`;
}
