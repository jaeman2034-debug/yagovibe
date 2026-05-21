/**
 * 🔥 GrowthOnboarding - 성장 탭 온보딩
 * 
 * 역할:
 * - 첫 사용자 가이드
 * - 컨디션 입력 유도
 * 
 * UX 목적:
 * - 사용자 첫 경험 최적화
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type Props = {
  onComplete: () => void;
};

/**
 * 🔥 성장 탭 온보딩 컴포넌트
 */
export function GrowthOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const steps = [
    {
      title: "컨디션 기록 시작하기",
      description: "매일 컨디션을 기록하면 AI가 맞춤 훈련을 추천해드립니다.",
      action: "컨디션 입력하기",
      onAction: () => {
        navigate("/growth");
        onComplete();
      },
    },
    {
      title: "루틴 체크하기",
      description: "스트레칭, 보강운동 등 루틴을 체크하면 연속 기록이 쌓입니다.",
      action: "루틴 체크하기",
      onAction: () => {
        navigate("/growth");
        onComplete();
      },
    },
    {
      title: "목표 설정하기",
      description: "이번 달 목표를 설정하면 자동으로 진행률을 추적합니다.",
      action: "목표 설정하기",
      onAction: () => {
        navigate("/growth");
        onComplete();
      },
    },
  ];

  if (step >= steps.length) {
    return null;
  }

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-none md:max-w-3xl p-6">
        <div className="mb-4">
          <div className="text-sm text-neutral-500 mb-2">
            {step + 1} / {steps.length}
          </div>
          <h2 className="text-xl font-bold mb-2">{currentStep.title}</h2>
          <p className="text-neutral-600">{currentStep.description}</p>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                onComplete();
              }
            }}
            className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            {step < steps.length - 1 ? "다음" : "건너뛰기"}
          </button>
          <button
            onClick={currentStep.onAction}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            {currentStep.action}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
