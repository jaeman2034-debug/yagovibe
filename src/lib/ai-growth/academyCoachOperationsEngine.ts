import type {
  AcademyCoachOperationsAiSummary,
  AcademyCoachOperationsDigest,
  AcademyCoachOperationsKpi,
  AcademyCoachOperationsResult,
  AcademyCoachOperationsRow,
} from "@/lib/ai-growth/academyCoachOperationsTypes";
import type { AcademyAttendanceRiskPlayer } from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";
import type { AcademyCoachRef } from "@/lib/ai-growth/academyCoachPerformanceEngine";
import {
  buildSessionAttendanceAggregate,
  roundAvg,
} from "@/lib/ai-growth/academySessionMetrics";
import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";
import type {
  TeamGrowthIntelligenceResult,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

export type AcademyCoachOperationsInput = {
  academyName: string;
  coaches: AcademyCoachRef[];
  rosterPlayerIds: string[];
  sessions: Array<{
    sessionId: string;
    title: string;
    startsAtMs: number;
    status: AcademySessionStatus;
    coachUid: string | null;
    attendanceRows: Array<{ targetUid: string; status: AcademyAttendanceStatus }>;
  }>;
  attendanceAtRiskPlayers: AcademyAttendanceRiskPlayer[];
  teamIntelligence: TeamGrowthIntelligenceResult | null;
};

function formatCoachLabel(name: string): string {
  const trimmed = name.trim() || "담당 코치";
  return trimmed.endsWith("코치") ? trimmed : `${trimmed} 코치`;
}

function resolveCoachRefs(coaches: AcademyCoachRef[]): AcademyCoachRef[] {
  if (coaches.length > 0) return coaches;
  return [{ coachId: "default-coach", coachName: "담당 코치" }];
}

function resolveSessionCoachId(
  coachUid: string | null,
  coaches: AcademyCoachRef[]
): string {
  if (coachUid && coaches.some((coach) => coach.coachId === coachUid)) {
    return coachUid;
  }
  if (coaches.length === 1) return coaches[0]!.coachId;
  return coachUid ?? coaches[0]?.coachId ?? "default-coach";
}

function computeTeamRiskManagementRate(rows: TeamPlayerGrowthRow[]): number {
  const atRisk = rows.filter((row) => row.risks.length > 0);
  if (atRisk.length === 0) return 100;
  const managed = atRisk.filter((row) => row.recommendations.length > 0);
  return Math.round((managed.length / atRisk.length) * 100);
}

function computeAttendanceRiskManagementRate(
  atRiskPlayers: AcademyAttendanceRiskPlayer[]
): number {
  if (atRiskPlayers.length === 0) return 100;
  const managed = atRiskPlayers.filter((player) => player.recommendations.length > 0);
  return Math.round((managed.length / atRiskPlayers.length) * 100);
}

function buildCoachOperationsRow(
  coach: AcademyCoachRef,
  sessionAggregates: ReturnType<typeof buildSessionAttendanceAggregate>[],
  assignedPlayers: TeamPlayerGrowthRow[],
  attendanceAtRisk: AcademyAttendanceRiskPlayer[]
): AcademyCoachOperationsRow {
  const activeSessions = sessionAggregates.filter((session) => session.status !== "cancelled");
  const recordedSessions = activeSessions.filter((session) => session.recordedCount > 0);
  const attendanceRates = activeSessions
    .map((session) => session.attendanceRatePct)
    .filter((rate): rate is number => rate !== null);

  const teamRiskRate = computeTeamRiskManagementRate(assignedPlayers);
  const attendanceRiskRate = computeAttendanceRiskManagementRate(attendanceAtRisk);
  const atRiskManagementRate = Math.round((teamRiskRate + attendanceRiskRate) / 2);

  const atRiskIds = new Set([
    ...assignedPlayers.filter((row) => row.risks.length > 0).map((row) => row.playerId),
    ...attendanceAtRisk.map((player) => player.playerId),
  ]);

  return {
    coachId: coach.coachId,
    coachLabel: formatCoachLabel(coach.coachName),
    sessionCount: activeSessions.length,
    attendanceManagementRate:
      activeSessions.length > 0
        ? Math.round((recordedSessions.length / activeSessions.length) * 100)
        : 0,
    avgSessionAttendanceRatePct: roundAvg(attendanceRates),
    atRiskPlayerCount: atRiskIds.size,
    atRiskManagementRate,
    unrecordedSessionCount: activeSessions.filter((session) => session.recordedCount === 0).length,
  };
}

function buildOperationsDigest(
  kpi: AcademyCoachOperationsKpi,
  coaches: AcademyCoachOperationsRow[]
): AcademyCoachOperationsDigest {
  const summaryLines: string[] = [];

  if (kpi.coachCount > 0) {
    summaryLines.push(`운영 코치 ${kpi.coachCount}명`);
  }
  if (kpi.totalSessions > 0) {
    summaryLines.push(`최근 세션 ${kpi.totalSessions}회`);
  }
  if (kpi.avgAttendanceManagementRate > 0) {
    summaryLines.push(`평균 출석 관리율 ${kpi.avgAttendanceManagementRate}%`);
  }
  const highRiskCoach = coaches.find((coach) => coach.atRiskPlayerCount > 0);
  if (highRiskCoach) {
    summaryLines.push(`위험 선수 관리 필요 ${highRiskCoach.atRiskPlayerCount}명`);
  }

  return {
    headline: "코치 운영 요약",
    summaryLines: summaryLines.length > 0 ? summaryLines : ["코치 운영 데이터 대기 중"],
  };
}

function buildOperationsAiSummary(
  academyName: string,
  kpi: AcademyCoachOperationsKpi,
  coaches: AcademyCoachOperationsRow[],
  digest: AcademyCoachOperationsDigest
): AcademyCoachOperationsAiSummary {
  const name = academyName.trim() || "아카데미";
  const paragraphs: string[] = [];

  if (kpi.totalSessions === 0 && kpi.coachCount === 0) {
    paragraphs.push(
      `${name} 아카데미의 코치 운영 데이터가 아직 없습니다.`,
      "세션 생성과 출석 기록 후 코치 운영 인텔리전스가 생성됩니다."
    );
    return { paragraphs, fullText: paragraphs.join("\n\n") };
  }

  paragraphs.push(`${name} 아카데미는 ${kpi.coachCount}명의 코치가 운영 중입니다.`);

  if (kpi.totalSessions > 0) {
    paragraphs.push(
      `최근 ${kpi.totalSessions}개 세션 기준 평균 출석 관리율은 ${kpi.avgAttendanceManagementRate}%입니다.`
    );
  }

  if (coaches.length === 1) {
    const coach = coaches[0]!;
    paragraphs.push(
      `${coach.coachLabel}는 세션 ${coach.sessionCount}회를 담당하며, 위험 선수 관리율은 ${coach.atRiskManagementRate}%입니다.`
    );
  }

  if (kpi.avgAtRiskManagementRate < 100) {
    paragraphs.push("일부 위험 선수에 대한 코치 후속 조치가 필요합니다.");
  } else if (kpi.avgAtRiskManagementRate === 100) {
    paragraphs.push("현재 위험 선수 관리 계획이 모두 수립되어 있습니다.");
  }

  if (digest.summaryLines.length > 0) {
    paragraphs.push(digest.summaryLines.join(" · "));
  }

  return { paragraphs, fullText: paragraphs.join("\n\n") };
}

function buildEmptyCoachOperations(
  academyName: string,
  coaches: AcademyCoachRef[]
): AcademyCoachOperationsResult {
  const coachRefs = resolveCoachRefs(coaches);
  const coachRows = coachRefs.map((coach) =>
    buildCoachOperationsRow(coach, [], [], [])
  );
  const kpi: AcademyCoachOperationsKpi = {
    coachCount: coachRefs.length,
    totalSessions: 0,
    avgAttendanceManagementRate: 0,
    avgAtRiskManagementRate: 100,
  };
  const digest = buildOperationsDigest(kpi, coachRows);
  const aiSummary = buildOperationsAiSummary(academyName, kpi, coachRows, digest);

  return {
    headline: "코치 운영 인텔리전스",
    kpi,
    coaches: coachRows,
    digest,
    aiSummary,
    isEmpty: true,
  };
}

/** Sprint F-2.3 — sessions + attendance + team risk → 코치 운영 인텔리전스 */
export function buildAcademyCoachOperations(
  input: AcademyCoachOperationsInput
): AcademyCoachOperationsResult {
  const coachRefs = resolveCoachRefs(input.coaches);
  const rosterCount = input.rosterPlayerIds.length;

  if (input.sessions.length === 0 && rosterCount === 0) {
    return buildEmptyCoachOperations(input.academyName, coachRefs);
  }

  const sessionAggregates = input.sessions.map((session) =>
    buildSessionAttendanceAggregate({
      sessionId: session.sessionId,
      title: session.title,
      startsAtMs: session.startsAtMs,
      status: session.status,
      rosterCount,
      attendanceRows: session.attendanceRows,
      rosterPlayerIds: input.rosterPlayerIds,
    })
  );

  const sessionsByCoach = new Map<string, typeof sessionAggregates>();
  for (const aggregate of sessionAggregates) {
    const session = input.sessions.find((row) => row.sessionId === aggregate.sessionId);
    const coachId = resolveSessionCoachId(session?.coachUid ?? null, coachRefs);
    const list = sessionsByCoach.get(coachId) ?? [];
    list.push(aggregate);
    sessionsByCoach.set(coachId, list);
  }

  const teamPlayers = input.teamIntelligence?.players ?? [];
  const attendanceAtRisk = input.attendanceAtRiskPlayers;

  const coachRows = coachRefs.map((coach) =>
    buildCoachOperationsRow(
      coach,
      sessionsByCoach.get(coach.coachId) ?? [],
      teamPlayers,
      attendanceAtRisk
    )
  );

  const kpi: AcademyCoachOperationsKpi = {
    coachCount: coachRefs.length,
    totalSessions: sessionAggregates.filter((session) => session.status !== "cancelled").length,
    avgAttendanceManagementRate:
      coachRows.length > 0
        ? Math.round(
            coachRows.reduce((sum, row) => sum + row.attendanceManagementRate, 0) /
              coachRows.length
          )
        : 0,
    avgAtRiskManagementRate:
      coachRows.length > 0
        ? Math.round(
            coachRows.reduce((sum, row) => sum + row.atRiskManagementRate, 0) / coachRows.length
          )
        : 100,
  };

  const digest = buildOperationsDigest(kpi, coachRows);
  const aiSummary = buildOperationsAiSummary(input.academyName, kpi, coachRows, digest);

  return {
    headline: "코치 운영 인텔리전스",
    kpi,
    coaches: coachRows,
    digest,
    aiSummary,
    isEmpty: kpi.totalSessions === 0,
  };
}
