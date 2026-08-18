import type { TeamGrowthIntelligenceView } from "@/lib/ai-growth/teamGrowthIntelligenceViewTypes";
import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";

function formatSignedDelta(delta: number): number {
  return delta;
}

/** TeamGrowthIntelligenceView → G-1 read-only snapshot */
export function mapTeamGrowthViewToAcademySnapshot(
  view: TeamGrowthIntelligenceView
): AcademyIntelligenceSnapshot {
  const dashboard = view.academyDashboard?.snapshot;
  const weeklyDigest = view.academyWeeklyDigest;
  const coachPerformance = view.academyCoachPerformance;

  const avgGrowthRate =
    weeklyDigest?.avgOvrDelta ??
    coachPerformance?.kpi.avgGrowthRate ??
    null;

  const playerCount = dashboard?.totalPlayers ?? view.snapshot.rosterCount;
  const trackedPlayers = dashboard?.trackedPlayers ?? view.snapshot.trackedCount;
  const atRiskPlayerCount = view.atRiskPlayers.length;
  const riskBase = trackedPlayers > 0 ? trackedPlayers : playerCount;

  const sessionIntel = view.academySessionIntelligence;
  const coachOps = view.academyCoachOperations;
  const activeSessionCount = sessionIntel?.kpi.activeSessions ?? coachOps?.kpi.totalSessions ?? 0;
  const lowAttendanceSessionPct =
    activeSessionCount > 0 && sessionIntel
      ? Math.round((sessionIntel.kpi.lowAttendanceSessionCount / activeSessionCount) * 100)
      : null;
  const unrecordedSessionPct =
    activeSessionCount > 0 && sessionIntel
      ? Math.round((sessionIntel.kpi.unrecordedSessionCount / activeSessionCount) * 100)
      : null;

  const activeCoachCount =
    coachPerformance?.coaches.length ?? coachOps?.kpi.coachCount ?? 0;
  const atRiskPlayerPct =
    riskBase > 0 ? Math.round((atRiskPlayerCount / riskBase) * 100) : null;

  const attendanceIntel = view.academyAttendanceIntelligence;
  const avgAttendanceRatePct = attendanceIntel?.kpi.avgAttendanceRatePct ?? null;
  const sessionOperationRate =
    unrecordedSessionPct !== null
      ? 100 - unrecordedSessionPct
      : coachOps && coachOps.kpi.totalSessions > 0
        ? coachOps.kpi.avgAttendanceManagementRate
        : null;
  const activeCoachRatio =
    activeCoachCount > 0 ? Math.min(100, activeCoachCount * 50) : 0;

  const healthParts = [
    avgAttendanceRatePct,
    sessionOperationRate,
    atRiskPlayerPct !== null ? 100 - atRiskPlayerPct : null,
    activeCoachRatio,
  ].filter((value): value is number => value !== null);
  const operationalHealthScore =
    healthParts.length > 0
      ? Math.round(healthParts.reduce((sum, value) => sum + value, 0) / healthParts.length)
      : null;

  return {
    teamId: view.teamId,
    teamName: view.teamName,
    playerCount,
    trackedPlayers,
    avgOvr:
      dashboard && dashboard.trackedPlayers > 0
        ? dashboard.avgOvr
        : view.snapshot.trackedCount > 0
          ? view.snapshot.avgOvr
          : null,
    avgGrowthRate: avgGrowthRate !== null ? formatSignedDelta(avgGrowthRate) : null,
    atRiskPlayerCount,
    activeCoachCount,
    atRiskPlayerPct,
    lowAttendanceSessionPct,
    unrecordedSessionPct,
    activeSessionCount,
    attendanceRecordingRate:
      coachOps && coachOps.kpi.totalSessions > 0
        ? coachOps.kpi.avgAttendanceManagementRate
        : null,
    growthContributionRate:
      coachPerformance?.kpi.avgGrowthRate ?? avgGrowthRate,
    atRiskImprovementRate: coachPerformance?.kpi.riskManagementRate ?? null,
    avgAttendanceRatePct,
    sessionOperationRate,
    activeCoachRatio,
    operationalHealthScore,
  };
}

/** roster-only fallback when intelligence load returns null */
export function buildMinimalAcademySnapshot(input: {
  teamId: string;
  teamName: string;
  playerCount: number;
}): AcademyIntelligenceSnapshot {
  return {
    teamId: input.teamId,
    teamName: input.teamName,
    playerCount: input.playerCount,
    trackedPlayers: 0,
    avgOvr: null,
    avgGrowthRate: null,
    atRiskPlayerCount: 0,
    activeCoachCount: 0,
    atRiskPlayerPct: null,
    lowAttendanceSessionPct: null,
    unrecordedSessionPct: null,
    activeSessionCount: 0,
    attendanceRecordingRate: null,
    growthContributionRate: null,
    atRiskImprovementRate: null,
    avgAttendanceRatePct: null,
    sessionOperationRate: null,
    activeCoachRatio: null,
    operationalHealthScore: null,
  };
}
