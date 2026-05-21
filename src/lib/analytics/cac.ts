import type { ForecastEventLike } from "@/lib/analytics/forecast";

export type GrowthSpendDoc = {
  month?: string;
  marketingSpend?: number;
  salesSpend?: number;
  newPaidTeams?: number;
  /** 광고 / 오가닉 — 채널별 CAC (수동) */
  adsSpend?: number;
  organicSpend?: number;
  newPaidTeamsAds?: number;
  newPaidTeamsOrganic?: number;
};

export type CacResult = {
  month: string;
  marketingSpend: number;
  salesSpend: number;
  totalSpend: number;
  newPaidTeams: number;
  /** `newPaidTeams`가 0이면 `subscription_events` type=created 월 집계 */
  newPaidTeamsFromEvents: number;
  cac: number;
  cacAds: number;
  cacOrganic: number;
};

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "object" && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * `yyyy-MM`과 이벤트 `occurredAt`의 달(로컬)이 같으면 집계 — 신규 유료 팀 수 폴백
 */
export function countCreatedEventsInMonth(events: ForecastEventLike[], monthYyyyMm: string): number {
  if (!/^\d{4}-\d{2}$/.test(String(monthYyyyMm).trim())) return 0;
  let n = 0;
  for (const ev of events) {
    if (String(ev.type || "").trim().toLowerCase() !== "created") continue;
    const ms = toMillis(ev.occurredAt);
    if (ms == null) continue;
    const key = new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }).slice(0, 7);
    if (key === monthYyyyMm) n += 1;
  }
  return n;
}

function currentMonthYyyyMm(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }).slice(0, 7);
}

export function calculateCac(
  doc: GrowthSpendDoc | null | undefined,
  options?: { events?: ForecastEventLike[] }
): CacResult {
  const month = String(doc?.month || "").trim() || currentMonthYyyyMm();
  const marketingSpend = Number.isFinite(Number(doc?.marketingSpend)) ? Math.max(0, Number(doc?.marketingSpend)) : 0;
  const salesSpend = Number.isFinite(Number(doc?.salesSpend)) ? Math.max(0, Number(doc?.salesSpend)) : 0;
  const manualNew = Number.isFinite(Number(doc?.newPaidTeams)) ? Math.max(0, Number(doc?.newPaidTeams)) : 0;
  const fromEvents = options?.events ? countCreatedEventsInMonth(options.events, month) : 0;
  const newPaidTeams = manualNew > 0 ? manualNew : fromEvents;
  const newPaidTeamsFromEvents = fromEvents;

  const totalSpend = marketingSpend + salesSpend;
  const cac = newPaidTeams > 0 ? totalSpend / newPaidTeams : 0;

  const adsSpend = Number.isFinite(Number(doc?.adsSpend)) ? Math.max(0, Number(doc?.adsSpend)) : 0;
  const organicSpend = Number.isFinite(Number(doc?.organicSpend)) ? Math.max(0, Number(doc?.organicSpend)) : 0;
  const nAds = Number.isFinite(Number(doc?.newPaidTeamsAds)) ? Math.max(0, Number(doc?.newPaidTeamsAds)) : 0;
  const nOrg = Number.isFinite(Number(doc?.newPaidTeamsOrganic)) ? Math.max(0, Number(doc?.newPaidTeamsOrganic)) : 0;
  const cacAds = nAds > 0 && adsSpend > 0 ? adsSpend / nAds : 0;
  const cacOrganic = nOrg > 0 && organicSpend > 0 ? organicSpend / nOrg : 0;

  return {
    month,
    marketingSpend,
    salesSpend,
    totalSpend,
    newPaidTeams,
    newPaidTeamsFromEvents,
    cac,
    cacAds,
    cacOrganic,
  };
}

export function calculateLtvCacRatio(ltv: number, cac: number): number {
  if (!Number.isFinite(ltv) || ltv <= 0) return 0;
  if (!Number.isFinite(cac) || cac <= 0) return 0;
  return ltv / cac;
}

export function getLtvCacHealthLabel(ratio: number): "위험" | "개선 필요" | "건강" {
  if (ratio < 1) return "위험";
  if (ratio < 3) return "개선 필요";
  return "건강";
}
