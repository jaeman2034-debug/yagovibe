/**
 * Phase A A2-6 — Academy attendance read DTOs.
 */

export const ACADEMY_ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AcademyAttendanceStatus = (typeof ACADEMY_ATTENDANCE_STATUSES)[number];

export type AcademyAttendanceRow = {
  targetUid: string;
  sessionId: string;
  teamId: string;
  status: AcademyAttendanceStatus;
  markedBy?: string;
  markedAt?: unknown;
  note?: string | null;
};
