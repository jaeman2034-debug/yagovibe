import type {
  AcademySessionAiSummary,
  AcademySessionDigest,
  AcademySessionIntelligenceResult,
  AcademySessionKpi,
  AcademySessionRowSummary,
  AcademySessionStatusSummary,
} from "@/lib/ai-growth/academySessionIntelligenceTypes";
import {
  buildSessionAttendanceAggregate,
  roundAvg,
  type SessionAttendanceAggregate,
} from "@/lib/ai-growth/academySessionMetrics";
import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";

export const ACADEMY_SESSION_LOW_ATTENDANCE_THRESHOLD_PCT = 70;

export type AcademySessionIntelligenceInput = {
  academyName: string;
  rosterPlayerIds: string[];
  sessions: Array<{
    sessionId: string;
    title: string;
    startsAtMs: number;
    status: AcademySessionStatus;
    coachUid: string | null;
    attendanceRows: Array<{ targetUid: string; status: AcademyAttendanceStatus }>;
  }>;
};

function formatSessionWeekLabel(startsAtMs: number): string {
  if (!startsAtMs) return "일정 미정";
  const d = new Date(startsAtMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function statusLabel(status: AcademySessionStatus): string {
  switch (status) {
    case "scheduled":
      return "예정";
    case "open":
      return "진행";
    case "closed":
      return "완료";
    case "cancelled":
      return "취소";
  }
}

function buildStatusSummary(sessions: SessionAttendanceAggregate[]): AcademySessionStatusSummary {
  const summary: AcademySessionStatusSummary = {
    scheduled: 0,
    open: 0,
    closed: 0,
    cancelled: 0,
  };
  for (const session of sessions) {
    summary[session.status] += 1;
  }
  return summary;
}

function buildSessionKpi(sessions: SessionAttendanceAggregate[]): AcademySessionKpi {
  const active = sessions.filter((session) => session.status !== "cancelled");
  const rates = active
    .map((session) => session.attendanceRatePct)
    .filter((rate): rate is number => rate !== null);

  return {
    totalSessions: sessions.length,
    activeSessions: active.length,
    cancelledSessions: sessions.filter((session) => session.status === "cancelled").length,
    avgSessionAttendanceRatePct: roundAvg(rates),
    lowAttendanceSessionCount: active.filter(
      (session) =>
        session.attendanceRatePct !== null &&
        session.attendanceRatePct < ACADEMY_SESSION_LOW_ATTENDANCE_THRESHOLD_PCT
    ).length,
    unrecordedSessionCount: active.filter((session) => session.recordedCount === 0).length,
  };
}

function buildRecentSessions(sessions: SessionAttendanceAggregate[]): AcademySessionRowSummary[] {
  return sessions
    .filter((session) => session.status !== "cancelled")
    .slice(0, 5)
    .map((session) => ({
      sessionId: session.sessionId,
      title: session.title.trim() || "훈련 세션",
      weekLabel: formatSessionWeekLabel(session.startsAtMs),
      status: statusLabel(session.status),
      attendanceRatePct: session.attendanceRatePct,
      recordedCount: session.recordedCount,
      rosterCount: session.rosterCount,
    }));
}

function buildSessionDigest(
  kpi: AcademySessionKpi,
  statusSummary: AcademySessionStatusSummary
): AcademySessionDigest {
  const summaryLines: string[] = [];

  if (kpi.totalSessions > 0) {
    summaryLines.push(`최근 세션 ${kpi.totalSessions}회`);
  }
  if (kpi.avgSessionAttendanceRatePct !== null) {
    summaryLines.push(`평균 세션 출석률 ${kpi.avgSessionAttendanceRatePct}%`);
  }
  if (kpi.lowAttendanceSessionCount > 0) {
    summaryLines.push(`저출석 세션 ${kpi.lowAttendanceSessionCount}회`);
  }
  if (statusSummary.cancelled > 0) {
    summaryLines.push(`취소 ${statusSummary.cancelled}회`);
  }
  if (kpi.unrecordedSessionCount > 0) {
    summaryLines.push(`출석 미기록 ${kpi.unrecordedSessionCount}회`);
  }

  return {
    headline: "세션 운영 요약",
    summaryLines:
      summaryLines.length > 0 ? summaryLines : ["세션 기록 대기 중"],
  };
}

function buildSessionAiSummary(
  academyName: string,
  kpi: AcademySessionKpi,
  digest: AcademySessionDigest,
  recentSessions: AcademySessionRowSummary[]
): AcademySessionAiSummary {
  const name = academyName.trim() || "아카데미";
  const paragraphs: string[] = [];

  if (kpi.totalSessions === 0) {
    paragraphs.push(
      `${name} 아카데미의 최근 세션 기록이 없습니다.`,
      "훈련 세션을 생성하고 출석을 기록하면 세션 인텔리전스가 생성됩니다."
    );
    return { paragraphs, fullText: paragraphs.join("\n\n") };
  }

  paragraphs.push(`${name} 아카데미는 최근 ${kpi.totalSessions}개 세션을 운영했습니다.`);

  if (kpi.avgSessionAttendanceRatePct !== null) {
    paragraphs.push(`세션 평균 출석률은 ${kpi.avgSessionAttendanceRatePct}%입니다.`);
  }

  if (kpi.lowAttendanceSessionCount > 0) {
    paragraphs.push(
      `출석률 ${ACADEMY_SESSION_LOW_ATTENDANCE_THRESHOLD_PCT}% 미만 세션이 ${kpi.lowAttendanceSessionCount}회 있습니다.`
    );
  }

  if (kpi.unrecordedSessionCount > 0) {
    paragraphs.push(`출석 미기록 세션 ${kpi.unrecordedSessionCount}회 — 출석 입력이 필요합니다.`);
  }

  const latest = recentSessions[0];
  if (latest) {
    paragraphs.push(
      `최근 세션 "${latest.title}"(${latest.weekLabel}) — ${latest.status}${
        latest.attendanceRatePct !== null ? ` · 출석률 ${latest.attendanceRatePct}%` : ""
      }.`
    );
  }

  if (digest.summaryLines.length > 0) {
    paragraphs.push(digest.summaryLines.join(" · "));
  }

  return { paragraphs, fullText: paragraphs.join("\n\n") };
}

function buildEmptySessionIntelligence(academyName: string): AcademySessionIntelligenceResult {
  const kpi: AcademySessionKpi = {
    totalSessions: 0,
    activeSessions: 0,
    cancelledSessions: 0,
    avgSessionAttendanceRatePct: null,
    lowAttendanceSessionCount: 0,
    unrecordedSessionCount: 0,
  };
  const digest = buildSessionDigest(kpi, {
    scheduled: 0,
    open: 0,
    closed: 0,
    cancelled: 0,
  });
  const aiSummary = buildSessionAiSummary(academyName, kpi, digest, []);

  return {
    headline: "세션 인텔리전스",
    kpi,
    statusSummary: { scheduled: 0, open: 0, closed: 0, cancelled: 0 },
    recentSessions: [],
    digest,
    aiSummary,
    isEmpty: true,
  };
}

/** Sprint F-2.2-a — sessions + attendance → 아카데미 세션 인텔리전스 */
export function buildAcademySessionIntelligence(
  input: AcademySessionIntelligenceInput
): AcademySessionIntelligenceResult {
  if (input.sessions.length === 0) {
    return buildEmptySessionIntelligence(input.academyName);
  }

  const aggregates = input.sessions
    .map((session) =>
      buildSessionAttendanceAggregate({
        sessionId: session.sessionId,
        title: session.title,
        startsAtMs: session.startsAtMs,
        status: session.status,
        rosterCount: input.rosterPlayerIds.length,
        attendanceRows: session.attendanceRows,
        rosterPlayerIds: input.rosterPlayerIds,
      })
    )
    .sort((a, b) => b.startsAtMs - a.startsAtMs);

  const statusSummary = buildStatusSummary(aggregates);
  const kpi = buildSessionKpi(aggregates);
  const recentSessions = buildRecentSessions(aggregates);
  const digest = buildSessionDigest(kpi, statusSummary);
  const aiSummary = buildSessionAiSummary(
    input.academyName,
    kpi,
    digest,
    recentSessions
  );

  return {
    headline: "세션 인텔리전스",
    kpi,
    statusSummary,
    recentSessions,
    digest,
    aiSummary,
    isEmpty: false,
  };
}
