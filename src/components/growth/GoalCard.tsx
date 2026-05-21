/**
 * 🔥 GoalCard - 목표 진행률 카드 컴포넌트
 * 
 * 역할:
 * - 목표 진행률 표시
 * - 활동 기록 기반 자동 집계
 * 
 * UX 목적:
 * - 성장 탭에서 목표 진행률 시각화
 * - 활동 기록 → 목표 자동 반영
 */

import { useMemo } from "react";
import type { Goal } from "@/services/growthService";

type Props = {
  goal: Goal;
};

/**
 * 🔥 목표 타입별 라벨
 */
function getGoalLabel(type: Goal["type"]): string {
  switch (type) {
    case "monthlyTraining":
      return "이번 달 훈련";
    case "weeklyTraining":
      return "이번 주 훈련";
    case "totalMinutes":
      return "총 운동 시간";
    case "totalSessions":
      return "총 세션 수";
    default:
      return "목표";
  }
}

/**
 * 🔥 목표 타입별 단위
 */
function getGoalUnit(type: Goal["type"]): string {
  switch (type) {
    case "monthlyTraining":
    case "weeklyTraining":
    case "totalSessions":
      return "회";
    case "totalMinutes":
      return "분";
    default:
      return "";
  }
}

/**
 * 🔥 GoalCard 컴포넌트
 */
export function GoalCard({ goal }: Props) {
  const progress = useMemo(() => {
    if (goal.target === 0) return 0;
    return Math.min((goal.current / goal.target) * 100, 100);
  }, [goal.current, goal.target]);

  const isCompleted = goal.current >= goal.target;
  const deadline = new Date(goal.deadline);
  const now = new Date();
  const isExpired = now > deadline;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm text-neutral-700">
            {getGoalLabel(goal.type)}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            목표: {goal.target}
            {getGoalUnit(goal.type)} · 마감: {deadline.toLocaleDateString()}
          </p>
        </div>
        {isCompleted && (
          <div className="text-2xl">🎉</div>
        )}
      </div>

      {/* 진행률 바 */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-neutral-600">
            {goal.current} / {goal.target} {getGoalUnit(goal.type)}
          </span>
          <span
            className={`font-semibold ${
              isCompleted
                ? "text-green-600"
                : isExpired
                ? "text-red-600"
                : "text-blue-600"
            }`}
          >
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              isCompleted
                ? "bg-green-500"
                : isExpired
                ? "bg-red-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 상태 메시지 */}
      {isCompleted && (
        <div className="text-xs text-green-600 font-medium mt-2">
          🎉 목표 달성!
        </div>
      )}
      {isExpired && !isCompleted && (
        <div className="text-xs text-red-600 font-medium mt-2">
          ⏰ 마감일이 지났습니다
        </div>
      )}
      {!isExpired && !isCompleted && progress < 50 && (
        <div className="text-xs text-orange-600 font-medium mt-2">
          💪 조금만 더 힘내세요!
        </div>
      )}
    </div>
  );
}
