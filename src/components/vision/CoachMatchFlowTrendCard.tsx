/**
 * VOC-012 — Coach 「최근 경기 흐름 비교」 card
 */

import { TrendingUp } from "lucide-react";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";
import {
  formatMatchFlowDelta,
  formatMatchFlowDisplayLine,
  playerTrendKey,
  type MatchFlowPlayerTrend,
} from "@/lib/vision/matchFlowTrendFromPlayerFii";
import { cn } from "@/lib/utils";

function topMovers(
  byPlayer: Record<string, MatchFlowPlayerTrend>,
  limit = 5
): MatchFlowPlayerTrend[] {
  const seen = new Set<string>();
  const unique: MatchFlowPlayerTrend[] = [];
  for (const row of Object.values(byPlayer)) {
    const id =
      playerTrendKey({ playerId: row.playerId, trackId: row.trackId }) ||
      row.name ||
      JSON.stringify(row);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(row);
  }
  return unique.sort((a, b) => a.delta - b.delta).slice(0, limit);
}

function uniquePlayerCount(byPlayer: Record<string, MatchFlowPlayerTrend>): number {
  const seen = new Set<string>();
  for (const row of Object.values(byPlayer)) {
    const id =
      playerTrendKey({ playerId: row.playerId, trackId: row.trackId }) ||
      row.name ||
      "";
    if (id) seen.add(id);
  }
  return seen.size;
}

export function CoachMatchFlowTrendCard() {
  const { variant, matchFlowTrend, matchFlowLoading, cardState } = useVisionCoachDashboard();
  const trend = matchFlowTrend;

  if (cardState === "ready" && !matchFlowLoading && !trend) {
    return null;
  }

  if (cardState !== "ready" && cardState !== "loading" && !matchFlowLoading) {
    return null;
  }

  const movers = trend ? topMovers(trend.byPlayer) : [];
  const playerCount = trend ? uniquePlayerCount(trend.byPlayer) : 0;

  return (
    <VisionCardFrame
      title={trend?.headlineCopy ?? "최근 경기 흐름 비교"}
      testId="coach-match-flow-trend-card"
      variant={variant}
      loading={matchFlowLoading || cardState === "loading"}
      error={null}
      empty={false}
    >
      {trend ? (
        <div className="space-y-3" data-testid="coach-match-flow-trend-body">
          <div className="flex gap-3 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-3">
            <TrendingUp
              className="mt-0.5 h-5 w-5 shrink-0 text-violet-700"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-relaxed text-violet-950">
                {trend.windowCopy}
              </p>
              <p className="text-xs text-violet-800/90">
                비교 경기 수 N={trend.windowN} · 흐름 표시 선수 {playerCount}명
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {movers.map((row) => {
              const key =
                playerTrendKey({ playerId: row.playerId, trackId: row.trackId }) ??
                row.name ??
                "row";
              return (
                <li
                  key={key}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  data-testid="coach-match-flow-trend-row"
                >
                  <p className="text-xs font-bold text-slate-800">
                    {row.name?.trim() || row.playerId || row.trackId || "선수"}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-slate-700">
                    {formatMatchFlowDisplayLine(row)}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] font-bold tabular-nums",
                      row.delta >= 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    Δ {formatMatchFlowDelta(row.delta)} · FII
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
