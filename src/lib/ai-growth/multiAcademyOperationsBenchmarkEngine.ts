import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import type {
  MultiAcademyOperationsBenchmarkDigest,
  MultiAcademyOperationsBenchmarkKpi,
  MultiAcademyOperationsBenchmarkResult,
  MultiAcademyOperationsBenchmarkRow,
} from "@/lib/ai-growth/multiAcademyOperationsBenchmarkTypes";

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildOperationsDigest(
  kpi: MultiAcademyOperationsBenchmarkKpi,
  ranked: MultiAcademyOperationsBenchmarkRow[]
): MultiAcademyOperationsBenchmarkDigest {
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
    summaryLines.push(`운영 1위 ${top.teamName} ${top.operationalHealthScore}점`);
  }

  return {
    headline: "운영 벤치마크",
    summaryLines: summaryLines.length > 0 ? summaryLines : ["운영 벤치마크 데이터 대기 중"],
  };
}

function buildEmptyOperationsBenchmark(): MultiAcademyOperationsBenchmarkResult {
  return {
    headline: "Multi Academy Operations Benchmark",
    subline: "운영 중인 아카데미가 없습니다",
    kpi: {
      academyCount: 0,
      avgAttendanceRatePct: null,
      avgSessionOperationRate: null,
      avgUnrecordedRatePct: null,
      avgAtRiskPlayerPct: null,
      avgActiveCoachRatio: null,
      avgOperationalHealthScore: null,
    },
    academies: [],
    digest: {
      headline: "운영 벤치마크",
      summaryLines: ["운영 벤치마크 데이터 대기 중"],
    },
    isEmpty: true,
  };
}

/** Sprint G-1.4 — F-2 스냅샷 → 운영 벤치마크 + 순위 */
export function buildMultiAcademyOperationsBenchmark(
  snapshots: AcademyIntelligenceSnapshot[]
): MultiAcademyOperationsBenchmarkResult {
  if (snapshots.length === 0) {
    return buildEmptyOperationsBenchmark();
  }

  const rows: MultiAcademyOperationsBenchmarkRow[] = snapshots
    .map((snapshot) => ({
      teamId: snapshot.teamId,
      teamName: snapshot.teamName,
      rank: 0,
      attendanceRatePct: snapshot.avgAttendanceRatePct,
      sessionOperationRate: snapshot.sessionOperationRate,
      unrecordedRatePct: snapshot.unrecordedSessionPct,
      atRiskPlayerPct: snapshot.atRiskPlayerPct,
      activeCoachRatio: snapshot.activeCoachRatio,
      operationalHealthScore: snapshot.operationalHealthScore,
    }))
    .sort(
      (a, b) =>
        (b.operationalHealthScore ?? -1) - (a.operationalHealthScore ?? -1)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const attendanceRates = snapshots
    .map((snapshot) => snapshot.avgAttendanceRatePct)
    .filter((rate): rate is number => rate !== null);
  const sessionRates = snapshots
    .map((snapshot) => snapshot.sessionOperationRate)
    .filter((rate): rate is number => rate !== null);
  const unrecordedRates = snapshots
    .map((snapshot) => snapshot.unrecordedSessionPct)
    .filter((rate): rate is number => rate !== null);
  const atRiskRates = snapshots
    .map((snapshot) => snapshot.atRiskPlayerPct)
    .filter((rate): rate is number => rate !== null);
  const coachRatios = snapshots
    .map((snapshot) => snapshot.activeCoachRatio)
    .filter((rate): rate is number => rate !== null);
  const healthScores = snapshots
    .map((snapshot) => snapshot.operationalHealthScore)
    .filter((score): score is number => score !== null);

  const kpi: MultiAcademyOperationsBenchmarkKpi = {
    academyCount: snapshots.length,
    avgAttendanceRatePct: roundAvg(attendanceRates),
    avgSessionOperationRate: roundAvg(sessionRates),
    avgUnrecordedRatePct: roundAvg(unrecordedRates),
    avgAtRiskPlayerPct: roundAvg(atRiskRates),
    avgActiveCoachRatio: roundAvg(coachRatios),
    avgOperationalHealthScore: roundAvg(healthScores),
  };

  const digest = buildOperationsDigest(kpi, rows);
  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 아카데미 운영 비교 · 건전성 순위`
      : "다중 아카데미 운영 벤치마크는 2개 이상 운영 시 의미가 있습니다";

  return {
    headline: "Multi Academy Operations Benchmark",
    subline,
    kpi,
    academies: rows,
    digest,
    isEmpty: snapshots.length < 2,
  };
}
