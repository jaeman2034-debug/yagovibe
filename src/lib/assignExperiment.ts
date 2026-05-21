/**
 * 🔥 A/B 실험군 할당 시스템
 * 
 * 역할:
 * - 가입 시 실험군 1회 할당 (고정)
 * - 새로고침/딥링크 안전 (서버 상태 기반)
 * - 실험 결과 추적용 데이터 저장
 * 
 * 원칙:
 * - 한 번에 하나만 바꾼다
 * - 실험군은 가입 시 고정
 * - 결과 판단 기준을 미리 정한다
 */

import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";

const auth = getAuth();

/**
 * A/B 선택 (50:50 랜덤)
 */
function pickAB(): "A" | "B" {
  return Math.random() < 0.5 ? "A" : "B";
}

/**
 * 온보딩 실험군 할당
 * 
 * @param userUid - 사용자 UID
 * @returns 할당된 실험군 ("A" | "B" | null)
 */
export async function assignOnboardingExperiment(userUid: string): Promise<"A" | "B" | null> {
  try {
    const userRef = doc(db, "users", userUid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn("⚠️ [assignExperiment] 유저 문서가 존재하지 않습니다:", userUid);
      return null;
    }

    const userData = userSnap.data();

    // 이미 실험군이 할당되어 있으면 반환
    if (userData.experiment?.onboarding_v1) {
      return userData.experiment.onboarding_v1 as "A" | "B";
    }

    // 실험군 할당 (50:50)
    const variant = pickAB();

    // Firestore에 저장
    await updateDoc(userRef, {
      experiment: {
        onboarding_v1: variant,
        assignedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    console.log("✅ [assignExperiment] 온보딩 실험군 할당:", {
      uid: userUid,
      variant,
    });

    return variant;
  } catch (error) {
    console.error("❌ [assignExperiment] 실험군 할당 실패:", error);
    return null;
  }
}

/**
 * 현재 유저의 실험군 가져오기
 */
export async function getMyExperimentVariant(experimentName: string = "onboarding_v1"): Promise<"A" | "B" | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const userData = userSnap.data();
  const experiment = userData.experiment?.[experimentName];
  
  return experiment || null;
}

/**
 * 실험군 할당 확인 및 필요 시 할당
 * 
 * @param userUid - 사용자 UID
 * @returns 할당된 실험군
 */
export async function ensureExperimentVariant(userUid: string): Promise<"A" | "B"> {
  const variant = await assignOnboardingExperiment(userUid);
  
  // 실험군이 없으면 기본값 "A" 반환 (안전장치)
  return variant || "A";
}
