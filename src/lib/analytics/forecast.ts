export type ForecastEventLike = {
  subscriptionId?: string;
  type?: string;
  price?: number;
  billingInterval?: "month" | "year" | string;
  occurredAt?: unknown;
};

export type RevenueForecast = {
  currentMRR: number;
  avgNewMRR: number;
  avgExpansionMRR: number;
  avgContractionMRR: number;
  avgChurnMRR: number;
  forecastMRR: number;
  forecastGrowthPercent: number;
  expectedChurnMRR: number;
};

type MonthBucket = {
  key: string;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnMRR: number;
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

function monthAmount(price: number, interval: string): number {
  const amount = Number.isFinite(price) ? Math.max(0, price) : 0;
  return String(interval || "month").toLowerCase() === "year" ? amount / 12 : amount;
}

function monthKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function forecastRevenueFromEvents(events: ForecastEventLike[], currentMRR: number): RevenueForecast {
  const sorted = events
    .map((ev) => ({
      subscriptionId: String(ev.subscriptionId || "").trim(),
      type: String(ev.type || "").trim().toLowerCase(),
      amount: monthAmount(Number(ev.price ?? 0), String(ev.billingInterval || "month")),
      occurredAtMs: toMillis(ev.occurredAt),
    }))
    .filter((ev) => ev.subscriptionId.length > 0 && ev.occurredAtMs != null)
    .sort((a, b) => Number(a.occurredAtMs) - Number(b.occurredAtMs));

  const lastBySub = new Map<string, number>();
  const byMonth = new Map<string, MonthBucket>();

  sorted.forEach((ev) => {
    const prev = lastBySub.get(ev.subscriptionId) ?? 0;
    const next = ev.type === "canceled" ? 0 : ev.amount;
    lastBySub.set(ev.subscriptionId, next);

    const diff = next - prev;
    if (diff === 0) return;

    const key = monthKey(Number(ev.occurredAtMs));
    const bucket = byMonth.get(key) ?? { key, newMRR: 0, expansionMRR: 0, contractionMRR: 0, churnMRR: 0 };

    if (ev.type === "canceled") {
      bucket.churnMRR += Math.abs(diff);
    } else if (prev === 0 && next > 0) {
      bucket.newMRR += diff;
    } else if (diff > 0) {
      bucket.expansionMRR += diff;
    } else {
      bucket.contractionMRR += Math.abs(diff);
    }

    byMonth.set(key, bucket);
  });

  const months = Array.from(byMonth.values()).sort((a, b) => a.key.localeCompare(b.key));
  const recent = months.slice(Math.max(0, months.length - 3));

  const avgNewMRR = avg(recent.map((m) => m.newMRR));
  const avgExpansionMRR = avg(recent.map((m) => m.expansionMRR));
  const avgContractionMRR = avg(recent.map((m) => m.contractionMRR));
  const avgChurnMRR = avg(recent.map((m) => m.churnMRR));

  const forecastMRR = Math.max(0, currentMRR + avgNewMRR + avgExpansionMRR - avgContractionMRR - avgChurnMRR);
  const forecastGrowthPercent = currentMRR > 0 ? ((forecastMRR - currentMRR) / currentMRR) * 100 : 0;

  return {
    currentMRR: Math.max(0, currentMRR),
    avgNewMRR,
    avgExpansionMRR,
    avgContractionMRR,
    avgChurnMRR,
    forecastMRR,
    forecastGrowthPercent,
    expectedChurnMRR: avgChurnMRR,
  };
}

export type LinearRegressionMrr = {
  /** 직전 일 대비 (마지막 vs 그 전날) 외삽: 마지막 MRR + slope * horizonDays */
  forecastMrr: number;
  /** 일별 MRR 증감(회귀 기울기) */
  slopePerDay: number;
  /** 마지막 점 MRR */
  lastMrr: number;
  r2: number;
  horizonDays: number;
};

/**
 * 일자별 MRR 시퀀스 — 최소 제곡 직선으로 추세, `horizonDays` 뒤 MRR 예측(0 하한)
 */
export function linearRegressionMrrForward(
  dailyMrr: { mrr: number }[],
  horizonDays = 30
): LinearRegressionMrr {
  const horizon = Math.max(1, Math.min(90, Math.floor(horizonDays)));
  const pts = dailyMrr.map((p) => Math.max(0, Number(p.mrr) || 0));
  const n = pts.length;
  if (n === 0) {
    return { forecastMrr: 0, slopePerDay: 0, lastMrr: 0, r2: 0, horizonDays: horizon };
  }
  if (n === 1) {
    return { forecastMrr: pts[0]!, slopePerDay: 0, lastMrr: pts[0]!, r2: 0, horizonDays: horizon };
  }
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = pts[i] ?? 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    const yHat = intercept + slope * i;
    ssRes += (pts[i]! - yHat) ** 2;
    ssTot += (pts[i]! - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const lastMrr = pts[n - 1] ?? 0;
  const lastX = n - 1;
  const forecastMrr = Math.max(0, intercept + slope * (lastX + horizon));
  return { forecastMrr, slopePerDay: slope, lastMrr, r2, horizonDays: horizon };
}
