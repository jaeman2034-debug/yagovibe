/**
 * teams/{teamId}/feeReminderStats/{feeId} — 마감 전 알림(fee_due_reminder) → 결제 전환 집계
 * (클라 `feeReminderConversionKpi` 와 동일 규칙: paidAt 직전 가장 늦은 알림 1건 + 7일 윈도)
 */
import * as admin from "firebase-admin";
import { FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const FEE_REMINDER_CONVERSION_WINDOW_DAYS = 7;
const WINDOW_MS = FEE_REMINDER_CONVERSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type FeeReminderConversionPhase = "d3" | "d1" | "d0";

export type FeeReminderPhaseKpi = {
  notifiedUnique: number;
  convertedUnique: number;
  conversionRatePct: number;
  avgHoursToPay: number | null;
};

export type FeeReminderStatsPayload = {
  schemaVersion: 1;
  teamId: string;
  feeId: string;
  conversionWindowDays: number;
  reminderDocCount: number;
  byPhase: Record<FeeReminderConversionPhase, FeeReminderPhaseKpi>;
  attributedWithinWindow: FeeReminderPhaseKpi;
};

type NotifRow = { uid: string; phase: FeeReminderConversionPhase; atMs: number };

type Attribution = {
  phase: FeeReminderConversionPhase;
  notifAtMs: number;
  paidMs: number;
};

function toMillis(raw: unknown): number | null {
  if (raw == null) return null;
  if (raw instanceof Timestamp) return raw.toMillis();
  if (typeof (raw as Timestamp).toMillis === "function") return (raw as Timestamp).toMillis();
  return null;
}

function resolvePhase(raw: unknown): FeeReminderConversionPhase {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "d3" || s === "d1" || s === "d0") return s;
  return "d1";
}

function minNotifMsByUidPhase(rows: NotifRow[]): Map<string, Map<FeeReminderConversionPhase, number>> {
  const out = new Map<string, Map<FeeReminderConversionPhase, number>>();
  for (const r of rows) {
    if (!out.has(r.uid)) out.set(r.uid, new Map());
    const m = out.get(r.uid)!;
    const prev = m.get(r.phase);
    m.set(r.phase, prev == null ? r.atMs : Math.min(prev, r.atMs));
  }
  return out;
}

function paymentPaidByUid(docs: QueryDocumentSnapshot[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const doc of docs) {
    const d = doc.data() as Record<string, unknown>;
    const status = String(d.status || "").trim().toLowerCase();
    if (status !== "paid") continue;
    const uid = String(d.userId || "").trim();
    if (!uid) continue;
    const paidMs = toMillis(d.paidAt);
    if (paidMs == null) continue;
    m.set(uid, paidMs);
  }
  return m;
}

/** paidAt 직전(가장 늦은) 마감 전 알림 1건; paidAt − 알림 ≤ 7일 일 때만 전환으로 인정 */
function buildAttribution(rows: NotifRow[], paidByUid: Map<string, number>): Map<string, Attribution | null> {
  const byUid = new Map<string, NotifRow[]>();
  for (const r of rows) {
    if (!byUid.has(r.uid)) byUid.set(r.uid, []);
    byUid.get(r.uid)!.push(r);
  }
  const out = new Map<string, Attribution | null>();

  for (const [uid, paidMs] of paidByUid) {
    const list = byUid.get(uid);
    if (!list || list.length === 0) {
      out.set(uid, null);
      continue;
    }
    const beforePay = list.filter((r) => r.atMs < paidMs).sort((a, b) => b.atMs - a.atMs);
    if (beforePay.length === 0) {
      out.set(uid, null);
      continue;
    }
    const best = beforePay[0];
    if (paidMs - best.atMs > WINDOW_MS) {
      out.set(uid, null);
      continue;
    }
    out.set(uid, { phase: best.phase, notifAtMs: best.atMs, paidMs });
  }
  return out;
}

