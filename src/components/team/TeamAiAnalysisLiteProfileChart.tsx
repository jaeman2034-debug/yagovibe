import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  LITE_REPORT_DIMENSION_ROWS,
  LITE_REPORT_RADAR_AXIS_LABELS,
  liteReportGradeToChartScore,
  type LiteReportSnapshot,
} from "@/lib/team/teamAiAnalysisLite";

type Props = {
  snapshot: LiteReportSnapshot;
  /** 리포트 2컬럼 레이아웃용 — 데스크톱에서 차트 높이 확대 */
  size?: "default" | "large";
};

/** Sprint 8F — AI 선수 프로파일 레이더 (GPT 없이 Recharts) */
export function TeamAiAnalysisLiteProfileChart({ snapshot, size = "default" }: Props) {
  const data = LITE_REPORT_DIMENSION_ROWS.map((row) => ({
    axis: LITE_REPORT_RADAR_AXIS_LABELS[row.key],
    score: liteReportGradeToChartScore(snapshot[row.key]),
  }));

  const heightClass =
    size === "large" ? "h-80 w-full lg:h-[360px]" : "h-56 w-full lg:h-72";

  return (
    <div className="space-y-2" data-testid="team-ai-analysis-lite-radar">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-violet-800 lg:text-left">
        AI 선수 프로파일
      </p>
      <div className={heightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={size === "large" ? "78%" : "72%"}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#374151", fontSize: size === "large" ? 12 : 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
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
    </div>
  );
}
