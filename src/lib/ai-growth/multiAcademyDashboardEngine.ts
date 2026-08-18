import type {
  AcademyIntelligenceSnapshot,
  MultiAcademyDashboardKpi,
  MultiAcademyDashboardResult,
  MultiAcademyDashboardRow,
} from "@/lib/ai-growth/multiAcademyDashboardTypes";

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function weightedAvgOvr(snapshots: AcademyIntelligenceSnapshot[]): number | null {
  let weightedSum = 0;
  let weight = 0;
  for (const snapshot of snapshots) {
    if (snapshot.avgOvr === null || snapshot.trackedPlayers <= 0) continue;
    weightedSum += snapshot.avgOvr * snapshot.trackedPlayers;
    weight += snapshot.trackedPlayers;
  }
  if (weight <= 0) return null;
  return Math.round(weightedSum / weight);
}

function buildEmptyMultiAcademyDashboard(): MultiAcademyDashboardResult {
  return {
    headline: "Multi Academy Dashboard",
    subline: "운영 중인 아카데미가 없습니다",
    kpi: {
      academyCount: 0,
      playerCount: 0,
      trackedPlayers: 0,
      avgOvr: null,
      avgGrowthRate: null,
      atRiskPlayerCount: 0,
      activeCoachCount: 0,
    },
    academies: [],
    isEmpty: true,
  };
}

/** Sprint G-1.1 — 운영 아카데미 스냅샷 → Multi Academy Dashboard */
export function buildMultiAcademyDashboard(
  snapshots: AcademyIntelligenceSnapshot[]
): MultiAcademyDashboardResult {
  if (snapshots.length === 0) {
    return buildEmptyMultiAcademyDashboard();
  }

  const academies: MultiAcademyDashboardRow[] = snapshots.map((snapshot) => ({
    teamId: snapshot.teamId,
    teamName: snapshot.teamName,
    playerCount: snapshot.playerCount,
    trackedPlayers: snapshot.trackedPlayers,
    avgOvr: snapshot.avgOvr,
    avgGrowthRate: snapshot.avgGrowthRate,
    atRiskPlayerCount: snapshot.atRiskPlayerCount,
    activeCoachCount: snapshot.activeCoachCount,
  }));

  const growthRates = snapshots
    .map((snapshot) => snapshot.avgGrowthRate)
    .filter((rate): rate is number => rate !== null);

  const kpi: MultiAcademyDashboardKpi = {
    academyCount: snapshots.length,
    playerCount: snapshots.reduce((sum, snapshot) => sum + snapshot.playerCount, 0),
    trackedPlayers: snapshots.reduce((sum, snapshot) => sum + snapshot.trackedPlayers, 0),
    avgOvr: weightedAvgOvr(snapshots),
    avgGrowthRate: roundAvg(growthRates),
    atRiskPlayerCount: snapshots.reduce((sum, snapshot) => sum + snapshot.atRiskPlayerCount, 0),
    activeCoachCount: snapshots.reduce((sum, snapshot) => sum + snapshot.activeCoachCount, 0),
  };

  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 아카데미 · 추적 ${kpi.trackedPlayers}/${kpi.playerCount}명`
      : "다중 아카데미 비교는 2개 이상 운영 시 의미가 있습니다";

  return {
    headline: "Multi Academy Dashboard",
    subline,
    kpi,
    academies,
    isEmpty: snapshots.length < 2,
  };
}
