/**
 * 🔥 PlayerStatusCard - 선수 상태 카드
 * 
 * 역할:
 * - 선수 상태 표시
 * - 위험 수준 배지
 * - 코치 판단 정보 제공
 * 
 * UX 목적:
 * - 코치가 선수 상태를 한눈에 파악
 */

import type { PlayerStatus } from "@/services/coachDashboardService";
import { Flame, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

type Props = {
  player: PlayerStatus;
};

/**
 * 🔥 선수 상태 카드 컴포넌트
 */
export function PlayerStatusCard({ player }: Props) {
  const { name, avatar, rhythmScore, trainingLoad, condition, riskLevel, recommendations } = player;

  // 🔥 상태 배지 설정
  const getStatusBadge = () => {
    if (riskLevel === "critical") {
      return {
        text: "과부하 위험",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    } else if (riskLevel === "high") {
      return {
        text: "회복 필요",
        color: "bg-orange-100 text-orange-700 border-orange-200",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    } else if (riskLevel === "medium") {
      return {
        text: "관리 필요",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: <TrendingUp className="w-4 h-4" />,
      };
    } else if (rhythmScore !== null && rhythmScore >= 80) {
      return {
        text: "훈련 적기",
        color: "bg-green-100 text-green-700 border-green-200",
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    } else {
      return {
        text: "양호",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className={`p-4 rounded-xl border ${
        riskLevel === "critical"
          ? "bg-red-50 border-red-200"
          : riskLevel === "high"
          ? "bg-orange-50 border-orange-200"
          : riskLevel === "medium"
          ? "bg-yellow-50 border-yellow-200"
          : "bg-white border-neutral-200"
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-full border-2 border-neutral-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
              <span className="text-neutral-400 text-lg font-semibold">
                {name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="font-semibold text-base">{name}</div>
            <div className="text-xs text-neutral-500">
              {player.lastUpdate
                ? `최근 업데이트: ${player.lastUpdate.toLocaleDateString()}`
                : "데이터 없음"}
            </div>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${statusBadge.color}`}
        >
          {statusBadge.icon}
          <span>{statusBadge.text}</span>
        </div>
      </div>

      {/* 상태 지표 */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white/50 rounded-lg p-2">
          <div className="text-xs text-neutral-500 mb-1">리듬</div>
          <div className="text-lg font-bold text-blue-600">
            {rhythmScore !== null ? Math.round(rhythmScore) : "-"}
          </div>
        </div>
        <div className="bg-white/50 rounded-lg p-2">
          <div className="text-xs text-neutral-500 mb-1">부하</div>
          <div className="text-lg font-bold text-orange-600">
            {trainingLoad.loadRatio.toFixed(1)}x
          </div>
        </div>
        <div className="bg-white/50 rounded-lg p-2">
          <div className="text-xs text-neutral-500 mb-1">통증</div>
          <div className="text-lg font-bold text-red-600">
            {condition.pain}/10
          </div>
        </div>
      </div>

      {/* Streak (있는 경우) */}
      {condition.fatigue !== undefined && (
        <div className="mb-3 flex items-center gap-2 text-xs text-neutral-600">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>피로도: {condition.fatigue}/5</span>
          {condition.sleepHours && (
            <>
              <span className="text-neutral-300">•</span>
              <span>수면: {condition.sleepHours}시간</span>
            </>
          )}
        </div>
      )}

      {/* 권장사항 */}
      {recommendations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-orange-700 mb-1">
                코치 권장사항
              </div>
              <ul className="space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-neutral-700">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
