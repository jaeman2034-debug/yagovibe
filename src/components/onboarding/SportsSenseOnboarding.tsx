/**
 * 🔥 "나만의 스포츠 감각 켜기" 온보딩 모달
 * 
 * 철학:
 * - 사용자는 최소 입력 (30초)
 * - 앱이 관찰하고 제안
 * - 즉시 변화 체감
 * 
 * 3단계 질문:
 * 1. 오늘 뭐 하러 왔어? (todayIntent)
 * 2. 누구랑? (context)
 * 3. 기분은? (mood)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { updateTrustScore } from "@/utils/trustScore";

export type TodayIntent = "watch" | "exercise" | "play" | "alone";
export type Context = "alone" | "friends" | "partner" | "family";
export type Mood = "quiet" | "excited" | "focused" | "light";

interface SportsSenseOnboardingProps {
  onComplete: () => void;
  initialData?: {
    todayIntent?: TodayIntent;
    context?: Context;
    mood?: Mood;
  }; // 🔥 천재 모드: 수정 모드용 초기값
}

const TODAY_INTENT_OPTIONS: { value: TodayIntent; label: string; emoji: string }[] = [
  { value: "watch", label: "경기 보기", emoji: "⚽" },
  { value: "exercise", label: "운동하기", emoji: "🏃" },
  { value: "play", label: "놀기", emoji: "🎉" },
  { value: "alone", label: "혼자 시간", emoji: "🧘" },
];

const CONTEXT_OPTIONS: { value: Context; label: string; emoji: string }[] = [
  { value: "alone", label: "혼자", emoji: "👤" },
  { value: "friends", label: "친구", emoji: "👥" },
  { value: "partner", label: "연인", emoji: "💑" },
  { value: "family", label: "가족", emoji: "👨‍👩‍👧‍👦" },
];

const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: "quiet", label: "조용", emoji: "🤫" },
  { value: "excited", label: "신남", emoji: "🔥" },
  { value: "focused", label: "집중", emoji: "🎯" },
  { value: "light", label: "가볍게", emoji: "✨" },
];

export function SportsSenseOnboarding({ onComplete, initialData }: SportsSenseOnboardingProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [todayIntent, setTodayIntent] = useState<TodayIntent | null>(initialData?.todayIntent || null);
  const [context, setContext] = useState<Context | null>(initialData?.context || null);
  const [mood, setMood] = useState<Mood | null>(initialData?.mood || null);
  const [saving, setSaving] = useState(false);
  
  // 🔥 천재 모드: 수정 모드인 경우 초기값이 있으면 해당 단계로 이동
  useEffect(() => {
    if (initialData?.todayIntent && initialData?.context && initialData?.mood) {
      // 모든 값이 있으면 3단계로 이동 (빠른 수정)
      setStep(3);
      setTodayIntent(initialData.todayIntent);
      setContext(initialData.context);
      setMood(initialData.mood);
    }
  }, [initialData]);

  const handleNext = () => {
    if (step === 1 && todayIntent) {
      setStep(2);
    } else if (step === 2 && context) {
      setStep(3);
    } else if (step === 3 && mood) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user || !todayIntent || !context || !mood) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      
      // 🔥 천재 모드: 스포츠 감각 프로필 저장 (완전한 구조)
      await setDoc(
        userRef,
        {
          // 🔥 기존 필드 유지
          aiProfile: true,
          isProfileComplete: true,
          onboardingCompleted: true,
          
          // 🔥 명시 입력 (사용자가 직접 선택)
          intent: todayIntent,      // "watch" | "play" | "chill" (exercise → play로 매핑)
          company: context,         // "solo" | "friends" | "date" | "family"
          mood: mood,              // "calm" | "excited" | "focus" | "light"
          
          // 🔥 새로운 스포츠 감각 필드 (호환성 유지)
          sportsSense: {
            todayIntent,      // 오늘 뭐 하러 왔어?
            context,          // 누구랑?
            mood,             // 기분은?
            activatedAt: serverTimestamp(),
            behaviorScore: {}, // 🔥 자동 학습: 카테고리별 점수 객체
          },
          
          // 🔥 자동 학습 데이터 구조
          behaviorScore: {
            cafe: 0,
            pub: 0,
            stadium: 0,
            gym: 0,
            park: 0,
            restaurant: 0,
            // 향후 클릭/체류 패턴으로 자동 증가
          },
          
          // 🔥 마지막 컨텍스트 (시간/위치 기반 학습용)
          lastContext: {
            time: new Date().toISOString(),
            location: null, // 향후 위치 정보 추가
            intent: todayIntent,
            company: context,
            mood: mood,
          },
          
          // 🔥 추천 엔진 입력 데이터
          recommendationProfile: {
            preferredMood: mood,
            preferredContext: context,
            preferredIntent: todayIntent,
            lastUpdated: serverTimestamp(),
          },
          
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ [SportsSenseOnboarding] 스포츠 감각 프로필 저장 완료:", {
        todayIntent,
        context,
        mood,
      });

      // 🔥 신뢰도 스코어 업데이트
      await updateTrustScore(user.uid);

      // 🔥 완료 후 콜백
      onComplete();

      // 🔥 지도 페이지로 이동 (즉시 변화 체감)
      navigate("/map", { replace: true });
    } catch (error) {
      console.error("❌ [SportsSenseOnboarding] 저장 실패:", error);
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const currentOptions = 
    step === 1 ? TODAY_INTENT_OPTIONS :
    step === 2 ? CONTEXT_OPTIONS :
    MOOD_OPTIONS;

  const currentValue = 
    step === 1 ? todayIntent :
    step === 2 ? context :
    mood;

  const currentQuestion = 
    step === 1 ? "오늘 뭐 하러 왔어?" :
    step === 2 ? "누구랑?" :
    "기분은?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 transform transition-all">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            나만의 스포츠 감각 켜기
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {step}/3 - 30초면 끝나요
          </p>
        </div>

        {/* 진행 바 */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* 질문 */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            {currentQuestion}
          </h3>

          {/* 옵션 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {currentOptions.map((option) => {
              const isSelected = currentValue === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (step === 1) setTodayIntent(option.value);
                    else if (step === 2) setContext(option.value);
                    else setMood(option.value);
                  }}
                  disabled={saving}
                  className={`
                    p-4 rounded-xl border-2 transition-all transform
                    ${isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-102"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="text-3xl mb-2">{option.emoji}</div>
                  <div className={`font-medium text-sm ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={handleNext}
          disabled={!currentValue || saving}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? "저장 중..." : step === 3 ? "감각 켜기 ✨" : "다음 →"}
        </button>

        {/* 건너뛰기 */}
        {step === 1 && (
          <button
            onClick={onComplete}
            className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            나중에 하기
          </button>
        )}
      </div>
    </div>
  );
}
