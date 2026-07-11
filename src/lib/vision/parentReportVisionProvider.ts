/**
 * Vision v6-3 / v6-6 — Parent Report data provider (delegates to Translation Layer)
 */

import { buildParentIntelligenceView } from "@/lib/vision/buildParentIntelligenceView";
import { buildPlayerIntelligenceView } from "@/lib/vision/playerIntelligenceProvider";
import type { ParentReportVisionProviderView, VisionResult } from "@/lib/vision/visionTypes";

/** Legacy v6-3 provider — builds Parent VM via Translation Layer (no UI) */
export function buildParentReportVisionView(
  result: VisionResult,
  opts?: { playerId?: string; trackId?: string; playerName?: string; teamName?: string }
): ParentReportVisionProviderView {
  const coachView = buildPlayerIntelligenceView({
    teamId: "",
    playerId: opts?.playerId ?? "",
    teamName: opts?.teamName ?? "팀",
    playerName: opts?.playerName ?? "선수",
    persona: "coach",
    matchId: null,
    trackId: opts?.trackId,
    visionResult: result,
  });

  const parentView = buildParentIntelligenceView({ coachView });

  return {
    playerGrowth: {
      currentFii: coachView.fii.score,
      rank: coachView.fii.rank,
      summary: parentView.narrativeSummary.split("\n\n")[0] ?? parentView.narrativeSummary,
    },
    matchSummary: parentView.matchSummary ?? parentView.narrativeSummary,
    aiRecommendation: parentView.recommendation,
  };
}
