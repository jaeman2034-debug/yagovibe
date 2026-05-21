import type { FeeDueReminderNotifRow } from "./feeReminderConversionKpi";
import type { FeePayment } from "../types";
import { FEE_REMINDER_CONVERSION_WINDOW_DAYS } from "./feeReminderConversionKpi";

export type NonResponderFeeMember = {
  uid: string;
  /** 마지막 `fee_due_reminder` 시각(ms) */
  lastFeeDueReminderAtMs: number;
  /** 마지막 마감 전 알림 이후 경과 일수(일 단위 내림) */
  daysSinceLastFeeDueReminder: number;
};

function lastReminderMsByUid(rows: Pick<FeeDueReminderNotifRow, "uid" | "atMs">[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.uid, Math.max(m.get(r.uid) ?? 0, r.atMs));
  }
  return m;
}

/**
 * 마지막 `fee_due_reminder` 이후 `windowDays`가 지났는데도 미납(paid 아님)인 멤버.
 * — 서버 `nonResponderFeeReminderScheduler` 의 n2/n5 와 별개로 “장기 미반응” 목록용.
 */
export function listNonRespondersAfterFeeReminderWindow(
  reminderRows: Pick<FeeDueReminderNotifRow, "uid" | "atMs">[],
  payments: FeePayment[],
  nowMs: number,
  windowDays: number = FEE_REMINDER_CONVERSION_WINDOW_DAYS
): NonResponderFeeMember[] {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const lastByUid = lastReminderMsByUid(reminderRows);
  const payByUid = new Map(payments.map((p) => [p.uid, p]));
  const out: NonResponderFeeMember[] = [];

  for (const [uid, lastMs] of lastByUid) {
    const p = payByUid.get(uid);
    if (!p || p.status === "paid") continue;
    if (nowMs - lastMs <= windowMs) continue;
    out.push({
      uid,
      lastFeeDueReminderAtMs: lastMs,
      daysSinceLastFeeDueReminder: Math.floor((nowMs - lastMs) / (24 * 60 * 60 * 1000)),
    });
  }
  return out.sort((a, b) => b.daysSinceLastFeeDueReminder - a.daysSinceLastFeeDueReminder);
}

/**
 * 스케줄러와 동일: 마지막 `fee_due_reminder` 기준 정확히 2일째·5일째이고 아직 미납이면 n2/n5 후보.
 */
export function listNonResponderNudgeDayMatches(
  reminderRows: Pick<FeeDueReminderNotifRow, "uid" | "atMs">[],
  payments: FeePayment[],
  nowMs: number
): { uid: string; step: "n2" | "n5"; daysSinceLastFeeDueReminder: number }[] {
  const lastByUid = lastReminderMsByUid(reminderRows);
  const payByUid = new Map(payments.map((p) => [p.uid, p]));
  const out: { uid: string; step: "n2" | "n5"; daysSinceLastFeeDueReminder: number }[] = [];

  for (const [uid, lastMs] of lastByUid) {
    const p = payByUid.get(uid);
    if (!p || p.status === "paid") continue;
    const days = Math.floor((nowMs - lastMs) / (24 * 60 * 60 * 1000));
    const hist = p.nonResponderReminderHistory;
    if (days === 2 && !hist?.n2) out.push({ uid, step: "n2", daysSinceLastFeeDueReminder: days });
    else if (days === 5 && !hist?.n5) out.push({ uid, step: "n5", daysSinceLastFeeDueReminder: days });
  }
  return out;
}
