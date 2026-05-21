import { useMemo } from "react";
import { buildTeamFeeKpiInsights } from "../utils/buildTeamFeeKpiInsights";
import type { TeamMonthlyChartPoint } from "../hooks/useTeamMonthlyStatsSeries";
import type { TeamMonthlyStatsDoc } from "../types/teamMonthlyStats";

type Props = {
  points: TeamMonthlyChartPoint[];
  currentDoc: TeamMonthlyStatsDoc | null;
};

const toneClass: Record<string, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  negative: "border-red-200 bg-red-50 text-red-900",
  neutral: "border-gray-200 bg-gray-50 text-gray-800",
};

export default function TeamMonthlyKpiInsights({ points, currentDoc }: Props) {
  const items = useMemo(() => buildTeamFeeKpiInsights(points, currentDoc), [points, currentDoc]);

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <h4 className="text-sm font-semibold text-indigo-950">자동 인사이트</h4>
      <p className="mt-0.5 text-xs text-indigo-800/80">최근 월별 스냅샷을 기준으로 생성됩니다.</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className={`rounded-lg border px-3 py-2 text-sm leading-snug ${toneClass[item.tone] ?? toneClass.neutral}`}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
