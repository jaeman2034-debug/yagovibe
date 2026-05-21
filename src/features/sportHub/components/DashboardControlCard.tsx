/**
 * 🔥 Dashboard Control Card - 관제 카드 컴포넌트
 * 
 * [서울 허브]
 * 시즌: ON
 * 스토리: 5/5
 * CTR: 4.2%
 * 예약: 12건
 * 위험: 1
 */

import type { DashboardSummary } from "../domain/dashboard.types";
import { REGION_LABELS } from "../domain/region.types";

interface DashboardControlCardProps {
  summary: DashboardSummary;
  onClick?: () => void;
}

export function DashboardControlCard({
  summary,
  onClick,
}: DashboardControlCardProps) {
  const healthScore = summary.health.storyFillRate;
  const riskCount =
    summary.risk.lowCTRStories.length +
    summary.risk.expiringSoon.length +
    (summary.risk.paymentFail > 0 ? 1 : 0) +
    (summary.risk.apiErrors > 0 ? 1 : 0) +
    (summary.risk.emptySlots > 0 ? 1 : 0);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">{REGION_LABELS[summary.region]}</h3>
        <div
          className={`w-3 h-3 rounded-full ${
            healthScore >= 80
              ? "bg-green-500"
              : healthScore >= 60
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">시즌:</span>
          <span className={summary.health.seasonMode ? "text-green-600" : "text-gray-400"}>
            {summary.health.seasonMode ? "ON" : "OFF"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">스토리:</span>
          <span>
            {Math.round(summary.health.storyFillRate / 20)}/5
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">CTR:</span>
          <span className="font-medium">{summary.kpi.storyCTR.toFixed(1)}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">예약:</span>
          <span className="font-medium">{summary.kpi.revenueToday > 0 ? "있음" : "없음"}</span>
        </div>

        {riskCount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>위험:</span>
            <span className="font-bold">{riskCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
