import type { CoachDashboardSnapshot } from "@/lib/ai-growth/coachDashboardTypes";
import type { CoachActionCenterResult } from "@/lib/ai-growth/coachActionCenterTypes";
import type { CoachAlertFeedResult } from "@/lib/ai-growth/coachAlertTypes";
import type {
  TeamCoachRecommendation,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

/** Sprint E-2.4 — 코치 대시보드 요약 지표 */
export function buildCoachDashboard(input: {
  atRiskPlayers: TeamPlayerGrowthRow[];
  coachRecommendations: TeamCoachRecommendation[];
  coachActionCenter: CoachActionCenterResult;
  coachAlerts: CoachAlertFeedResult;
}): CoachDashboardSnapshot {
  const actionNeededCount = input.atRiskPlayers.length;
  const atRiskCount = input.atRiskPlayers.length;

  const teamRecCount = input.coachRecommendations.filter(
    (r) => r.id !== "team-maintain-momentum"
  ).length;
  const actionTrainingCount = input.coachActionCenter.actions.filter(
    (a) => !a.id.startsWith("player-")
  ).length;
  const recommendedTrainingCount = Math.max(teamRecCount, actionTrainingCount);

  return {
    actionNeededCount,
    atRiskCount,
    recommendedTrainingCount,
    alertCount: input.coachAlerts.alerts.length,
  };
}
