import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";

export type SessionAttendanceAggregate = {
  sessionId: string;
  title: string;
  startsAtMs: number;
  status: AcademySessionStatus;
  rosterCount: number;
  recordedCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendedCount: number;
  attendanceRatePct: number | null;
};

const ATTENDED = new Set<AcademyAttendanceStatus>(["present", "late"]);

function ratePct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

/** 세션 + 출석 rows → 세션 집계 */
export function buildSessionAttendanceAggregate(input: {
  sessionId: string;
  title: string;
  startsAtMs: number;
  status: AcademySessionStatus;
  rosterCount: number;
  attendanceRows: Array<{ targetUid: string; status: AcademyAttendanceStatus }>;
  rosterPlayerIds: string[];
}): SessionAttendanceAggregate {
  const byPlayer = new Map(input.attendanceRows.map((row) => [row.targetUid, row.status]));
  let recordedCount = 0;
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  for (const playerId of input.rosterPlayerIds) {
    const status = byPlayer.get(playerId);
    if (!status) continue;
    recordedCount += 1;
    if (status === "present") presentCount += 1;
    if (status === "late") lateCount += 1;
    if (status === "absent") absentCount += 1;
    if (status === "excused") excusedCount += 1;
  }

  const attendedCount = presentCount + lateCount;

  return {
    sessionId: input.sessionId,
    title: input.title,
    startsAtMs: input.startsAtMs,
    status: input.status,
    rosterCount: input.rosterCount,
    recordedCount,
    presentCount,
    lateCount,
    absentCount,
    excusedCount,
    attendedCount,
    attendanceRatePct: ratePct(attendedCount, recordedCount),
  };
}

export function roundAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function isAttendedStatus(status: AcademyAttendanceStatus): boolean {
  return ATTENDED.has(status);
}
