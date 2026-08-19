/**
 * Sprint 3-2 — Ops KPI report (read-only aggregation over in-memory ops snapshots).
 * Extends Sprint 3-1 observability — no new dashboard product, no Firestore writes.
 */

import type { OpsNotificationRow, OpsReservationRow } from "@/lib/federation/opsCenterTypes";
import {
  buildTeamCreationTimeline,
  resolveOpsQueueMonitorStatus,
  type TeamObservabilityDoc,
} from "@/lib/federation/opsObservability";
import { resolveVenueOpsStage } from "@/lib/federation/venueReservationOpsStatus";

const SEOUL_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function seoulDayKey(d: Date | null | undefined, nowMs: number = Date.now()): string | null {
  if (!d) return null;
  return SEOUL_DAY.format(d);
}

export function listSeoulDayKeys(days: number, nowMs: number = Date.now()): string[] {
  const n = Math.max(1, Math.min(31, Math.floor(days)));
  const today = SEOUL_DAY.format(new Date(nowMs));
  const [y, m, d] = today.split("-").map((x) => Number(x));
  const out: string[] = [];
  // Korea has no DST — calendar walk via UTC noon on Y-M-D is stable for day keys
  for (let i = n - 1; i >= 0; i--) {
    const utcNoon = Date.UTC(y, m - 1, d - i, 12, 0, 0);
    out.push(SEOUL_DAY.format(new Date(utcNoon)));
  }
  return out;
}

export type OpsKpiDayBucket = {
  day: string;
  teamsCreated: number;
  brandingCompleted: number;
  brandingFailed: number;
  publicHomeReady: number;
  reservationsCreated: number;
  venueClaimed: number;
  venuePaymentConfirmed: number;
  venueFinalized: number;
  notifyTotal: number;
  notifyDryRun: number;
  notifyFailed: number;
  notifyRetrying: number;
};

export type OpsKpiTrendPoint = {
  day: string;
  brandingSuccessRate: number | null;
  publicHomeReadyRate: number | null;
  dryRunSuccessRate: number | null;
  reservations: number;
  teams: number;
  venueFinalizedRate: number | null;
};

export type OpsKpiAnomaly = {
  id: string;
  severity: "warning" | "critical";
  title: string;
  detail: string;
  metric: string;
  day: string;
  value: number;
  baseline: number;
};

export type OpsKpiReport = {
  rangeDays: number;
  days: OpsKpiDayBucket[];
  trends: OpsKpiTrendPoint[];
  week: {
    teamsCreated: number;
    reservationsCreated: number;
    brandingSuccessRate: number | null;
    publicHomeReadyRate: number | null;
    dryRunSuccessRate: number | null;
    venueFinalized: number;
    notifyFailed: number;
  };
  anomalies: OpsKpiAnomaly[];
};

function emptyBucket(day: string): OpsKpiDayBucket {
  return {
    day,
    teamsCreated: 0,
    brandingCompleted: 0,
    brandingFailed: 0,
    publicHomeReady: 0,
    reservationsCreated: 0,
    venueClaimed: 0,
    venuePaymentConfirmed: 0,
    venueFinalized: 0,
    notifyTotal: 0,
    notifyDryRun: 0,
    notifyFailed: 0,
    notifyRetrying: 0,
  };
}

