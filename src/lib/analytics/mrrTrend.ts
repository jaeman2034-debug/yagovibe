export type SubscriptionEventLike = {
  subscriptionId?: string;
  type?: string;
  price?: number;
  billingInterval?: "month" | "year" | string;
  occurredAt?: unknown;
};

export type MrrTrendPoint = {
  label: string;
  mrr: number;
  delta: number;
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

function dayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function buildMrrTrendFromEvents(events: SubscriptionEventLike[], days = 60): MrrTrendPoint[] {
  const safeDays = Number.isFinite(days) ? Math.max(7, Math.min(180, Math.floor(days))) : 60;
  const withMs = events
    .map((ev) => ({
      ...ev,
      occurredAtMs: toMillis(ev.occurredAt),
      subscriptionId: String(ev.subscriptionId || "").trim(),
      type: String(ev.type || "").trim().toLowerCase(),
    }))
    .filter((ev) => ev.occurredAtMs != null && ev.subscriptionId.length > 0)
    .sort((a, b) => Number(a.occurredAtMs) - Number(b.occurredAtMs));

  const activeMrrBySub = new Map<string, number>();
  const dailyDelta = new Map<string, number>();
  let runningMrr = 0;

  withMs.forEach((ev) => {
    const subId = String(ev.subscriptionId);
    const prev = activeMrrBySub.get(subId) ?? 0;
    const nextAmount = monthAmount(Number(ev.price ?? 0), String(ev.billingInterval || "month"));

    let next = prev;
    if (ev.type === "canceled") {
      next = 0;
    } else if (ev.type === "created" || ev.type === "activated" || ev.type === "renewed" || ev.type === "trial_started") {
      next = nextAmount;
    }

    const delta = next - prev;
    if (delta !== 0) {
      activeMrrBySub.set(subId, next);
      runningMrr += delta;
      const key = dayKey(Number(ev.occurredAtMs));
      dailyDelta.set(key, (dailyDelta.get(key) ?? 0) + delta);
    }
  });

  const today = new Date();
  const keys: string[] = [];
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(dayKey(d.getTime()));
  }

  // 현재 running MRR에서 역산해 과거 라인 생성
  const totalWindowDelta = keys.reduce((sum, key) => sum + (dailyDelta.get(key) ?? 0), 0);
  let cursor = runningMrr - totalWindowDelta;
  const out: MrrTrendPoint[] = [];
  keys.forEach((key) => {
    const delta = dailyDelta.get(key) ?? 0;
    cursor += delta;
    out.push({ label: dayLabel(key), mrr: Math.max(0, cursor), delta });
  });
  return out;
}