function slicePhase(
  minByUidPhase: Map<string, Map<FeeReminderConversionPhase, number>>,
  attr: Map<string, Attribution | null>,
  phase: FeeReminderConversionPhase
): FeeReminderPhaseKpi {
  let notified = 0;
  let converted = 0;
  let sumHours = 0;

  for (const [uid, pmap] of minByUidPhase) {
    const phaseFirstMs = pmap.get(phase);
    if (phaseFirstMs == null) continue;
    notified++;
    const a = attr.get(uid);
    if (!a || a.phase !== phase) continue;
    converted++;
    sumHours += (a.paidMs - a.notifAtMs) / (1000 * 60 * 60);
  }

  const conversionRatePct =
    notified === 0 ? 0 : Math.round((converted / notified) * 1000) / 10;
  const avgHoursToPay = converted > 0 ? Math.round((sumHours / converted) * 10) / 10 : null;
  return { notifiedUnique: notified, convertedUnique: converted, conversionRatePct, avgHoursToPay };
}

function aggregateAttributed(
  rows: NotifRow[],
  attr: Map<string, Attribution | null>
): FeeReminderPhaseKpi {
  const notifiedUids = new Set(rows.map((r) => r.uid));
  let converted = 0;
  let sumHours = 0;
  for (const uid of notifiedUids) {
    const a = attr.get(uid);
    if (!a) continue;
    converted++;
    sumHours += (a.paidMs - a.notifAtMs) / (1000 * 60 * 60);
  }
  const notified = notifiedUids.size;
  const conversionRatePct =
    notified === 0 ? 0 : Math.round((converted / notified) * 1000) / 10;
  const avgHoursToPay = converted > 0 ? Math.round((sumHours / converted) * 10) / 10 : null;
  return { notifiedUnique: notified, convertedUnique: converted, conversionRatePct, avgHoursToPay };
}

export function computeFeeReminderStatsPayload(
  teamId: string,
  feeId: string,
  notifRows: NotifRow[],
  paymentDocs: QueryDocumentSnapshot[]
): FeeReminderStatsPayload {
  const minByUidPhase = minNotifMsByUidPhase(notifRows);
  const paidByUid = paymentPaidByUid(paymentDocs);
  const attr = buildAttribution(notifRows, paidByUid);

  const byPhase: Record<FeeReminderConversionPhase, FeeReminderPhaseKpi> = {
    d3: slicePhase(minByUidPhase, attr, "d3"),
    d1: slicePhase(minByUidPhase, attr, "d1"),
    d0: slicePhase(minByUidPhase, attr, "d0"),
  };
  const attributedWithinWindow = aggregateAttributed(notifRows, attr);

  return {
    schemaVersion: 1,
    teamId,
    feeId,
    conversionWindowDays: FEE_REMINDER_CONVERSION_WINDOW_DAYS,
    reminderDocCount: notifRows.length,
    byPhase,
    attributedWithinWindow,
  };
}

export async function rebuildFeeReminderStats(teamId: string, feeId: string): Promise<void> {
  const tid = String(teamId || "").trim();
  const fid = String(feeId || "").trim();
  if (!tid || !fid) return;

  const [notifSnap, paySnap] = await Promise.all([
    db
      .collection("notifications")
      .where("teamId", "==", tid)
      .where("feeId", "==", fid)
      .where("type", "==", "fee_due_reminder")
      .get(),
    db.collection("teams").doc(tid).collection("payments").where("feeId", "==", fid).get(),
  ]);

  const notifRows: NotifRow[] = [];
  for (const doc of notifSnap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const uid = String(d.targetUid || d.userId || "").trim();
    if (!uid) continue;
    const atMs = toMillis(d.createdAt);
    if (atMs == null) continue;
    notifRows.push({ uid, phase: resolvePhase(d.feeReminderPhase), atMs });
  }

  const payload = computeFeeReminderStatsPayload(tid, fid, notifRows, paySnap.docs);
  await db.doc(`teams/${tid}/feeReminderStats/${fid}`).set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logger.info("[rebuildFeeReminderStats] done", {
    teamId: tid,
    feeId: fid,
    reminderDocCount: payload.reminderDocCount,
  });
}
