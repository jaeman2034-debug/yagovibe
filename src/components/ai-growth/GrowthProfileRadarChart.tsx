import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { GrowthProfileRadarResult } from "@/lib/ai-growth/growthProfileRadar";

type Props = {
  profile: GrowthProfileRadarResult;
  size?: "default" | "compact";
};

/** Sprint 8B-3 — Growth 리포트 5축 레이더 (검증 콘솔 Step5) */
export function GrowthProfileRadarChart({ profile, size = "default" }: Props) {
  const data = profile.axes.map((a) => ({
    axis: a.labelKo,
    score: typeof a.score === "number" ? a.score : 0,
  }));

  const heightClass =
    size === "compact" ? "h-48 w-full min-w-0" : "h-64 w-full min-w-0 sm:h-56 md:h-64";

  return (
    <div className="space-y-1" data-testid="growth-profile-radar">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
        5축 성장 프로파일
      </p>
      <div className={heightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="#e0e7ff" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#4338ca", fontSize: size === "compact" ? 10 : 11 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="프로파일"
              dataKey="score"
              stroke="#7c3aed"
              fill="#8b5cf6"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {!profile.hasObservedData ? (
        <p className="text-[10px] text-indigo-600">코치 검증 이벤트 승인 후 프로파일이 표시됩니다.</p>
      ) : null}
    </div>
  );
}
