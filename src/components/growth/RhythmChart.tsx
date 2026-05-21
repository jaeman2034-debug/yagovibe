/**
 * 🔥 RhythmChart - 리듬 그래프 컴포넌트
 * 
 * 역할:
 * - 최근 7일 리듬 점수 라인 그래프 표시
 * - 오늘 점 강조
 * - 리듬 상태 표시
 * 
 * UX 목적:
 * - 선수 상태 리듬 시각화
 * - 훈련 적기/회복기/과부하 위험 판단
 */

import { useMemo } from "react";
import type { RhythmScore } from "@/utils/rhythmCalculator";
import { getRhythmStatus, calculateRhythmTrend } from "@/utils/rhythmCalculator";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { useTrainingLoad } from "@/hooks/useTrainingLoad";
import { useAuth } from "@/context/AuthProvider";
import { CoachActionCard } from "./CoachActionCard";

type Props = {
  scores: RhythmScore[];
  loading?: boolean;
};

/**
 * 🔥 RhythmChart 컴포넌트 (Tailwind CSS 기반)
 * 
 * recharts 없이 순수 Tailwind로 구현
 */
export function RhythmChart({ scores, loading = false }: Props) {
  const { user } = useAuth();
  const { load: trainingLoad } = useTrainingLoad(user?.uid);

  const todayScore = useMemo(() => {
    if (!scores.length) return null;
    return scores[scores.length - 1];
  }, [scores]);

  const status = useMemo(() => {
    if (!todayScore || todayScore.score === null) return null;
    return getRhythmStatus(todayScore.score);
  }, [todayScore]);

  const trend = useMemo(() => {
    if (!scores.length) return null;
    // 🔥 null이 아닌 점수만 필터링
    const validScores = scores.filter((s) => s.score !== null);
    if (validScores.length < 6) return null;
    return calculateRhythmTrend(scores);
  }, [scores]);

  // 🔥 과부하 경고 메시지
  const overloadWarning = useMemo(() => {
    if (!trainingLoad) return null;
    
    if (trainingLoad.status === "danger") {
      return {
        text: "부상 위험",
        message: "최근 훈련량이 평균 대비 160% 이상입니다. 즉시 휴식이 필요합니다.",
        color: "bg-red-100 text-red-700 border-red-300",
      };
    } else if (trainingLoad.status === "high") {
      return {
        text: "과부하 위험",
        message: "최근 훈련량이 평균 대비 120% 이상입니다. 휴식을 권장합니다.",
        color: "bg-orange-100 text-orange-700 border-orange-300",
      };
    }
    return null;
  }, [trainingLoad]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <h3 className="font-semibold mb-4 text-sm text-neutral-700">상태 리듬</h3>
        <div className="h-48 flex items-center justify-center">
          <div className="text-sm text-neutral-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!scores.length || !todayScore) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <h3 className="font-semibold mb-4 text-sm text-neutral-700">상태 리듬</h3>
        <div className="h-48 flex items-center justify-center">
          <div className="text-sm text-neutral-500">데이터가 없습니다</div>
        </div>
      </div>
    );
  }

  // 🔥 그래프 높이 및 최대값
  const maxScore = 1.0;
  const graphHeight = 120;
  const graphWidth = scores.length * 40;

  // 🔥 요일 레이블
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-neutral-700">상태 리듬</h3>
        <div className="flex items-center gap-2">
          {status && (
            <div
              className={`px-2 py-1 rounded-md text-xs font-semibold border ${status.badgeColor}`}
            >
              {status.text}
            </div>
          )}
          {trend && trend.trend !== "stable" && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                trend.trend === "up"
                  ? "bg-green-50 text-green-700"
                  : "bg-orange-50 text-orange-700"
              }`}
            >
              {trend.trend === "up" ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 과부하 경고 */}
      {overloadWarning && (
        <div className={`mb-4 rounded-lg border p-3 ${overloadWarning.color}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">{overloadWarning.text}</div>
              <div className="text-xs">{overloadWarning.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* 상태 설명 */}
      {status && (
        <div className="mb-4 text-xs text-neutral-600 bg-neutral-50 rounded-lg p-2">
          {status.description}
        </div>
      )}

      {/* 그래프 영역 */}
      <div className="relative" style={{ height: `${graphHeight}px` }}>
        {/* Y축 레이블 */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-neutral-500 pr-2">
          <span>1.0</span>
          <span>0.5</span>
          <span>0</span>
        </div>

        {/* 그래프 영역 (오프셋) */}
        <div className="ml-8 h-full relative">
          {/* 그리드 라인 */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 0.5, 1.0].map((value) => (
              <div
                key={value}
                className="border-t border-neutral-100"
                style={{ marginTop: value === 1.0 ? "0" : "auto" }}
              />
            ))}
          </div>

          {/* 데이터 포인트 및 라인 */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            preserveAspectRatio="none"
          >
            {/* 라인 경로 (null 값 제외) */}
            <polyline
              points={scores
                .filter((score) => score.score !== null)
                .map((score, index, filtered) => {
                  const originalIndex = scores.indexOf(score);
                  const x = (originalIndex / (scores.length - 1)) * graphWidth;
                  const y =
                    graphHeight -
                    ((score.score as number) / maxScore) * graphHeight;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-500"
            />

            {/* 데이터 포인트 (null 값 제외) */}
            {scores
              .map((score, index) => {
                if (score.score === null) return null;
                const x = (index / (scores.length - 1)) * graphWidth;
                const y =
                  graphHeight -
                  ((score.score as number) / maxScore) * graphHeight;
                const isToday = index === scores.length - 1;

                return (
                  <g key={index}>
                    {/* 오늘 점 강조 */}
                    {isToday && (
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="currentColor"
                        className="text-blue-600 animate-pulse"
                      />
                    )}
                    {/* 일반 점 */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isToday ? "4" : "3"}
                      fill="currentColor"
                      className={isToday ? "text-blue-600" : "text-blue-500"}
                    />
                  </g>
                );
              })
              .filter(Boolean)}
          </svg>
        </div>
      </div>

      {/* X축 레이블 (요일) */}
      <div className="ml-8 mt-2 flex justify-between text-xs text-neutral-500">
        {scores.map((score, index) => {
          const date = new Date(score.date);
          const dayIndex = date.getDay();
          const dayLabel = dayLabels[dayIndex];
          const isToday = index === scores.length - 1;

          return (
            <div
              key={index}
              className={`text-center ${isToday ? "font-semibold text-blue-600" : ""}`}
            >
              {dayLabel}
            </div>
          );
        })}
      </div>

      {/* 오늘 점수 표시 */}
      {todayScore && todayScore.score !== null && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">오늘 리듬 점수</span>
            <span className="font-semibold text-blue-600">
              {(todayScore.score * 100).toFixed(0)}점
            </span>
          </div>
          {trend && (
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
              <span>최근 3일 평균: {(trend.recentAvg * 100).toFixed(0)}점</span>
              {trend.trend !== "stable" && (
                <span className={trend.trend === "up" ? "text-green-600" : "text-orange-600"}>
                  {trend.trend === "up" ? "↑" : "↓"} {trend.message}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 코치 액션 카드 */}
      <div className="mt-4">
        <CoachActionCard rhythmScore={todayScore} trainingLoad={trainingLoad} />
      </div>
    </div>
  );
}
