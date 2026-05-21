export type BillingDoc = {
  billingStatus?: string;
  /** 팀 플랜(예: basic, pro) — LTV(플랜별)용 */
  plan?: string;
  billingUnitAmount?: number;
  billingInterval?: "month" | "year" | string;
  interval?: "month" | "year" | string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: unknown;
  createdAt?: unknown;
};

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeMonthlyAmount(doc: BillingDoc): number {
  const amountRaw = Number(doc.billingUnitAmount ?? 0);
  const amount = Number.isFinite(amountRaw) ? Math.max(0, amountRaw) : 0;
  const interval = String(doc.billingInterval || doc.interval || "month").trim().toLowerCase();
  if (interval === "year") return amount / 12;
  return amount;
}

export function calculateMRRMetrics(docs: BillingDoc[]) {
  let mrr = 0;
  let active = 0;
  let churn = 0;
  let trial = 0;
  let scheduled = 0;

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  docs.forEach((doc) => {
    const amount = normalizeMonthlyAmount(doc);
    const status = String(doc.billingStatus || "").trim().toLowerCase();

    if (status === "active") {
      mrr += amount;
      active += 1;
    }
    if (status === "trialing") {
      trial += 1;
    }
    if (doc.cancelAtPeriodEnd === true) {
      scheduled += 1;
    }

    if (status === "canceled") {
      const canceledAt = toDate(doc.canceledAt);
      if (canceledAt && canceledAt.getMonth() === month && canceledAt.getFullYear() === year) {
        churn += 1;
      }
    }
  });

  const arr = mrr * 12;
  const arpu = active > 0 ? mrr / active : 0;
  const churnRate = active > 0 ? (churn / active) * 100 : 0;

  return { mrr, arr, arpu, churn, churnRate, active, trial, scheduled };
}

export function calculateMRR(docs: BillingDoc[]) {
  const { mrr, active, churn } = calculateMRRMetrics(docs);
  return { mrr, active, churn };
}

export type MrrTrendPoint = {
  label: string;
  mrr: number;
};

export function buildDailyMrrTrend(docs: BillingDoc[], days = 30): MrrTrendPoint[] {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(90, Math.floor(days))) : 30;
  const now = new Date();
  const list: MrrTrendPoint[] = [];
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);

    const mrr = docs.reduce((sum, doc) => {
      const createdAt = toDate(doc.createdAt);
      if (!createdAt || createdAt.getTime() > end.getTime()) return sum;
      const status = String(doc.billingStatus || "").trim().toLowerCase();
      if (status !== "active") return sum;
      return sum + normalizeMonthlyAmount(doc);
    }, 0);

    list.push({
      label: `${day.getMonth() + 1}/${day.getDate()}`,
      mrr,
    });
  }
  return list;
}
