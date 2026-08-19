import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { MetricTrendClient, PlayerTrendsClient } from "@/lib/telemetry/playerTrendTypes";
import { formatNumber } from "@/lib/telemetry/matchIntelligenceFormat";

type Props = {
  trends: PlayerTrendsClient | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
};

function DirectionIcon({ direction }: { direction: MetricTrendClient["direction"] }) {
  if (direction === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" aria-hidden />;
  if (direction === "down") return <TrendingDown className="h-3.5 w-3.5 text-rose-400" aria-hidden />;
  return <Minus className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <div className="h-8 flex items-center text-[10px] text-slate-500">데이터 수집 중</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-cyan-400/90"
        points={pts}
      />
    </svg>
  );
}

function TrendRow({
  label,
  trend,
  format,
}: {
  label: string;
  trend: MetricTrendClient;
  format: (n: number) => string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <DirectionIcon direction={trend.direction} />
          {trend.delta >= 0 ? "+" : ""}
          {format(trend.delta)}
        </span>
      </div>
      <Sparkline values={trend.values} />
      <p className="mt-1 font-mono text-xs tabular-nums text-slate-300">평균 {format(trend.avg)}</p>
    </div>
  );
}

function momentumLabelKo(label: string): string {
  if (label === "Improving") return "상승 중";
  if (label === "Declining") return "하락 중";
  return "유지";
}

export function PlayerTrendCard({ trends, loading, error, className = "" }: Props) {
  if (loading) {
    return (
      <div className={`rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-5 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-sm text-cyan-100/90">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          최근 경기 트렌드 분석 중…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 ${className}`}>
        <p className="text-xs text-amber-100/90">{error}</p>
      </div>
    );
  }

  if (!trends || trends.snapshotCount === 0) {
    return (
      <div className={`rounded-xl border border-white/10 bg-black/20 px-4 py-3 ${className}`}>
        <p className="text-xs text-slate-500">경기 기록이 쌓이면 최근 {trends?.window ?? 3}경기 트렌드가 표시됩니다.</p>
      </div>
    );
  }

  const ovrDelta = trends.overall.delta;
  const mom = trends.momentum;

  return (
    <div className={`rounded-xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/35 to-[#070b14]/80 px-3.5 py-3 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-400/90">
            최근 {trends.window}경기 트렌드
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {momentumLabelKo(mom.label)}
            {mom.direction === "up" ? " ↑" : mom.direction === "down" ? " ↓" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">모멘텀</p>
          <p className="font-mono text-lg font-bold tabular-nums text-cyan-200">{mom.score}</p>
        </div>
      </div>

      {ovrDelta !== 0 ? (
        <p className="mt-2 text-xs text-slate-300">
          OVR{" "}
          <span className={ovrDelta > 0 ? "text-emerald-300" : "text-rose-300"}>
            {ovrDelta > 0 ? "+" : ""}
            {Math.round(ovrDelta)}
          </span>{" "}
          (첫 경기 → 최근 경기)
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TrendRow label="OVR" trend={trends.overall} format={(n) => String(Math.round(n))} />
        <TrendRow label="xThreat" trend={trends.xThreat} format={(n) => formatNumber(n, 2)} />
      </div>
    </div>
  );
}
