import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import type {
  MultiAcademyRiskDigest,
  MultiAcademyRiskIntelligenceResult,
  MultiAcademyRiskKpi,
  MultiAcademyRiskRow,
} from "@/lib/ai-growth/multiAcademyRiskIntelligenceTypes";

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildRiskDigest(
  kpi: MultiAcademyRiskKpi,
  rows: MultiAcademyRiskRow[]
): MultiAcademyRiskDigest {
  const summaryLines: string[] = [];

  if (kpi.avgAtRiskPlayerPct !== null) {
    summaryLines.push(`평균 위험 선수 ${kpi.avgAtRiskPlayerPct}%`);
  }
  if (kpi.avgLowAttendanceSessionPct !== null) {
    summaryLines.push(`평균 저출석 ${kpi.avgLowAttendanceSessionPct}%`);
  }
  if (kpi.avgUnrecordedSessionPct !== null) {
    summaryLines.push(`평균 미기록 ${kpi.avgUnrecordedSessionPct}%`);
  }

  const highestRisk = [...rows]
    .filter((row) => row.atRiskPlayerPct !== null)
    .sort((a, b) => (b.atRiskPlayerPct ?? 0) - (a.atRiskPlayerPct ?? 0))[0];

  if (highestRisk) {
    summaryLines.push(`최고 위험 ${highestRisk.teamName} ${highestRisk.atRiskPlayerPct}%`);
  }

  return {
    headline: "아카데미 위험 비교",
    summaryLines: summaryLines.length > 0 ? summaryLines : ["위험 비교 데이터 대기 중"],
  };
}

function buildEmptyRiskIntelligence(): MultiAcademyRiskIntelligenceResult {
  return {
    headline: "Multi Academy Risk Intelligence",
    subline: "운영 중인 아카데미가 없습니다",
    kpi: {
      academyCount: 0,
      avgAtRiskPlayerPct: null,
      avgLowAttendanceSessionPct: null,
      avgUnrecordedSessionPct: null,
    },
    academies: [],
    digest: {
      headline: "아카데미 위험 비교",
      summaryLines: ["위험 비교 데이터 대기 중"],
    },
    isEmpty: true,
  };
}

/** Sprint G-1.2 — 아카데미 스냅샷 → 위험 인텔리전스 비교 */
export function buildMultiAcademyRiskIntelligence(
  snapshots: AcademyIntelligenceSnapshot[]
): MultiAcademyRiskIntelligenceResult {
  if (snapshots.length === 0) {
    return buildEmptyRiskIntelligence();
  }

  const academies: MultiAcademyRiskRow[] = snapshots.map((snapshot) => ({
    teamId: snapshot.teamId,
    teamName: snapshot.teamName,
    atRiskPlayerPct: snapshot.atRiskPlayerPct,
    lowAttendanceSessionPct: snapshot.lowAttendanceSessionPct,
    unrecordedSessionPct: snapshot.unrecordedSessionPct,
  }));

  const atRiskRates = snapshots
    .map((snapshot) => snapshot.atRiskPlayerPct)
    .filter((rate): rate is number => rate !== null);
  const lowAttendanceRates = snapshots
    .map((snapshot) => snapshot.lowAttendanceSessionPct)
    .filter((rate): rate is number => rate !== null);
  const unrecordedRates = snapshots
    .map((snapshot) => snapshot.unrecordedSessionPct)
    .filter((rate): rate is number => rate !== null);

  const kpi: MultiAcademyRiskKpi = {
    academyCount: snapshots.length,
    avgAtRiskPlayerPct: roundAvg(atRiskRates),
    avgLowAttendanceSessionPct: roundAvg(lowAttendanceRates),
    avgUnrecordedSessionPct: roundAvg(unrecordedRates),
  };

  const digest = buildRiskDigest(kpi, academies);
  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 아카데미 위험·운영 비교`
      : "다중 아카데미 위험 비교는 2개 이상 운영 시 의미가 있습니다";

  return {
    headline: "Multi Academy Risk Intelligence",
    subline,
    kpi,
    academies,
    digest,
    isEmpty: snapshots.length < 2,
  };
}
