/**
 * Phase A A2-6 — Academy session read DTOs (client read layer).
 */

export const ACADEMY_SESSION_STATUSES = ["scheduled", "open", "closed", "cancelled"] as const;
export type AcademySessionStatus = (typeof ACADEMY_SESSION_STATUSES)[number];

export type AcademySessionRow = {
  sessionId: string;
  teamId: string;
  title: string;
  startsAt: unknown;
  endsAt: unknown | null;
  status: AcademySessionStatus;
  createdBy: string;
  coachUid: string | null;
  notes: string | null;
  cancelledBy?: string;
  cancelledAt?: unknown;
};
