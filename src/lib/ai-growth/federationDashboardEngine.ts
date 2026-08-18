import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import type {
  FederationDashboardKpi,
  FederationDashboardResult,
  FederationDashboardRow,
  FederationIntelligenceSnapshot,
} from "@/lib/ai-growth/federationDashboardTypes";

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

function aggregateAcademySnapshots(snapshots: AcademyIntelligenceSnapshot[]) {
  const growthRates = snapshots
    .map((snapshot) => snapshot.avgGrowthRate)
    .filter((rate): rate is number => rate !== null);

  return {
    academyCount: snapshots.length,
    playerCount: snapshots.reduce((sum, snapshot) => sum + snapshot.playerCount, 0),
    trackedPlayers: snapshots.reduce((sum, snapshot) => sum + snapshot.trackedPlayers, 0),
    avgOvr: weightedAvgOvr(snapshots),
    avgGrowthRate: roundAvg(growthRates),
    atRiskPlayerCount: snapshots.reduce((sum, snapshot) => sum + snapshot.atRiskPlayerCount, 0),
    activeCoachCount: snapshots.reduce((sum, snapshot) => sum + snapshot.activeCoachCount, 0),
  };
}

/** G-1 academy snapshots → single federation snapshot */
export function buildFederationIntelligenceSnapshot(
  federationId: string,
  federationName: string,
  academySnapshots: AcademyIntelligenceSnapshot[]
): FederationIntelligenceSnapshot {
  const aggregated = aggregateAcademySnapshots(academySnapshots);
  return {
    federationId,
    federationName,
    academies: academySnapshots,
    ...aggregated,
  };
}

function buildEmptyFederationDashboard(): FederationDashboardResult {
  return {
    headline: "Federation Dashboard",
    subline: "연맹 소속 아카데미 또는 연맹 관리 권한이 필요합니다",
    kpi: {
      federationCount: 0,
      academyCount: 0,
      playerCount: 0,
      trackedPlayers: 0,
      avgOvr: null,
      avgGrowthRate: null,
      atRiskPlayerCount: 0,
    },
    federations: [],
    isEmpty: true,
  };
}

/** Sprint H-1.1 — Federation snapshots → Federation Dashboard */
export function buildFederationDashboard(
  snapshots: FederationIntelligenceSnapshot[]
): FederationDashboardResult {
  if (snapshots.length === 0) {
    return buildEmptyFederationDashboard();
  }

  const federations: FederationDashboardRow[] = snapshots.map((snapshot) => ({
    federationId: snapshot.federationId,
    federationName: snapshot.federationName,
    academyCount: snapshot.academyCount,
    playerCount: snapshot.playerCount,
    trackedPlayers: snapshot.trackedPlayers,
    avgOvr: snapshot.avgOvr,
    avgGrowthRate: snapshot.avgGrowthRate,
    atRiskPlayerCount: snapshot.atRiskPlayerCount,
  }));

  const flatAcademies = snapshots.flatMap((snapshot) => snapshot.academies);
  const aggregated = aggregateAcademySnapshots(flatAcademies);

  const kpi: FederationDashboardKpi = {
    federationCount: snapshots.length,
    academyCount: aggregated.academyCount,
    playerCount: aggregated.playerCount,
    trackedPlayers: aggregated.trackedPlayers,
    avgOvr: aggregated.avgOvr,
    avgGrowthRate: aggregated.avgGrowthRate,
    atRiskPlayerCount: aggregated.atRiskPlayerCount,
  };

  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 연맹 · ${kpi.academyCount}개 아카데미 · 추적 ${kpi.trackedPlayers}/${kpi.playerCount}명`
      : "다중 연맹 비교는 2개 이상 관리 시 의미가 있습니다";

  return {
    headline: "Federation Dashboard",
    subline,
    kpi,
    federations,
    isEmpty: snapshots.length < 2,
  };
}
