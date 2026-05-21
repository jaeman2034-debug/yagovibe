/**
 * 🔥 useOnboarding - 프로필 온보딩 상태 관리 훅
 * 
 * 역할:
 * - 온보딩 단계 분리 (Step 기반)
 * - 각 단계 즉시 Firestore 저장
 * - 새로고침 / 앱 종료 / 재접속 → 이어서 진행
 * - 완료 시 onboardingCompleted = true
 * 
 * UX 목적:
 * - 첫 사용자 경험 최적화
 */

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

/**
 * 🔥 온보딩 데이터 타입
 */
export interface OnboardingData {
  displayName?: string;
  ageRange?: string;
  purpose?: string;
  sport?: string;
  region?: string;
  bio?: string;
}

/**
 * 🔥 프로필 온보딩 훅
 * 
 * @returns 온보딩 상태 및 제어 함수
 */
export function useOnboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const loadOnboarding = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const userData = snap.data();
          const onboardingStep = userData.onboardingStep ?? 0;
          const onboardingData = userData.onboarding ?? {};

          setStep(onboardingStep);
          setData(onboardingData);
        }
      } catch (error) {
        console.error("❌ [useOnboarding] 온보딩 상태 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOnboarding();
  }, [user?.uid]);

  const saveStep = async (nextStep: number, payload: Partial<OnboardingData>) => {
    if (!user?.uid) return;

    const updatedData = { ...data, ...payload };
    // 저장 실패 시에도 온보딩 진행이 막히지 않도록 UI는 먼저 전진시킵니다.
    setStep(nextStep);
    setData(updatedData);

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          onboardingStep: nextStep,
          onboarding: updatedData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("❌ [useOnboarding] 단계 저장 실패:", error);
      console.warn("⚠️ [useOnboarding] 로컬 상태로 온보딩을 계속 진행합니다. 네트워크/권한 상태를 확인하세요.");
    }
  };

  const complete = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          onboardingCompleted: true,
          onboardingStep: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("❌ [useOnboarding] 온보딩 완료 처리 실패:", error);
    }
  };

  const goBack = (prevStep: number) => {
    setStep(prevStep);
  };

  return {
    step,
    data,
    loading,
    saveStep,
    complete,
    goBack,
  };
}

/**
 * 🔥 온보딩 타입
 */
export type OnboardingType = "growth" | "coach" | "complete";

/**
 * 🔥 기능별 온보딩 상태 조회 훅
 * 
 * @param type 온보딩 타입
 * @returns 온보딩 완료 여부, 완료 처리 함수
 */
export function useFeatureOnboarding(type: OnboardingType) {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setCompleted(null);
      setLoading(false);
      return;
    }

    const checkOnboarding = async () => {
      try {
        const onboardingRef = doc(db, "onboarding", user.uid);
        const snap = await getDoc(onboardingRef);

        if (snap.exists()) {
          const data = snap.data();
          setCompleted(data[type] === true);
        } else {
          setCompleted(false);
        }
      } catch (error) {
        console.error("❌ [useFeatureOnboarding] 온보딩 상태 조회 실패:", error);
        setCompleted(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user?.uid, type]);

  const completeOnboarding = async () => {
    if (!user?.uid) return;

    try {
      const onboardingRef = doc(db, "onboarding", user.uid);
      await setDoc(
        onboardingRef,
        {
          [type]: true,
          completedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setCompleted(true);
    } catch (error) {
      console.error("❌ [useFeatureOnboarding] 온보딩 완료 처리 실패:", error);
    }
  };

  return {
    completed,
    loading,
    completeOnboarding,
  };
}
