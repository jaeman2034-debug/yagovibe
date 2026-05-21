/**
 * 🔥 AITrainingRecommendationCard - AI 훈련 추천 카드
 * 
 * 역할:
 * - AI 추천 훈련 표시
 * - 행동 유도 메시지
 * 
 * UX 목적:
 * - 개인 맞춤 훈련 제안
 * - 사용자 몰입도 상승
 */

import { useAITrainingRecommendation } from "@/hooks/useAITrainingRecommendation";
import { CheckCircle2, Clock, Zap, Lightbulb } from "lucide-react";

/**
 * 🔥 AI 훈련 추천 카드 컴포넌트
 */
export function AITrainingRecommendationCard() {
  const { recommendation, loading } = useAITrainingRecommendation();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <h3 className="font-semibold mb-4 text-sm text-neutral-700">AI 훈련 추천</h3>
        <div className="h-32 flex items-center justify-center">
          <div className="text-sm text-neutral-500">추천 생성 중...</div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <h3 className="font-semibold mb-4 text-sm text-neutral-700">AI 훈련 추천</h3>
        <div className="h-32 flex items-center justify-center">
          <div className="text-sm text-neutral-500">
            컨디션 데이터를 입력하면 맞춤 추천을 받을 수 있습니다.
          </div>
        </div>
      </div>
    );
  }

  const {
    type,
    title,
    description,
    duration,
    intensity,
    reason,
    exercises,
    tips,
    icon,
    color,
    bgColor,
  } = recommendation;

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-semibold text-sm">AI 훈련 추천</h3>
        </div>
        <div className={`text-xs font-semibold px-2 py-1 rounded ${color} bg-opacity-20`}>
          {type === "high_intensity"
            ? "고강도"
            : type === "moderate_intensity"
            ? "중강도"
            : type === "low_intensity"
            ? "저강도"
            : type === "recovery"
            ? "회복"
            : "휴식"}
        </div>
      </div>

      <div className="mb-3">
        <h4 className={`font-bold text-base mb-1 ${color}`}>{title}</h4>
        <p className="text-sm text-neutral-600 mb-2">{description}</p>
        <div className="mt-2 p-2 bg-white/50 rounded-lg border border-neutral-200">
          <p className="text-xs text-neutral-700 font-medium">🤖 AI 추천</p>
          <p className="text-xs text-neutral-600 mt-1">{reason}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-neutral-600">
        {duration > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{duration}분</span>
          </div>
        )}
        {intensity > 0 && (
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4" />
            <span>강도 {intensity}/10</span>
          </div>
        )}
      </div>

      {exercises && exercises.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-neutral-700 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            추천 운동
          </div>
          <ul className="space-y-1">
            {exercises.map((exercise, index) => (
              <li key={index} className="text-xs text-neutral-600 pl-4">
                • {exercise}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tips && tips.length > 0 && (
        <div className="pt-3 border-t border-neutral-200">
          <div className="text-xs font-semibold text-neutral-700 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            팁
          </div>
          <ul className="space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="text-xs text-neutral-500 pl-4">
                💡 {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
