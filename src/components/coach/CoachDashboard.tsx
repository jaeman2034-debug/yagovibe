/**
 * 🔥 CoachDashboard - 코치 대시보드 컴포넌트
 * 
 * 역할:
 * - 선수 상태 집계 표시
 * - 위험 선수 자동 표시
 * - 팀 전체 컨디션 분석
 * 
 * UX 목적:
 * - 코치가 선수 상태를 한눈에 파악
 * - 부상 위험 선수 조기 발견
 */

import { useState } from "react";
import { useCoachDashboard, type RiskFilter } from "@/hooks/useCoachDashboard";
import { PlayerStatusCard } from "./PlayerStatusCard";
import { CoachReportButton } from "./CoachReportButton";
import { AlertTriangle, Users, TrendingUp, Activity } from "lucide-react";

type Props = {
  playerUids: string[];
  teamName?: string;
};

/**
 * 🔥 코치 대시보드 컴포넌트
 */
export function CoachDashboard({ playerUids, teamName = "팀" }: Props) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const { dashboard, loading } = useCoachDashboard(playerUids, riskFilter);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-neutral-500">로딩 중...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6">
        <div className="text-center text-neutral-500">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  const { players, totalPlayers, riskPlayers, teamAverage } = dashboard;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">코치 대시보드</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Users className="w-4 h-4" />
            <span>총 {totalPlayers}명</span>
          </div>
          <CoachReportButton playerUids={playerUids} teamName={teamName} />
        </div>
      </div>

      {/* 팀 평균 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-neutral-500 mb-1">팀 평균 리듬</div>
          <div className="text-2xl font-bold text-blue-600">
            {teamAverage.rhythmScore !== null
              ? Math.round(teamAverage.rhythmScore)
              : "-"}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-neutral-500 mb-1">팀 평균 부하</div>
          <div className="text-2xl font-bold text-orange-600">
            {teamAverage.trainingLoad.toFixed(1)}x
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-xs text-neutral-500 mb-1">팀 평균 통증</div>
          <div className="text-2xl font-bold text-red-600">
            {teamAverage.painLevel.toFixed(1)}
          </div>
        </div>
      </div>

      {/* 위험 선수 통계 */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">위험 선수</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setRiskFilter("all")}
              className={`px-3 py-1 rounded text-xs ${
                riskFilter === "all"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setRiskFilter("high")}
              className={`px-3 py-1 rounded text-xs ${
                riskFilter === "high"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              높음
            </button>
            <button
              onClick={() => setRiskFilter("critical")}
              className={`px-3 py-1 rounded text-xs ${
                riskFilter === "critical"
                  ? "bg-red-100 text-red-700"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              위험
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-xs text-red-600 mb-1">위험</div>
            <div className="text-xl font-bold text-red-700">
              {riskPlayers.critical}
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="text-xs text-orange-600 mb-1">높음</div>
            <div className="text-xl font-bold text-orange-700">
              {riskPlayers.high}
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-xs text-yellow-600 mb-1">중간</div>
            <div className="text-xl font-bold text-yellow-700">
              {riskPlayers.medium}
            </div>
          </div>
        </div>
      </div>

      {/* 선수 리스트 */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">선수 상태</h2>
        <div className="space-y-3">
          {players.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">
              {riskFilter === "all"
                ? "선수가 없습니다."
                : "해당 위험 수준의 선수가 없습니다."}
            </div>
          ) : (
            players.map((player) => (
              <PlayerStatusCard key={player.uid} player={player} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