function rate(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

export function buildOpsKpiDayBuckets(input: {
  notifications: OpsNotificationRow[];
  reservations: OpsReservationRow[];
  teams: TeamObservabilityDoc[];
  rangeDays?: number;
  nowMs?: number;
  liveSendEnabled?: boolean;
}): OpsKpiDayBucket[] {
  const nowMs = input.nowMs ?? Date.now();
  const rangeDays = input.rangeDays ?? 7;
  const keys = listSeoulDayKeys(rangeDays, nowMs);
  const map = new Map(keys.map((d) => [d, emptyBucket(d)]));

  for (const t of input.teams) {
    const day = seoulDayKey(t.createdAt ?? null, nowMs);
    if (!day || !map.has(day)) continue;
    const b = map.get(day)!;
    b.teamsCreated += 1;
    const steps = buildTeamCreationTimeline(t);
    if (steps.find((s) => s.id === "branding_completed")?.done) b.brandingCompleted += 1;
    else b.brandingFailed += 1;
    if (steps.find((s) => s.id === "public_home_ready")?.done) b.publicHomeReady += 1;
  }

  for (const r of input.reservations) {
    const day = seoulDayKey(r.createdAt, nowMs);
    if (!day || !map.has(day)) continue;
    const b = map.get(day)!;
    b.reservationsCreated += 1;
    const stage = resolveVenueOpsStage(r);
    if (stage === "CLAIMED" || stage === "PAYMENT_CONFIRMED" || stage === "FINALIZED") {
      b.venueClaimed += 1;
    }
    if (stage === "PAYMENT_CONFIRMED" || stage === "FINALIZED") b.venuePaymentConfirmed += 1;
    if (stage === "FINALIZED") b.venueFinalized += 1;
  }

  for (const n of input.notifications) {
    const day = seoulDayKey(n.createdAt, nowMs);
    if (!day || !map.has(day)) continue;
    const b = map.get(day)!;
    b.notifyTotal += 1;
    const st = resolveOpsQueueMonitorStatus(n, { liveSendEnabled: input.liveSendEnabled === true });
    if (st === "dry_run" || st === "succeeded") b.notifyDryRun += 1;
    if (st === "failed" || st === "dead_letter") b.notifyFailed += 1;
    if (st === "retrying") b.notifyRetrying += 1;
  }

  return keys.map((d) => map.get(d)!);
}

export function buildOpsKpiTrends(days: OpsKpiDayBucket[]): OpsKpiTrendPoint[] {
  return days.map((b) => ({
    day: b.day,
    brandingSuccessRate: rate(b.brandingCompleted, b.teamsCreated),
    publicHomeReadyRate: rate(b.publicHomeReady, b.teamsCreated),
    dryRunSuccessRate: rate(b.notifyDryRun, b.notifyTotal),
    reservations: b.reservationsCreated,
    teams: b.teamsCreated,
    venueFinalizedRate: rate(b.venueFinalized, b.reservationsCreated),
  }));
}

export function buildOpsKpiWeekSummary(days: OpsKpiDayBucket[]): OpsKpiReport["week"] {
  const weekDays = days.slice(-7);
  let teamsCreated = 0;
  let brandingCompleted = 0;
  let publicHomeReady = 0;
  let reservationsCreated = 0;
  let venueFinalized = 0;
  let notifyTotal = 0;
  let notifyDryRun = 0;
  let notifyFailed = 0;
  for (const b of weekDays) {
    teamsCreated += b.teamsCreated;
    brandingCompleted += b.brandingCompleted;
    publicHomeReady += b.publicHomeReady;
    reservationsCreated += b.reservationsCreated;
    venueFinalized += b.venueFinalized;
    notifyTotal += b.notifyTotal;
    notifyDryRun += b.notifyDryRun;
    notifyFailed += b.notifyFailed;
  }
  return {
    teamsCreated,
    reservationsCreated,
    brandingSuccessRate: rate(brandingCompleted, teamsCreated),
    publicHomeReadyRate: rate(publicHomeReady, teamsCreated),
    dryRunSuccessRate: rate(notifyDryRun, notifyTotal),
    venueFinalized,
    notifyFailed,
  };
}

/**
 * Simple anomaly rules (no ML):
 * - Branding fail rate today ≥ baseline+25pp and sample ≥ 2
 * - Notify fail rate today ≥ 40% and sample ≥ 3
 * - Reservations drop to 0 after busy baseline (≥3/day avg)
 */
export function detectOpsKpiAnomalies(
  days: OpsKpiDayBucket[],
  opts?: { brandingSpikePp?: number; notifyFailPct?: number }
): OpsKpiAnomaly[] {
  const brandingSpikePp = opts?.brandingSpikePp ?? 25;
  const notifyFailPct = opts?.notifyFailPct ?? 40;
  if (days.length < 2) return [];

  const today = days[days.length - 1];
  const prev = days.slice(0, -1);
  const anomalies: OpsKpiAnomaly[] = [];

  const prevBrandFailRates = prev
    .filter((d) => d.teamsCreated >= 1)
    .map((d) => (d.brandingFailed / d.teamsCreated) * 100);
  const brandBaseline =
    prevBrandFailRates.length > 0
      ? prevBrandFailRates.reduce((a, b) => a + b, 0) / prevBrandFailRates.length
      : 0;
  if (today.teamsCreated >= 2) {
    const failPct = (today.brandingFailed / today.teamsCreated) * 100;
    if (failPct >= brandBaseline + brandingSpikePp && failPct >= 30) {
      anomalies.push({
        id: "branding_fail_spike",
        severity: failPct >= 70 ? "critical" : "warning",
        title: "Branding 실패율 급증",
        detail: `오늘 실패율 ${failPct.toFixed(0)}% (최근 평균 ${brandBaseline.toFixed(0)}%)`,
        metric: "brandingFailRate",
        day: today.day,
        value: Math.round(failPct * 10) / 10,
        baseline: Math.round(brandBaseline * 10) / 10,
      });
    }
  }

  if (today.notifyTotal >= 3) {
    const failPct = (today.notifyFailed / today.notifyTotal) * 100;
    if (failPct >= notifyFailPct) {
      anomalies.push({
        id: "notify_fail_high",
        severity: failPct >= 60 ? "critical" : "warning",
        title: "알림 실패율 높음",
        detail: `오늘 실패 ${today.notifyFailed}/${today.notifyTotal} (${failPct.toFixed(0)}%)`,
        metric: "notifyFailRate",
        day: today.day,
        value: Math.round(failPct * 10) / 10,
        baseline: notifyFailPct,
      });
    }
  }

  const prevResAvg =
    prev.length > 0
      ? prev.reduce((a, d) => a + d.reservationsCreated, 0) / prev.length
      : 0;
  if (prevResAvg >= 3 && today.reservationsCreated === 0) {
    anomalies.push({
      id: "venue_reservation_drop",
      severity: "warning",
      title: "예약 건수 급감",
      detail: `오늘 예약 0건 (최근 평균 ${prevResAvg.toFixed(1)}건)`,
      metric: "reservationsCreated",
      day: today.day,
      value: 0,
      baseline: Math.round(prevResAvg * 10) / 10,
    });
  }

  return anomalies;
}

export function buildOpsKpiReport(input: {
  notifications: OpsNotificationRow[];
  reservations: OpsReservationRow[];
  teams: TeamObservabilityDoc[];
  rangeDays?: number;
  nowMs?: number;
  liveSendEnabled?: boolean;
}): OpsKpiReport {
  const rangeDays = input.rangeDays ?? 7;
  const days = buildOpsKpiDayBuckets({ ...input, rangeDays });
  return {
    rangeDays,
    days,
    trends: buildOpsKpiTrends(days),
    week: buildOpsKpiWeekSummary(days),
    anomalies: detectOpsKpiAnomalies(days),
  };
}

/** Tiny bar chart helper — values normalized 0..1 for CSS width */
export function normalizeTrendBars(
  values: Array<number | null>,
  fallbackMax = 1
): number[] {
  const nums = values.map((v) => (v == null ? 0 : v));
  const max = Math.max(fallbackMax, ...nums);
  if (max <= 0) return nums.map(() => 0);
  return nums.map((v) => Math.round((v / max) * 1000) / 1000);
}
