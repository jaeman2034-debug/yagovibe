import type {
  AcademyCoachPerformanceAiSummary,
  AcademyCoachPerformanceKpi,
  AcademyCoachPerformanceResult,
  AcademyCoachPerformanceRow,
  AcademyCoachingImpact,
} from "@/lib/ai-growth/academyCoachPerformanceTypes";
import type {
  TeamGrowthIntelligenceResult,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

export type AcademyCoachRef = {
  coachId: string;
  coachName: string;
};

export type AcademyCoachPerformanceInput = {
  academyName: string;
  coaches: AcademyCoachRef[];
  teamIntelligence: TeamGrowthIntelligenceResult;
};

function roundAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatCoachLabel(name: string): string {
  const trimmed = name.trim() || "담당 코치";
  return trimmed.endsWith("코치") ? trimmed : `${trimmed} 코치`;
}

function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function aggregateGrowthRate(rows: TeamPlayerGrowthRow[]): number | null {
  const deltas = rows
    .map((row) => row.avatar.weeklyDeltaOvr)
    .filter((value): value is number => typeof value === "number");
  if (deltas.length === 0) return null;
  return Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length);
}

function countBadges(rows: TeamPlayerGrowthRow[]): number {
  return rows.reduce((sum, row) => sum + (row.avatar.badges?.length ?? 0), 0);
}

function computeRiskManagementRate(rows: TeamPlayerGrowthRow[]): number {
  const atRisk = rows.filter((row) => row.risks.length > 0);
  if (atRisk.length === 0) return 100;
  const managed = atRisk.filter((row) => row.recommendations.length > 0);
  return Math.round((managed.length / atRisk.length) * 100);
}

function buildCoachRow(
  coach: AcademyCoachRef,
  assignedRows: TeamPlayerGrowthRow[]
): AcademyCoachPerformanceRow {
  const avatars = assignedRows.map((row) => row.avatar);
  return {
    coachId: coach.coachId,
    coachName: coach.coachName,
    coachLabel: formatCoachLabel(coach.coachName),
    playerCount: assignedRows.length,
    avgOvr: roundAvg(avatars.map((avatar) => avatar.ovr)),
    avgGrowthRate: aggregateGrowthRate(assignedRows),
    atRiskCount: assignedRows.filter((row) => row.risks.length > 0).length,
    riskManagementRate: computeRiskManagementRate(assignedRows),
    badgeCount: countBadges(assignedRows),
    assignedPlayerNames: assignedRows.map((row) => row.playerName),
  };
}

function buildCoachingImpact(
  players: TeamPlayerGrowthRow[],
  atRiskCount: number
): AcademyCoachingImpact {
  return {
    recoveryRiskCount: players.filter((player) =>
      player.risks.some((risk) => risk.type === "RECOVERY_LOW")
    ).length,
    declineCount: players.filter((player) =>
      player.risks.some((risk) => risk.type === "DECLINE")
    ).length,
    needsFocusCount: atRiskCount,
  };
}

function buildAcademyCoachAiSummary(
  academyName: string,
  kpi: AcademyCoachPerformanceKpi,
  coaches: AcademyCoachPerformanceRow[],
  impact: AcademyCoachingImpact,
  focusTraining: string | null
): AcademyCoachPerformanceAiSummary {
  const name = academyName.trim() || "아카데미";
  const paragraphs: string[] = [];

  paragraphs.push(
    `${name}은(는) 현재 ${kpi.playerCount}명의 선수를 추적 중입니다.`
  );

  if (coaches.length === 1) {
    const coach = coaches[0]!;
    const players = coach.assignedPlayerNames.join(", ") || "담당 선수 없음";
    paragraphs.push(`${coach.coachLabel}는 ${players} 선수를 담당하고 있습니다.`);
  } else if (coaches.length > 1) {
    paragraphs.push(`${coaches.length}명의 코치가 아카데미 선수를 담당하고 있습니다.`);
  }

  const growthHint =
    kpi.avgGrowthRate !== null ? formatSignedDelta(kpi.avgGrowthRate) : "변화 없음";
  paragraphs.push(
    `현재 평균 OVR은 ${kpi.avgOvr}이며, 평균 성장률은 ${growthHint}입니다.`
  );

  if (impact.recoveryRiskCount > 0) {
    paragraphs.push("Recovery 관리가 주요 과제입니다.");
  } else if (impact.declineCount > 0) {
    paragraphs.push("성장 하락 선수에 대한 개별 코칭이 필요합니다.");
  } else if (impact.needsFocusCount === 0) {
    paragraphs.push("즉시 대응이 필요한 위험 선수는 없습니다.");
  }

  if (focusTraining) {
    paragraphs.push(`다음 주에는 ${focusTraining} 중심 훈련이 권장됩니다.`);
  }

  const fullText = paragraphs.join("\n\n");
  return { paragraphs, fullText };
}

function resolveCoachRefs(coaches: AcademyCoachRef[]): AcademyCoachRef[] {
  if (coaches.length > 0) return coaches;
  return [{ coachId: "default-coach", coachName: "담당 코치" }];
}

/** Sprint F-1.3 — E-1/E-2 + D-5 Risk → 아카데미 코치 성과 롤업 */
export function buildAcademyCoachPerformance(
  input: AcademyCoachPerformanceInput
): AcademyCoachPerformanceResult | null {
  const { teamIntelligence } = input;
  const { snapshot, players, atRiskPlayers } = teamIntelligence;

  if (snapshot.trackedCount === 0 || players.length === 0) return null;

  const coachRefs = resolveCoachRefs(input.coaches);
  const coachRows = coachRefs.map((coach) => buildCoachRow(coach, players));

  const kpi: AcademyCoachPerformanceKpi = {
    playerCount: snapshot.trackedCount,
    avgOvr: snapshot.avgOvr,
    avgGrowthRate: aggregateGrowthRate(players),
    riskManagementRate: computeRiskManagementRate(players),
    badgeCount: countBadges(players),
  };

  const impact = buildCoachingImpact(players, atRiskPlayers.length);
  const focusTraining = teamIntelligence.weeklyDigest?.focusTraining ?? null;
  const summary = buildAcademyCoachAiSummary(
    input.academyName,
    kpi,
    coachRows,
    impact,
    focusTraining
  );

  return {
    headline: "코치 성과",
    kpi,
    coaches: coachRows,
    impact,
    summary,
  };
}
