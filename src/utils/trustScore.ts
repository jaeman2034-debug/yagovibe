/**
 * 🔥 전화번호 기반 신뢰도 스코어 v1
 * 
 * 역할:
 * - 전화번호 로그인 유저를 신뢰도 기반으로 분류
 * - 어뷰징/노쇼 리스크 줄이기
 * - 결제/예약 기능을 안전하게 오픈
 */

import { doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { logTrustScoreUpdate } from "./retentionEvents";

export type TrustTier = "guest" | "basic" | "verified" | "host";

export interface TrustScoreData {
  trustScore: number; // 0~100
  trustTier: TrustTier;
  penalties: number; // 노쇼/어뷰징 횟수
  lastScoreUpdate: any; // serverTimestamp
}

/**
 * 신뢰도 스코어 계산 (초기 가볍게)
 * 
 * 기준:
 * - 전화번호 인증: +20
 * - 프로필 완성: +30
 * - 첫 행동 완료: +20
 * - 재방문 (24h 내): +30
 * 
 * @param userData - Firestore user 데이터
 * @returns 신뢰도 스코어 (0~100)
 */
export function calcTrustScore(userData: any): number {
  // 🔥 배포 안정화: userData가 null/undefined인 경우 기본값 0 반환
  if (!userData) {
    return 0;
  }

  let score = 0;

  // 🔥 전화번호 인증 (+20)
  if (userData.phone || userData.phoneNumber) {
    score += 20;
  }

  // 🔥 프로필 완성 (+30)
  if (userData.isProfileComplete) {
    score += 30;
  }

  // 🔥 첫 행동 완료 (+20)
  if (userData.firstAction && userData.firstActionAt) {
    score += 20;
  }

  // 🔥 재방문 (24h 내) (+30)
  if (userData.lastLoginAt) {
    try {
      const lastLogin = userData.lastLoginAt.toMillis?.() || userData.lastLoginAt._seconds * 1000;
      const now = Date.now();
      const hoursSinceLogin = (now - lastLogin) / (1000 * 60 * 60);
      
      if (hoursSinceLogin < 24) {
        score += 30;
      }
    } catch (error) {
      // 🔥 배포 안정화: 날짜 파싱 실패 시 무시
      console.warn("⚠️ [trustScore] lastLoginAt 파싱 실패 (무시):", error);
    }
  }

  // 🔥 패널티 적용 (노쇼/어뷰징)
  const penalties = userData.penalties || 0;
  score -= penalties * 20; // 패널티당 -20점

  // 🔥 최소 0, 최대 100
  return Math.max(0, Math.min(100, score));
}

/**
 * 신뢰도 티어 결정
 * 
 * @param score - 신뢰도 스코어 (0~100)
 * @returns TrustTier
 */
export function getTrustTier(score: number): TrustTier {
  if (score >= 70) {
    return "verified";
  } else if (score >= 20) {
    return "basic";
  } else {
    return "guest";
  }
}

/**
 * 신뢰도 스코어 업데이트 (Firestore)
 * 
 * @param uid - 사용자 UID
 * @param userData - 현재 사용자 데이터 (선택, 없으면 Firestore에서 조회)
 * @returns 업데이트된 신뢰도 정보
 */
export async function updateTrustScore(
  uid: string,
  userData?: any
): Promise<TrustScoreData> {
  try {
    // 🔥 userData가 없으면 Firestore에서 조회
    if (!userData) {
      const { doc: getDoc } = await import("firebase/firestore");
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      
      // 🔥 배포 안정화: 문서가 없거나 권한 오류 시 기본값 반환
      if (!userSnap.exists()) {
        console.warn("⚠️ [trustScore] 사용자 문서 없음, 기본값 반환:", uid);
        return {
          trustScore: 0,
          trustTier: "guest",
          penalties: 0,
          lastScoreUpdate: serverTimestamp(),
        };
      }
      
      userData = userSnap.data();
    }

    // 🔥 배포 안정화: userData가 null/undefined인 경우 기본값 반환
    if (!userData) {
      console.warn("⚠️ [trustScore] userData 없음, 기본값 반환:", uid);
      return {
        trustScore: 0,
        trustTier: "guest",
        penalties: 0,
        lastScoreUpdate: serverTimestamp(),
      };
    }

    // 🔥 신뢰도 스코어 계산
    const trustScore = calcTrustScore(userData);
    const trustTier = getTrustTier(trustScore);

    // 🔥 Firestore 업데이트 (권한 오류 시 graceful 처리)
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        trustScore,
        trustTier,
        lastScoreUpdate: serverTimestamp(),
      });

      console.log("✅ [trustScore] 신뢰도 스코어 업데이트:", {
        uid,
        trustScore,
        trustTier,
      });
    } catch (error: any) {
      // 🔥 배포 안정화: 권한 오류 시 조용히 처리 (계산된 값은 반환)
      if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
        console.warn("⚠️ [trustScore] 권한 오류 (계산된 값 반환):", uid, error?.message);
      } else {
        throw error; // 다른 오류는 재발생
      }
    }

    // 🔥 이벤트 로깅
    try {
      const { getAuth } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === uid) {
        await logTrustScoreUpdate(currentUser, trustScore, trustTier);
      }
    } catch (error) {
      console.warn("⚠️ [trustScore] 이벤트 로깅 실패 (무시):", error);
    }

    return {
      trustScore,
      trustTier,
      penalties: userData.penalties || 0,
      lastScoreUpdate: serverTimestamp(),
    };
  } catch (error: any) {
    // 🔥 배포 안정화: 모든 오류 시 기본값 반환 (앱 크래시 방지)
    console.error("❌ [trustScore] 신뢰도 스코어 업데이트 실패 (기본값 반환):", error);
    return {
      trustScore: 0,
      trustTier: "guest",
      penalties: 0,
      lastScoreUpdate: serverTimestamp(),
    };
  }
}

/**
 * 패널티 적용 (노쇼/어뷰징)
 * 
 * @param uid - 사용자 UID
 * @param reason - 패널티 사유
 */
export async function applyPenalty(uid: string, reason: string): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      penalties: increment(1),
      lastPenaltyAt: serverTimestamp(),
      lastPenaltyReason: reason,
    });

    // 🔥 신뢰도 스코어 재계산
    await updateTrustScore(uid);

    console.log("⚠️ [trustScore] 패널티 적용:", { uid, reason });
  } catch (error) {
    console.error("❌ [trustScore] 패널티 적용 실패:", error);
    throw error;
  }
}
