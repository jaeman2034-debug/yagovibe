import type { AcademySessionRow } from "@/lib/academy/academySessionRead";
import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";

/** P2 — 진행 → 예정 → 마감 → 취소 */
export const SESSION_STATUS_SORT_ORDER: Record<AcademySessionStatus, number> = {
  open: 0,
  scheduled: 1,
  closed: 2,
  cancelled: 3,
};

export function sessionStartsAtMs(value: unknown): number {
  if (!value) return 0;
  const d =
    typeof value === "object" && value !== null && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value));
  const ms = d.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function compareAcademySessions(a: AcademySessionRow, b: AcademySessionRow): number {
  const byStatus = SESSION_STATUS_SORT_ORDER[a.status] - SESSION_STATUS_SORT_ORDER[b.status];
  if (byStatus !== 0) return byStatus;
  return sessionStartsAtMs(b.startsAt) - sessionStartsAtMs(a.startsAt);
}

export function sortAcademySessions(sessions: AcademySessionRow[]): AcademySessionRow[] {
  return [...sessions].sort(compareAcademySessions);
}

export function splitActiveAndCancelled(sessions: AcademySessionRow[]): {
  active: AcademySessionRow[];
  cancelled: AcademySessionRow[];
} {
  const active: AcademySessionRow[] = [];
  const cancelled: AcademySessionRow[] = [];
  for (const s of sessions) {
    if (s.status === "cancelled") cancelled.push(s);
    else active.push(s);
  }
  return {
    active: sortAcademySessions(active),
    cancelled: sortAcademySessions(cancelled),
  };
}
