/**
 * 🔥 천재 프로필 Hook
 * 
 * 역할:
 * - 프로필 저장
 * - 추천 재계산 트리거
 */

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { updateTrustScore } from "@/utils/trustScore";
import { recalcPlacesWeight } from "@/utils/geniusRecommendation";
import { generateCompletionToast } from "@/utils/geniusMessageGenerator";
import { toast } from "sonner";

interface GeniusProfileData {
  intent: "watch" | "play" | "chill";
  company: "solo" | "friends" | "date" | "family";
  mood: "calm" | "excited" | "focus" | "light";
}

export function useGeniusProfile() {
  const { user } = useAuth();

  const saveProfile = async (data: GeniusProfileData) => {
    if (!user) {
      throw new Error("사용자가 로그인되지 않았습니다.");
    }

    // 🔥 intent → todayIntent 매핑
    const todayIntentMap: Record<"watch" | "play" | "chill", "watch" | "exercise" | "play" | "alone"> = {
      watch: "watch",
      play: "exercise",
      chill: "alone",
    };

    // 🔥 company → context 매핑
    const contextMap: Record<"solo" | "friends" | "date" | "family", "alone" | "friends" | "partner" | "family"> = {
      solo: "alone",
      friends: "friends",
      date: "partner",
      family: "family",
    };

    // 🔥 mood 매핑
    const moodMap: Record<"calm" | "excited" | "focus" | "light", "quiet" | "excited" | "focused" | "light"> = {
      calm: "quiet",
      excited: "excited",
      focus: "focused",
      light: "light",
    };

    const userRef = doc(db, "users", user.uid);

    await setDoc(
      userRef,
      {
        // 🔥 기존 필드 유지
        aiProfile: true,
        isProfileComplete: true,
        onboardingCompleted: true,

        // 🔥 명시 입력 (사용자가 직접 선택)
        intent: data.intent,
        company: data.company,
        mood: data.mood,

        // 🔥 스포츠 감각 프로필 (호환성 유지)
        sportsSense: {
          todayIntent: todayIntentMap[data.intent],
          context: contextMap[data.company],
          mood: moodMap[data.mood],
          activatedAt: serverTimestamp(),
          behaviorScore: {},
        },

        // 🔥 자동 학습 데이터 구조
        behaviorScore: {
          cafe: 0,
          pub: 0,
          stadium: 0,
          gym: 0,
          park: 0,
          restaurant: 0,
        },

        // 🔥 마지막 컨텍스트
        lastContext: {
          time: serverTimestamp(),
          location: null,
          intent: data.intent,
          company: data.company,
          mood: data.mood,
        },

        // 🔥 추천 엔진 입력 데이터
        recommendationProfile: {
          preferredMood: moodMap[data.mood],
          preferredContext: contextMap[data.company],
          preferredIntent: todayIntentMap[data.intent],
          lastUpdated: serverTimestamp(),
        },

        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ [useGeniusProfile] 프로필 저장 완료:", data);

    // 🔥 신뢰도 스코어 업데이트
    await updateTrustScore(user.uid);

    // 🔥 입력 즉시 추천 재계산 및 이벤트 발송
    await recalcPlacesWeight(user.uid);

    // 🔥 완료 직후 토스트 연출
    const toastMessage = generateCompletionToast(data.intent, data.company, data.mood);
    toast.success(toastMessage, {
      duration: 4000,
      position: "top-center",
    });
  };

  return { saveProfile };
}
