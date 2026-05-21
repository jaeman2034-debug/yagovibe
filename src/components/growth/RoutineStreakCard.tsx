/**
 * 🔥 RoutineStreakCard - 루틴 Streak 카드 컴포넌트
 * 
 * 역할:
 * - 연속 체크 일수 표시
 * - 배지 및 메시지 표시
 * 
 * UX 목적:
 * - 재방문율 상승
 * - 사용자 습관 형성
 */

import { useMemo } from "react";
import type { RoutineStreak } from "@/services/growthService";
import { Flame, Trophy, Target } from "lucide-react";

type Props = {
  streak: RoutineStreak | null;
  loading?: boolean;
};

/**
 * 🔥 Streak 타입별 라벨
 */
function getStreakLabel(streakType: RoutineStreak["streakType"]): string {
  switch (streakType) {
    case "all":
      return "루틴 연속";
    case "stretch":
      return "스트레칭 연속";
    case "strength":
      return "보강운동 연속";
    case "analysis":
      return "영상 분석 연속";
    case "mental":
      return "멘탈 트레이닝 연속";
    default:
      return "연속";
  }
}

/**
 * 🔥 Streak 배지 정보
 */
function getStreakBadge(currentStreak: number): {
  icon: React.ReactNode;
  text: string;
  color: string;
  bgColor: string;
} {
  if (currentStreak >= 30) {
    return {
      icon: <Trophy className="w-5 h-5" />,
      text: "마스터",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100 border-yellow-300",
    };
  } else if (currentStreak >= 14) {
    return {
      icon: <Flame className="w-5 h-5" />,
      text: "불타오르는",
      color: "text-orange-700",
      bgColor: "bg-orange-100 border-orange-300",
    };
  } else if (currentStreak >= 7) {
    return {
      icon: <Target className="w-5 h-5" />,
      text: "열정적인",
      color: "text-blue-700",
      bgColor: "bg-blue-100 border-blue-300",
    };
  } else if (currentStreak >= 3) {
    return {
      icon: <Flame className="w-4 h-4" />,
      text: "시작한",
      color: "text-green-700",
      bgColor: "bg-green-100 border-green-300",
    };
  } else {
    return {
      icon: null,
      text: "",
      color: "text-neutral-700",
      bgColor: "bg-neutral-50 border-neutral-200",
    };
  }
}

/**
 * 🔥 RoutineStreakCard 컴포넌트
 */
export function RoutineStreakCard({ streak, loading = false }: Props) {
  const badge = useMemo(() => {
    if (!streak || streak.currentStreak === 0) return null;
    return getStreakBadge(streak.currentStreak);
  }, [streak]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <div className="text-sm text-neutral-500">Streak 불러오는 중...</div>
      </div>
    );
  }

  if (!streak || streak.currentStreak === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm text-neutral-700">
            {getStreakLabel(streak?.streakType || "all")}
          </h3>
        </div>
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-sm text-neutral-600 mb-1">
            아직 연속 기록이 없습니다
          </div>
          <div className="text-xs text-neutral-500">
            루틴을 체크하면 연속 기록이 시작됩니다!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-neutral-700">
          {getStreakLabel(streak.streakType)}
        </h3>
        {badge && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${badge.bgColor} ${badge.color}`}
          >
            {badge.icon}
            <span>{badge.text}</span>
          </div>
        )}
      </div>

      {/* 현재 Streak */}
      <div className="text-center py-4">
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {streak.currentStreak}
        </div>
        <div className="text-sm text-neutral-600 mb-1">일 연속</div>
        {streak.longestStreak > streak.currentStreak && (
          <div className="text-xs text-neutral-500">
            최장 기록: {streak.longestStreak}일
          </div>
        )}
      </div>

      {/* 메시지 */}
      {badge && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <div className="text-xs text-neutral-600 text-center">
            {streak.currentStreak >= 30
              ? "🎉 30일 연속! 당신은 진정한 마스터입니다!"
              : streak.currentStreak >= 14
              ? "🔥 2주 연속! 정말 대단합니다!"
              : streak.currentStreak >= 7
              ? "💪 1주 연속! 계속 화이팅!"
              : streak.currentStreak >= 3
              ? "✨ 좋은 시작입니다! 계속 이어가세요!"
              : "👍 연속 기록을 이어가세요!"}
          </div>
        </div>
      )}
    </div>
  );
}
