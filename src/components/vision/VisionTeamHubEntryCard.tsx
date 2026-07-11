/**
 * RC4-5 M5 — Team Hub Vision entry (match → Coach / Parent / Detail / Timeline)
 */

import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";
import { VisionJobMonitorPanel } from "@/components/vision/VisionJobMonitorPanel";
import { useVisionPlatformMatchMeta } from "@/hooks/useVisionPlatformMatchMeta";
import { visionMatchDetailPath } from "@/lib/vision/visionPlatformRoutes";
import {
  shouldUseFiiSummaryPilot,
  VISION_PILOT_MATCH_ID,
} from "@/lib/vision/fiiSummaryLoader";

type Props = {
  teamId: string;
  matchId?: string;
  playerId?: string;
  variant?: "light" | "dark";
  className?: string;
};

export function VisionTeamHubEntryCard({
  teamId,
  matchId,
  playerId,
  variant = "dark",
  className,
}: Props) {
  const effectiveMatchId =
    matchId?.trim() ||
    (shouldUseFiiSummaryPilot() ? VISION_PILOT_MATCH_ID : "");

  const { meta, loading, isPilot } = useVisionPlatformMatchMeta(effectiveMatchId);

  if (!effectiveMatchId) return null;
  if (!isPilot && !matchId?.trim()) return null;

  const isDark = variant === "dark";

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        isDark
          ? "border-violet-500/30 bg-gradient-to-br from-violet-950/60 via-[#0c1020] to-indigo-950/40"
          : "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50",
        className
      )}
      data-testid="vision-team-hub-entry"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              isDark ? "text-violet-300" : "text-violet-700"
            )}
          >
            Vision · 경기 분석
          </p>
          <h2
            className={cn(
              "mt-1 flex items-center gap-1.5 text-sm font-black",
              isDark ? "text-white" : "text-violet-950"
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            {loading ? "불러오는 중…" : meta?.matchHeadline ?? "경기 AI 분석"}
          </h2>
        </div>
        {meta?.teamFiiOverall != null ? (
          <span className="shrink-0 rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-bold text-white">
            FII {meta.teamFiiOverall}
          </span>
        ) : loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-violet-400" aria-hidden />
        ) : null}
      </div>

      {meta?.matchSummary ? (
        <p
          className={cn(
            "mt-2 line-clamp-2 text-xs leading-relaxed",
            isDark ? "text-violet-100/90" : "text-violet-900"
          )}
        >
          {meta.matchSummary}
        </p>
      ) : null}

      <VisionJobMonitorPanel
        teamId={teamId}
        matchId={effectiveMatchId}
        variant={variant}
        compact
        playerId={playerId}
        className="mt-3"
      />

      <VisionPlatformNav
        className="mt-3"
        teamId={teamId}
        matchId={effectiveMatchId}
        current="team-hub"
        playerId={playerId}
        variant={variant}
        compact
      />

      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          to={visionMatchDetailPath(teamId, effectiveMatchId)}
          className={cn(
            "inline-flex text-xs font-bold underline-offset-2 hover:underline",
            isDark ? "text-violet-200" : "text-violet-700"
          )}
          data-testid="vision-team-hub-detail-link"
        >
          Match Detail →
        </Link>
        <Link
          to={`/teams/${encodeURIComponent(teamId)}/vision/pilot-beta`}
          className={cn(
            "inline-flex text-xs font-bold underline-offset-2 hover:underline",
            isDark ? "text-amber-300" : "text-amber-700"
          )}
          data-testid="vision-team-hub-pilot-beta-link"
        >
          Pilot Beta →
        </Link>
        <Link
          to={`/teams/${encodeURIComponent(teamId)}/vision/demo`}
          className={cn(
            "inline-flex text-xs font-bold underline-offset-2 hover:underline",
            isDark ? "text-cyan-300" : "text-cyan-700"
          )}
          data-testid="vision-team-hub-e2e-link"
        >
          E2E Demo →
        </Link>
      </div>
    </section>
  );
}
