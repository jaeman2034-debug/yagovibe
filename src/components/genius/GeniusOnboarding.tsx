/**
 * 🔥 "나만의 스포츠 감각 켜기" - 천재 온보딩
 * 
 * 목표:
 * - 20초 안에 끝
 * - 입력은 최소
 * - 변화는 즉시 체감
 * - 이후는 자동 학습
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StepIntent } from "./StepIntent";
import { StepCompany } from "./StepCompany";
import { StepMood } from "./StepMood";
import { ResultPreview } from "./ResultPreview";
import { useGeniusProfile } from "./useGeniusProfile";

interface GeniusOnboardingProps {
  onClose: () => void;
  initialData?: {
    intent?: "watch" | "play" | "chill";
    company?: "solo" | "friends" | "date" | "family";
    mood?: "calm" | "excited" | "focus" | "light";
  };
}

export function GeniusOnboarding({ onClose, initialData }: GeniusOnboardingProps) {
  const navigate = useNavigate();
  const { saveProfile } = useGeniusProfile();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<{
    intent?: "watch" | "play" | "chill";
    company?: "solo" | "friends" | "date" | "family";
    mood?: "calm" | "excited" | "focus" | "light";
  }>(initialData || {});

  // 🔥 수정 모드: 초기값이 있으면 3단계로 이동
  useEffect(() => {
    if (initialData?.intent && initialData?.company && initialData?.mood) {
      setStep(3);
      setData(initialData);
    }
  }, [initialData]);

  const handleNext = (key: string, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    if (!data.intent || !data.company || !data.mood) return;

    try {
      await saveProfile({
        intent: data.intent,
        company: data.company,
        mood: data.mood,
      });

      // 🔥 천재 모드 활성화 이벤트 발송
      window.dispatchEvent(new CustomEvent("GENIUS_ON", {
        detail: {
          intent: data.intent,
          company: data.company,
          mood: data.mood,
        }
      }));

      // 🔥 즉시 변화 체감: 지도 페이지로 이동
      navigate("/map", { replace: true });
      onClose();
    } catch (error) {
      console.error("❌ [GeniusOnboarding] 저장 실패:", error);
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const steps = [
    <StepIntent key="intent" onSelect={(v) => handleNext("intent", v)} initialValue={data.intent} />,
    <StepCompany key="company" onSelect={(v) => handleNext("company", v)} initialValue={data.company} />,
    <StepMood key="mood" onSelect={(v) => handleNext("mood", v)} initialValue={data.mood} />,
    <ResultPreview key="preview" data={data} onComplete={handleComplete} />,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 transform transition-all">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            나만의 스포츠 감각 켜기
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {step + 1}/4 - 20초면 끝나요
          </p>
        </div>

        {/* 진행 바 */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* 단계별 컨텐츠 */}
        <div className="mb-8 min-h-[300px] relative">
          <div key={step} className="animate-stepTransition">
            {steps[step]}
          </div>
        </div>
        
        <style jsx>{`
          @keyframes stepTransition {
            from { 
              opacity: 0; 
              transform: translateX(20px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateX(0) scale(1); 
            }
          }
          .animate-stepTransition {
            animation: stepTransition 0.3s ease-out;
          }
        `}</style>

        {/* 건너뛰기 (1단계에서만) */}
        {step === 0 && (
          <button
            onClick={onClose}
            className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            나중에 하기
          </button>
        )}
      </div>
    </div>
  );
}
