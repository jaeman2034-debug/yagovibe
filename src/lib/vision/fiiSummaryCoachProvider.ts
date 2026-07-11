/**
 * RC4-3 M3 — fii_summary.json → Coach Dashboard / Match Detail view
 */

import type { CoachDashboardVisionProviderView } from "@/lib/vision/visionTypes";
import type { FiiSummaryDocument } from "@/lib/vision/fiiSummaryTypes";

export type CoachMatchDetailView = {
  teamFiiOverall: number | null;
  teamAxes: Partial<Record<string, number>>;
  matchHeadline: string;
  matchSummary: string;
  eventHighlights: {
    passes: number;
    receives: number;
    turnovers: number;
    totalEvents: number;
  };
  topPlayers: Array<{ rank: number; name: string; fii: number; trackId?: string }>;
  coachStrengths: string[];
  improvementPoints: string[];
  trainingRecommendations: string[];
  possessionChains: number | null;
  productionPreset: string | null;
};

export function buildCoachDashboardFromFiiSummary(
  doc: FiiSummaryDocument
): CoachDashboardVisionProviderView {
  const team = doc.teamFii;
  const insights = doc.coachInsights;
  const match = doc.matchSummary;
  const ball = team.ballProgression;
  const pm = team.playmaker;

  const playerRanking = [...doc.playerFii]
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((p) => ({
      rank: p.rank,
      name: p.name?.trim() || `Player ${p.trackId}`,
      fii: p.fii,
      trackId: p.trackId,
    }));

  return {
    playerRanking,
    playmaker: pm
      ? {
          name: pm.name?.trim() || "Playmaker",
          score: pm.score,
          trackId: pm.trackId,
        }
      : playerRanking[0]
        ? {
            name: playerRanking[0].name,
            score: playerRanking[0].fii / 100,
            trackId: playerRanking[0].trackId,
          }
        : null,
    forwardPassRate: ball?.forwardPassRate ?? null,
    pressureZones: [],
    compactness: null,
    tacticalReport: {
      summary: match.summary,
      strengths: insights.strengths,
      weaknesses: insights.improvementPoints,
      recommendations: insights.recommendations,
    },
    recommendation:
      insights.coachDecisionBrief?.nextTrainingFocus?.trim() ||
      insights.recommendations[0]?.trim() ||
      match.summary ||
      "FII 기반 코칭 포인트를 확인하세요.",
    teamFiiOverall: team.overall ?? null,
    matchHeadline: match.headline,
    matchSummaryText: match.summary,
    coachStrengths: insights.strengths,
    improvementPoints: insights.improvementPoints,
    trainingRecommendations: insights.recommendations,
    coachDecisionBrief: insights.coachDecisionBrief,
    reviewHooks: insights.reviewHooks,
    fiiDataSource: "fii_summary",
  };
}

export function buildCoachMatchDetailFromFiiSummary(
  doc: FiiSummaryDocument
): CoachMatchDetailView {
  const highlights = doc.matchSummary.eventHighlights ?? {};
  const dashboard = buildCoachDashboardFromFiiSummary(doc);

  return {
    teamFiiOverall: dashboard.teamFiiOverall ?? null,
    teamAxes: doc.teamFii.axes ?? {},
    matchHeadline: doc.matchSummary.headline,
    matchSummary: doc.matchSummary.summary,
    eventHighlights: {
      passes: highlights.passes ?? 0,
      receives: highlights.receives ?? 0,
      turnovers: highlights.turnovers ?? 0,
      totalEvents: highlights.totalEvents ?? doc.gevInput?.eventCount ?? 0,
    },
    topPlayers: dashboard.playerRanking.slice(0, 3),
    coachStrengths: dashboard.coachStrengths ?? [],
    improvementPoints: dashboard.improvementPoints ?? [],
    trainingRecommendations: dashboard.trainingRecommendations ?? [],
    possessionChains: doc.matchSummary.possessionChain?.totalCompletedChains ?? null,
    productionPreset: doc.productionPreset ?? null,
  };
}
