import type { Timestamp } from "firebase/firestore";
import type { FeePayment } from "../types";

export const FEE_REMINDER_CONVERSION_WINDOW_DAYS = 7;
const WINDOW_MS = FEE_REMINDER_CONVERSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type FeeReminderConversionPhase = "d3" | "d1" | "d0";

export type FeeReminderPhaseConversion = {
  notifiedUnique: number;
  convertedUnique: number;
  conversionRatePct: number;
  avgHoursToPay: number | null;
};

export type FeeReminderConversionKpiResult = {
  byPhase: Record<FeeReminderConversionPhase, FeeReminderPhaseConversion>;
  /** paidAt 직전(가장 늦은) 마감 전 알림 기준, 7일 이내 결제만 전환 */
  attributedWithinWindow: FeeReminderPhaseConversion;
};

export type FeeDueReminderNotifRow = {
  uid: string;
  phase: FeeReminderConversionPhase;
  atMs: number;
};

type Attribution = {
  phase: FeeReminderConversionPhase;
  notifAtMs: number;
  paidMs: number;
};

function toMillis(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof (raw as Timestamp).toMillis === "function") {
    return (raw as Timestamp).toMillis();
  }
  return null;
}

/** 스케줄러 `feeReminderPhase` 없음 → 예전 D-1 알림으로 간주 */
export function resolveFeeReminderPhase(raw: unknown): FeeReminderConversionPhase {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "d3" || s === "d1" || s === "d0") return s;
  return "d1";
}

function minNotifMsByUidPhase(rows: FeeDueReminderNotifRow[]): Map<string, Map<FeeReminderConversionPhase, number>> {
  const out = new Map<string, Map<FeeReminderConversionPhase, number>>();
  for (const r of rows) {
    if (!out.has(r.uid)) out.set(r.uid, new Map());
    const m = out.get(r.uid)!;
    const prev = m.get(r.phase);
    m.set(r.phase, prev == null ? r.atMs : Math.min(prev, r.atMs));
  }
  return out;
}

function paymentPaidByUid(payments: FeePayment[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "paid") continue;
    const ms = toMillis(p.paidAt);
    if (ms == null) continue;
    m.set(p.uid, ms);
  }
  return m;
}

function buildAttribution(
  rows: FeeDueReminderNotifRow[],
  paidByUid: Map<string, number>
): Map<string, Attribution | null> {
  const byUid = new Map<string, FeeDueReminderNotifRow[]>();
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
): FeeReminderPhaseConversion {
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

  return {
    notifiedUnique: notified,
    convertedUnique: converted,
    conversionRatePct,
    avgHoursToPay,
  };
}

function aggregateAttributed(
  rows: FeeDueReminderNotifRow[],
  attr: Map<string, Attribution | null>
): FeeReminderPhaseConversion {
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

  return {
    notifiedUnique: notified,
    convertedUnique: converted,
    conversionRatePct,
    avgHoursToPay,
  };
}

/** `notifications` 행 + `payments` 와 조인 (서버 `feeReminderStats` 와 동일 규칙) */
export function computeFeeReminderConversionKpi(
  rows: FeeDueReminderNotifRow[],
  payments: FeePayment[]
): FeeReminderConversionKpiResult {
  const minByUidPhase = minNotifMsByUidPhase(rows);
  const paidByUid = paymentPaidByUid(payments);
  const attr = buildAttribution(rows, paidByUid);

  const byPhase: Record<FeeReminderConversionPhase, FeeReminderPhaseConversion> = {
    d3: slicePhase(minByUidPhase, attr, "d3"),
    d1: slicePhase(minByUidPhase, attr, "d1"),
    d0: slicePhase(minByUidPhase, attr, "d0"),
  };
  const attributedWithinWindow = aggregateAttributed(rows, attr);

  return { byPhase, attributedWithinWindow };
}

/** Firestore `teams/.../feeReminderStats/{feeId}` 서버 집계 문서 */
export type FeeReminderStatsDoc = {
  schemaVersion?: number;
  conversionWindowDays?: number;
  byPhase?: Record<FeeReminderConversionPhase, FeeReminderPhaseConversion>;
  attributedWithinWindow?: FeeReminderPhaseConversion;
};

export function parseFeeReminderStatsDoc(data: Record<string, unknown> | undefined): FeeReminderConversionKpiResult | null {
  if (!data || data.schemaVersion !== 1) return null;
  const byPhase = data.byPhase as FeeReminderConversionKpiResult["byPhase"] | undefined;
  const attributedWithinWindow = data.attributedWithinWindow as
    | FeeReminderConversionKpiResult["attributedWithinWindow"]
    | undefined;
  if (!byPhase || !attributedWithinWindow) return null;
  return { byPhase, attributedWithinWindow };
}
