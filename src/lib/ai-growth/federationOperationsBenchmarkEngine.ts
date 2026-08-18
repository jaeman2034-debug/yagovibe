import type { FederationIntelligenceSnapshot } from "@/lib/ai-growth/federationDashboardTypes";
import type {
  FederationOperationsBenchmarkDigest,
  FederationOperationsBenchmarkKpi,
  FederationOperationsBenchmarkResult,
  FederationOperationsBenchmarkRow,
} from "@/lib/ai-growth/federationOperationsBenchmarkTypes";
import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function aggregateAcademyOperationsMetrics(academies: AcademyIntelligenceSnapshot[]) {
  const attendanceRates = academies
    .map((snapshot) => snapshot.avgAttendanceRatePct)
    .filter((rate): rate is number => rate !== null);
  const sessionRates = academies
    .map((snapshot) => snapshot.sessionOperationRate)
    .filter((rate): rate is number => rate !== null);
  const unrecordedRates = academies
    .map((snapshot) => snapshot.unrecordedSessionPct)
    .filter((rate): rate is number => rate !== null);
  const atRiskRates = academies
    .map((snapshot) => snapshot.atRiskPlayerPct)
    .filter((rate): rate is number => rate !== null);
  const healthScores = academies
    .map((snapshot) => snapshot.operationalHealthScore)
    .filter((score): score is number => score !== null);

  return {
    attendanceRatePct: roundAvg(attendanceRates),
    sessionOperationRate: roundAvg(sessionRates),
    unrecordedRatePct: roundAvg(unrecordedRates),
    atRiskPlayerPct: roundAvg(atRiskRates),
    operationalHealthScore: roundAvg(healthScores),
  };
}

function buildOperationsDigest(
  kpi: FederationOperationsBenchmarkKpi,
  ranked: FederationOperationsBenchmarkRow[]
): FederationOperationsBenchmarkDigest {
  const summaryLines: string[] = [];

  if (kpi.avgOperationalHealthScore !== null) {
    summaryLines.push(`평균 운영 건전성 ${kpi.avgOperationalHealthScore}점`);
  }
  if (kpi.avgAttendanceRatePct !== null) {
    summaryLines.push(`평균 출석률 ${kpi.avgAttendanceRatePct}%`);
  }
  if (kpi.avgUnrecordedRatePct !== null) {
    summaryLines.push(`평균 미기록 ${kpi.avgUnrecordedRatePct}%`);
  }

  const top = ranked[0];
  if (top && top.operationalHealthScore !== null) {
    summaryLines.push(`운영 1위 ${top.federationName} ${top.operationalHealthScore}점`);
  }

  return {
    headline: "연맹 운영 벤치마크",
    summaryLines: summaryLines.length > 0 ? summaryLines : ["운영 벤치마크 데이터 대기 중"],
  };
}

function buildEmptyFederationOperationsBenchmark(): FederationOperationsBenchmarkResult {
  return {
    headline: "Federation Operations Benchmark",
    subline: "연맹 소속 아카데미 또는 연맹 관리 권한이 필요합니다",
    kpi: {
      federationCount: 0,
      avgAttendanceRatePct: null,
      avgSessionOperationRate: null,
      avgUnrecordedRatePct: null,
      avgAtRiskPlayerPct: null,
      avgOperationalHealthScore: null,
    },
    federations: [],
    digest: {
      headline: "연맹 운영 벤치마크",
      summaryLines: ["운영 벤치마크 데이터 대기 중"],
    },
    isEmpty: true,
  };
}

/** Sprint H-1.4 — Federation snapshots → 운영 벤치마크 + 순위 */
export function buildFederationOperationsBenchmark(
  snapshots: FederationIntelligenceSnapshot[]
): FederationOperationsBenchmarkResult {
  if (snapshots.length === 0) {
    return buildEmptyFederationOperationsBenchmark();
  }

  const federations: FederationOperationsBenchmarkRow[] = snapshots
    .map((snapshot) => {
      const metrics = aggregateAcademyOperationsMetrics(snapshot.academies);
      return {
        federationId: snapshot.federationId,
        federationName: snapshot.federationName,
        rank: 0,
        ...metrics,
      };
    })
    .sort(
      (a, b) => (b.operationalHealthScore ?? -1) - (a.operationalHealthScore ?? -1)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const attendanceRates = federations
    .map((row) => row.attendanceRatePct)
    .filter((rate): rate is number => rate !== null);
  const sessionRates = federations
    .map((row) => row.sessionOperationRate)
    .filter((rate): rate is number => rate !== null);
  const unrecordedRates = federations
    .map((row) => row.unrecordedRatePct)
    .filter((rate): rate is number => rate !== null);
  const atRiskRates = federations
    .map((row) => row.atRiskPlayerPct)
    .filter((rate): rate is number => rate !== null);
  const healthScores = federations
    .map((row) => row.operationalHealthScore)
    .filter((score): score is number => score !== null);

  const kpi: FederationOperationsBenchmarkKpi = {
    federationCount: snapshots.length,
    avgAttendanceRatePct: roundAvg(attendanceRates),
    avgSessionOperationRate: roundAvg(sessionRates),
    avgUnrecordedRatePct: roundAvg(unrecordedRates),
    avgAtRiskPlayerPct: roundAvg(atRiskRates),
    avgOperationalHealthScore: roundAvg(healthScores),
  };

  const digest = buildOperationsDigest(kpi, federations);
  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 연맹 운영 비교 · 건전성 순위`
      : "다중 연맹 운영 벤치마크는 2개 이상 관리 시 의미가 있습니다";

  return {
    headline: "Federation Operations Benchmark",
    subline,
    kpi,
    federations,
    digest,
    isEmpty: snapshots.length < 2,
  };
}
