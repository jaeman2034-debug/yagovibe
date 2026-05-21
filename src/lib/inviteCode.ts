/**
 * 🔥 초대 코드 생성 및 관리
 * 
 * 역할:
 * - 유저마다 고유 초대 코드 생성
 * - 최초 로그인 시 1회만 생성
 * - 6자리 대문자 영숫자 (예: A9F3K2)
 */

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";

const auth = getAuth();

/**
 * 초대 코드 생성 (6자리 대문자 영숫자)
 */
function generateInviteCode(): string {
  // 36진수 (0-9, a-z)를 사용하여 랜덤 코드 생성
  // substring(2, 8)으로 6자리 추출 후 대문자 변환
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * 초대 코드 중복 체크 및 재생성
 */
async function generateUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Firestore에서 중복 체크
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const q = query(collection(db, "users"), where("inviteCode", "==", code));
    const snap = await getDocs(q);

    if (snap.empty) {
      // 중복 없음 → 사용 가능
      return code;
    }

    // 중복 발견 → 재생성
    code = generateInviteCode();
    attempts++;
  }

  // 최대 시도 횟수 초과 시 타임스탬프 기반 코드 생성
  console.warn("⚠️ [inviteCode] 최대 시도 횟수 초과, 타임스탬프 기반 코드 생성");
  return `REF${Date.now().toString(36).substring(7).toUpperCase()}`;
}

/**
 * 최초 로그인 시 초대 코드 생성
 * 
 * @param userUid - 사용자 UID
 * @returns 생성된 초대 코드
 */
export async function ensureInviteCode(userUid: string): Promise<string | null> {
  try {
    const userRef = doc(db, "users", userUid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn("⚠️ [inviteCode] 유저 문서가 존재하지 않습니다:", userUid);
      return null;
    }

    const userData = userSnap.data();

    // 이미 초대 코드가 있으면 반환
    if (userData.inviteCode) {
      return userData.inviteCode;
    }

    // 초대 코드 생성
    const code = await generateUniqueInviteCode();

    // Firestore에 저장
    await updateDoc(userRef, {
      inviteCode: code,
      referralCount: 0, // 초기값
      updatedAt: serverTimestamp(),
    });

    console.log("✅ [inviteCode] 초대 코드 생성 완료:", {
      uid: userUid,
      code,
    });

    return code;
  } catch (error) {
    console.error("❌ [inviteCode] 초대 코드 생성 실패:", error);
    return null;
  }
}

/**
 * 현재 유저의 초대 코드 가져오기
 */
export async function getMyInviteCode(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const userData = userSnap.data();
  return userData.inviteCode || null;
}

/**
 * 초대 링크 생성
 */
export function generateInviteLink(code: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/login/phone?ref=${code}`;
}
