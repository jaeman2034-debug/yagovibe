import type { FederationIntelligenceSnapshot } from "@/lib/ai-growth/federationDashboardTypes";
import type {
  FederationRiskDigest,
  FederationRiskIntelligenceResult,
  FederationRiskKpi,
  FederationRiskRow,
} from "@/lib/ai-growth/federationRiskIntelligenceTypes";
import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function aggregateAcademyRiskRates(academies: AcademyIntelligenceSnapshot[]) {
  const atRiskRates = academies
    .map((snapshot) => snapshot.atRiskPlayerPct)
    .filter((rate): rate is number => rate !== null);
  const lowAttendanceRates = academies
    .map((snapshot) => snapshot.lowAttendanceSessionPct)
    .filter((rate): rate is number => rate !== null);
  const unrecordedRates = academies
    .map((snapshot) => snapshot.unrecordedSessionPct)
    .filter((rate): rate is number => rate !== null);

  return {
    atRiskPlayerPct: roundAvg(atRiskRates),
    lowAttendanceSessionPct: roundAvg(lowAttendanceRates),
    unrecordedSessionPct: roundAvg(unrecordedRates),
  };
}

function buildRiskDigest(
  kpi: FederationRiskKpi,
  rows: FederationRiskRow[]
): FederationRiskDigest {
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
    summaryLines.push(`최고 위험 ${highestRisk.federationName} ${highestRisk.atRiskPlayerPct}%`);
  }

  return {
    headline: "연맹 위험 비교",
    summaryLines: summaryLines.length > 0 ? summaryLines : ["위험 비교 데이터 대기 중"],
  };
}

function buildEmptyFederationRiskIntelligence(): FederationRiskIntelligenceResult {
  return {
    headline: "Federation Risk Intelligence",
    subline: "연맹 소속 아카데미 또는 연맹 관리 권한이 필요합니다",
    kpi: {
      federationCount: 0,
      avgAtRiskPlayerPct: null,
      avgLowAttendanceSessionPct: null,
      avgUnrecordedSessionPct: null,
    },
    federations: [],
    digest: {
      headline: "연맹 위험 비교",
      summaryLines: ["위험 비교 데이터 대기 중"],
    },
    isEmpty: true,
  };
}

/** Sprint H-1.2 — Federation snapshots → 위험 인텔리전스 비교 */
export function buildFederationRiskIntelligence(
  snapshots: FederationIntelligenceSnapshot[]
): FederationRiskIntelligenceResult {
  if (snapshots.length === 0) {
    return buildEmptyFederationRiskIntelligence();
  }

  const federations: FederationRiskRow[] = snapshots.map((snapshot) => {
    const rates = aggregateAcademyRiskRates(snapshot.academies);
    return {
      federationId: snapshot.federationId,
      federationName: snapshot.federationName,
      ...rates,
    };
  });

  const atRiskRates = federations
    .map((row) => row.atRiskPlayerPct)
    .filter((rate): rate is number => rate !== null);
  const lowAttendanceRates = federations
    .map((row) => row.lowAttendanceSessionPct)
    .filter((rate): rate is number => rate !== null);
  const unrecordedRates = federations
    .map((row) => row.unrecordedSessionPct)
    .filter((rate): rate is number => rate !== null);

  const kpi: FederationRiskKpi = {
    federationCount: snapshots.length,
    avgAtRiskPlayerPct: roundAvg(atRiskRates),
    avgLowAttendanceSessionPct: roundAvg(lowAttendanceRates),
    avgUnrecordedSessionPct: roundAvg(unrecordedRates),
  };

  const digest = buildRiskDigest(kpi, federations);
  const subline =
    snapshots.length >= 2
      ? `${snapshots.length}개 연맹 위험·운영 비교`
      : "다중 연맹 위험 비교는 2개 이상 관리 시 의미가 있습니다";

  return {
    headline: "Federation Risk Intelligence",
    subline,
    kpi,
    federations,
    digest,
    isEmpty: snapshots.length < 2,
  };
}
