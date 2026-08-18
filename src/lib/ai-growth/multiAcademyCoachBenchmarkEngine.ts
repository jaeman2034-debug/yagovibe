import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import type {
  MultiAcademyCoachBenchmarkDigest,
  MultiAcademyCoachBenchmarkKpi,
  MultiAcademyCoachBenchmarkResult,
  MultiAcademyCoachBenchmarkRow,
} from "@/lib/ai-growth/multiAcademyCoachBenchmarkTypes";

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function buildCoachBenchmarkDigest(
  kpi: MultiAcademyCoachBenchmarkKpi,
  rows: MultiAcademyCoachBenchmarkRow[]
): MultiAcademyCoachBenchmarkDigest {
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
    summaryLines.push(`성장 기여 1위 ${topGrowth.teamName}`);
  }

  return {
    headline: "코치 벤치마크",
    summaryLines: summaryLines.length > 0 ? summaryLines : ["코치 벤치마크 데이터 대기 중"],
  };
}

function buildEmptyCoachBenchmark(): MultiAcademyCoachBenchmarkResult {
  return {
    headline: "Multi Academy Coach Benchmark",
    subline: "운영 중인 아카데미가 없습니다",
    kpi: {
      academyCount: 0,
      totalCoachCount: 0,
      totalActiveSessions: 0,
      avgAttendanceRecordingRate: null,
      avgGrowthContributionRate: null,
      avgAtRiskImprovementRate: null,
    },
    academies: [],
    digest: {
      headline: "코치 벤치마크",
      summaryLines: ["코치 벤치마크 데이터 대기 중"],
    },
    isEmpty: true,
  };
}

/** Sprint G-1.3 — 아카데미 스냅샷 → 코치 벤치마크 비교 */
export function buildMultiAcademyCoachBenchmark(
  snapshots: AcademyIntelligenceSnapshot[]
): MultiAcademyCoachBenchmarkResult {
  if (snapshots.length === 0) {
    return buildEmptyCoachBenchmark();
  }

  const academies: MultiAcademyCoachBenchmarkRow[] = snapshots.map((snapshot) => ({
    teamId: snapshot.teamId,
    teamName: snapshot.teamName,
    coachCount: snapshot.activeCoachCount,
    activeSessionCount: snapshot.activeSessionCount,
    attendanceRecordingRate: snapshot.attendanceRecordingRate,
    growthContributionRate: snapshot.growthContributionRate,
    atRiskImprovementRate: snapshot.atRiskImprovementRate,
  }));

  const attendanceRates = snapshots
    .map((snapshot) => snapshot.attendanceRecordingRate)
    .filter((rate): rate is number => rate !== null);
  const growthRates = snapshots
    .map((snapshot) => snapshot.growthContributionRate)
    .filter((rate): rate is number => rate !== null);
  const improvementRates = snapshots
    .map((snapshot) => snapshot.atRiskImprovementRate)
    .filter((rate): rate is number => rate !== null);

  const kpi: MultiAcademyCoachBenchmarkKpi = {
    academyCount: snapshots.length,
    totalCoachCount: snapshots.reduce((sum, snapshot) => sum + snapshot.activeCoachCount, 0),
    totalActiveSessions: snapshots.reduce((sum, snapshot) => sum + snapshot.activeSessionCount, 0),
    avgAttendanceRecordingRate: roundAvg(attendanceRates),
    avgGrowthContributionRate: roundAvg(growthRates),
    avgAtRiskImprovementRate: roundAvg(improvementRates),
  };

  const digest = buildCoachBenchmarkDigest(kpi, academies);
  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 아카데미 코치 운영·성장 비교`
      : "다중 아카데미 코치 벤치마크는 2개 이상 운영 시 의미가 있습니다";

  return {
    headline: "Multi Academy Coach Benchmark",
    subline,
    kpi,
    academies,
    digest,
    isEmpty: snapshots.length < 2,
  };
}
