export type UpgradeEventLike = {
  subscriptionId?: string;
  type?: string;
  price?: number;
  billingInterval?: "month" | "year" | string;
  occurredAt?: unknown;
};

export type UpgradeFlowSummary = {
  upgradeCount: number;
  downgradeCount: number;
  upgradeAmount: number;
  downgradeAmount: number;
  netAmount: number;
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

function monthlyAmount(price: number, interval: string): number {
  const p = Number.isFinite(price) ? Math.max(0, price) : 0;
  return String(interval || "month").toLowerCase() === "year" ? p / 12 : p;
}

export function summarizeUpgradeFlow(events: UpgradeEventLike[], days = 30): UpgradeFlowSummary {
  const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
  const sorted = events
    .map((ev) => ({
      ...ev,
      type: String(ev.type || "").trim().toLowerCase(),
      subscriptionId: String(ev.subscriptionId || "").trim(),
      occurredAtMs: toMillis(ev.occurredAt),
    }))
    .filter((ev) => ev.subscriptionId.length > 0 && ev.occurredAtMs != null)
    .sort((a, b) => Number(a.occurredAtMs) - Number(b.occurredAtMs));

  const lastAmount = new Map<string, number>();
  let upgradeCount = 0;
  let downgradeCount = 0;
  let upgradeAmount = 0;
  let downgradeAmount = 0;

  sorted.forEach((ev) => {
    const subId = String(ev.subscriptionId);
    const prev = lastAmount.get(subId) ?? 0;
    const next =
      ev.type === "canceled"
        ? 0
        : monthlyAmount(Number(ev.price ?? 0), String(ev.billingInterval || "month"));
    lastAmount.set(subId, next);

    if (Number(ev.occurredAtMs) < cutoff) return;
    const diff = next - prev;
    if (diff > 0) {
      upgradeCount += 1;
      upgradeAmount += diff;
    } else if (diff < 0) {
      downgradeCount += 1;
      downgradeAmount += Math.abs(diff);
    }
  });

  return {
    upgradeCount,
    downgradeCount,
    upgradeAmount,
    downgradeAmount,
    netAmount: upgradeAmount - downgradeAmount,
  };
}
