import type { AcademyAttendanceKpi } from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";

export type PlayerSessionAttendance = {
  sessionId: string;
  startsAtMs: number;
  status: AcademyAttendanceStatus;
};

export type PlayerAttendanceMetrics = {
  playerId: string;
  playerName: string;
  recordedSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRatePct: number;
  lateRatePct: number;
  absentRatePct: number;
  consecutiveAbsences: number;
  recentDecline: boolean;
};

const ATTENDED = new Set<AcademyAttendanceStatus>(["present", "late"]);

function attendedCount(rows: PlayerSessionAttendance[]): number {
  return rows.filter((row) => ATTENDED.has(row.status)).length;
}

function ratePct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function computeConsecutiveAbsences(rows: PlayerSessionAttendance[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.status === "absent") count += 1;
    else break;
  }
  return count;
}

function detectRecentDecline(rows: PlayerSessionAttendance[]): boolean {
  if (rows.length < 8) return false;
  const recent = rows.slice(0, 4);
  const prior = rows.slice(4, 8);
  const recentRate = ratePct(attendedCount(recent), recent.length);
  const priorRate = ratePct(attendedCount(prior), prior.length);
  return priorRate - recentRate >= 15;
}

/** 세션별 출석 기록 → 선수 출석 지표 */
export function buildPlayerAttendanceMetrics(input: {
  playerId: string;
  playerName: string;
  sessions: PlayerSessionAttendance[];
}): PlayerAttendanceMetrics | null {
  const sessions = [...input.sessions].sort((a, b) => b.startsAtMs - a.startsAtMs);
  if (sessions.length === 0) return null;

  const presentCount = sessions.filter((row) => row.status === "present").length;
  const lateCount = sessions.filter((row) => row.status === "late").length;
  const absentCount = sessions.filter((row) => row.status === "absent").length;
  const excusedCount = sessions.filter((row) => row.status === "excused").length;
  const recorded = sessions.length;

  return {
    playerId: input.playerId,
    playerName: input.playerName,
    recordedSessions: recorded,
    presentCount,
    lateCount,
    absentCount,
    excusedCount,
    attendanceRatePct: ratePct(presentCount + lateCount, recorded),
    lateRatePct: ratePct(lateCount, recorded),
    absentRatePct: ratePct(absentCount, recorded),
    consecutiveAbsences: computeConsecutiveAbsences(sessions),
    recentDecline: detectRecentDecline(sessions),
  };
}

function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** 선수별 지표 → 아카데미 KPI */
export function buildAcademyAttendanceKpi(players: PlayerAttendanceMetrics[]): AcademyAttendanceKpi {
  return {
    avgAttendanceRatePct: roundAvg(players.map((player) => player.attendanceRatePct)),
    avgLateRatePct: roundAvg(players.map((player) => player.lateRatePct)),
    avgAbsentRatePct: roundAvg(players.map((player) => player.absentRatePct)),
    atRiskPlayerCount: 0,
    consecutiveAbsencePlayerCount: players.filter(
      (player) => player.consecutiveAbsences >= 3
    ).length,
    playersWithData: players.length,
  };
}
