import type { FederationIntelligenceSnapshot } from "@/lib/ai-growth/federationDashboardTypes";
import type {
  FederationCoachBenchmarkDigest,
  FederationCoachBenchmarkKpi,
  FederationCoachBenchmarkResult,
  FederationCoachBenchmarkRow,
} from "@/lib/ai-growth/federationCoachBenchmarkTypes";
import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function aggregateAcademyCoachMetrics(academies: AcademyIntelligenceSnapshot[]) {
  const attendanceRates = academies
    .map((snapshot) => snapshot.attendanceRecordingRate)
    .filter((rate): rate is number => rate !== null);
  const growthRates = academies
    .map((snapshot) => snapshot.growthContributionRate)
    .filter((rate): rate is number => rate !== null);
  const improvementRates = academies
    .map((snapshot) => snapshot.atRiskImprovementRate)
    .filter((rate): rate is number => rate !== null);

  return {
    coachCount: academies.reduce((sum, snapshot) => sum + snapshot.activeCoachCount, 0),
    activeSessionCount: academies.reduce((sum, snapshot) => sum + snapshot.activeSessionCount, 0),
    attendanceRecordingRate: roundAvg(attendanceRates),
    growthContributionRate: roundAvg(growthRates),
    atRiskImprovementRate: roundAvg(improvementRates),
  };
}

function buildCoachBenchmarkDigest(
  kpi: FederationCoachBenchmarkKpi,
  rows: FederationCoachBenchmarkRow[]
): FederationCoachBenchmarkDigest {
  const summaryLines: string[] = [];

  if (kpi.totalCoachCount > 0) {
    summaryLines.push(`운영 코치 ${kpi.totalCoachCount}명`);
  }
  if (kpi.totalActiveSessions > 0) {
    summaryLines.push(`활성 세션 ${kpi.totalActiveSessions}회`);
  }
  if (kpi.avgAttendanceRecordingRate !== null) {
    summaryLines.push(`평균 출석 기록률 ${kpi.avgAttendanceRecordingRate}%`);
  }
  if (kpi.avgGrowthContributionRate !== null) {
    summaryLines.push(`평균 성장 기여 ${formatSignedDelta(kpi.avgGrowthContributionRate)}`);
  }

  const topGrowth = [...rows]
    .filter((row) => row.growthContributionRate !== null)
    .sort((a, b) => (b.growthContributionRate ?? 0) - (a.growthContributionRate ?? 0))[0];

  if (topGrowth) {
    summaryLines.push(`성장 기여 1위 ${topGrowth.federationName}`);
  }

  return {
    headline: "연맹 코치 벤치마크",
    summaryLines: summaryLines.length > 0 ? summaryLines : ["코치 벤치마크 데이터 대기 중"],
  };
}

function buildEmptyFederationCoachBenchmark(): FederationCoachBenchmarkResult {
  return {
    headline: "Federation Coach Benchmark",
    subline: "연맹 소속 아카데미 또는 연맹 관리 권한이 필요합니다",
    kpi: {
      federationCount: 0,
      totalCoachCount: 0,
      totalActiveSessions: 0,
      avgAttendanceRecordingRate: null,
      avgGrowthContributionRate: null,
      avgAtRiskImprovementRate: null,
    },
    federations: [],
    digest: {
      headline: "연맹 코치 벤치마크",
      summaryLines: ["코치 벤치마크 데이터 대기 중"],
    },
    isEmpty: true,
  };
}

/** Sprint H-1.3 — Federation snapshots → 코치 벤치마크 비교 */
export function buildFederationCoachBenchmark(
  snapshots: FederationIntelligenceSnapshot[]
): FederationCoachBenchmarkResult {
  if (snapshots.length === 0) {
    return buildEmptyFederationCoachBenchmark();
  }

  const federations: FederationCoachBenchmarkRow[] = snapshots.map((snapshot) => {
    const metrics = aggregateAcademyCoachMetrics(snapshot.academies);
    return {
      federationId: snapshot.federationId,
      federationName: snapshot.federationName,
      ...metrics,
    };
  });

  const attendanceRates = federations
    .map((row) => row.attendanceRecordingRate)
    .filter((rate): rate is number => rate !== null);
  const growthRates = federations
    .map((row) => row.growthContributionRate)
    .filter((rate): rate is number => rate !== null);
  const improvementRates = federations
    .map((row) => row.atRiskImprovementRate)
    .filter((rate): rate is number => rate !== null);

  const kpi: FederationCoachBenchmarkKpi = {
    federationCount: snapshots.length,
    totalCoachCount: federations.reduce((sum, row) => sum + row.coachCount, 0),
    totalActiveSessions: federations.reduce((sum, row) => sum + row.activeSessionCount, 0),
    avgAttendanceRecordingRate: roundAvg(attendanceRates),
    avgGrowthContributionRate: roundAvg(growthRates),
    avgAtRiskImprovementRate: roundAvg(improvementRates),
  };

  const digest = buildCoachBenchmarkDigest(kpi, federations);
  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 연맹 코치 운영·성장 비교`
      : "다중 연맹 코치 벤치마크는 2개 이상 관리 시 의미가 있습니다";

  return {
    headline: "Federation Coach Benchmark",
    subline,
    kpi,
    federations,
    digest,
    isEmpty: snapshots.length < 2,
  };
}
