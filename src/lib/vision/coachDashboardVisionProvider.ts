/**
 * Vision v6-3 — Coach Dashboard data provider (no UI)
 */

import { analyzeVisionResultFromData } from "@/lib/vision/visionService";
import type { CoachDashboardVisionProviderView, VisionResult } from "@/lib/vision/visionTypes";

export function buildCoachDashboardVisionView(
  result: VisionResult
): CoachDashboardVisionProviderView {
  const summary = analyzeVisionResultFromData(result);

  const playerRanking = summary.playerRanking.map((p, i) => ({
    rank: p.rank ?? i + 1,
    name: p.name?.trim() || `Player ${p.trackId ?? i + 1}`,
    fii: p.fii,
    trackId: p.trackId,
    playerId: p.playerId,
  }));

  const playmaker = summary.playmaker
    ? {
        name: summary.playmaker.name?.trim() || "Playmaker",
        score: summary.playmaker.score,
        trackId: summary.playmaker.trackId,
      }
    : null;

  const pressureZones =
    result.pressureZone?.zones?.map((z) => ({
      zoneId: z.zoneId,
      label: z.label ?? z.zoneId,
      intensity: z.intensity,
    })) ?? [];

  return {
    playerRanking,
    playmaker,
    forwardPassRate: summary.forwardPassRate,
    pressureZones,
    compactness: summary.compactness,
    tacticalReport: result.tacticalReport,
    recommendation: summary.recommendation,
    fiiDataSource: "vision_result",
  };
}
