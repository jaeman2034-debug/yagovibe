import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrowthTimelineMiniChart } from "@/components/ai-growth/GrowthTimelineMiniChart";
import { getPlayerGrowthTimeline } from "@/lib/ai-growth/getPlayerGrowthTimeline";
import { resolveGrowthPlayerIdForSession } from "@/lib/ai-growth/growthPlayerId";
import { canShowGrowthTimelineChart } from "@/lib/ai-growth/growthTimelineDisplay";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";

type Props = {
  teamId: string;
  playerName: string;
  playerId?: string;
  className?: string;
};

/** Sprint D-4.2-c — Step5 최근 5회 성장 추세 (Parent Home과 동일 데이터) */
export function Step5GrowthTimelineCard({ teamId, playerName, playerId, className }: Props) {
  const resolvedPlayerId = useMemo(
    () =>
      resolveGrowthPlayerIdForSession({
        playerId,
        displayName: playerName,
      }),
    [playerId, playerName]
  );

  const [timeline, setTimeline] = useState<PlayerGrowthTimeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getPlayerGrowthTimeline(teamId, resolvedPlayerId, 5)
      .then((result) => {
        if (!cancelled) setTimeline(result);
      })
      .catch((error) => {
        console.warn("[Step5GrowthTimelineCard] load failed", error);
        if (!cancelled) setTimeline(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, resolvedPlayerId]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2.5 text-xs text-emerald-900",
          className
        )}
        data-testid="step5-growth-timeline-loading"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        최근 성장 추세 불러오는 중…
      </div>
    );
  }

  if (!canShowGrowthTimelineChart(timeline)) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-emerald-300 bg-white/70 px-3 py-2.5 text-xs text-emerald-900",
          className
        )}
        data-testid="step5-growth-timeline-insufficient"
      >
        <p className="flex items-center gap-1.5 font-semibold text-emerald-950">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          최근 성장 추세
        </p>
        <p className="mt-1 leading-relaxed">
          저장된 훈련 기록이 2회 이상이면 최근 5회 OVR 추세가 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="step5-growth-timeline-card">
      <GrowthTimelineMiniChart
        className={cn("border-emerald-200 bg-emerald-50/40", className)}
        timeline={timeline!}
        variant="compact"
      />
    </div>
  );
}
