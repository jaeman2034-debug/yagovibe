/**
 * 🔥 CoachActionCard - 코치 액션 카드 컴포넌트
 * 
 * 역할:
 * - 리듬 상태 + 훈련 부하 기반 행동 제안
 * - 선수 행동 유도 UX
 * 
 * UX 목적:
 * - 상태 설명 → 행동 제안
 * - 코칭 시스템 완성
 */

import { useMemo } from "react";
import type { RhythmScore } from "@/utils/rhythmCalculator";
import type { TrainingLoad } from "@/hooks/useTrainingLoad";
import { getCoachAction } from "@/utils/coachActions";
import { CheckCircle2 } from "lucide-react";

type Props = {
  rhythmScore: RhythmScore | null;
  trainingLoad: TrainingLoad | null;
};

/**
 * 🔥 CoachActionCard 컴포넌트
 */
export function CoachActionCard({ rhythmScore, trainingLoad }: Props) {
  const action = useMemo(() => {
    return getCoachAction(rhythmScore, trainingLoad);
  }, [rhythmScore, trainingLoad]);

  if (!action) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${action.bgColor} ${action.color}`}
    >
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl">{action.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-base mb-1">{action.title}</h3>
          <p className="text-sm opacity-90">{action.message}</p>
        </div>
      </div>

      {/* 행동 목록 */}
      <div className="mt-4 pt-3 border-t border-current/20">
        <div className="text-xs font-semibold mb-2 opacity-80">
          추천 행동
        </div>
        <div className="space-y-2">
          {action.actions.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm opacity-90"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
