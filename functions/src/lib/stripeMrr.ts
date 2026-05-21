/**
 * Stripe 구독 라인 → 팀 문서용 MRR(월 환산, Stripe minor unit 그대로).
 * 통화는 팀별로 `billingCurrency`에 저장 — 플랫폼 합산 시 통화 혼합 주의.
 */
import Stripe from "stripe";

export type SubscriptionMrrFields = {
  mrr: number;
  billingUnitAmount: number;
  billingInterval: string;
  billingCurrency: string;
};

function monthlyFromRecurring(unitAmount: number, interval: string): number {
  if (interval === "month") return unitAmount;
  if (interval === "year") return Math.round(unitAmount / 12);
  if (interval === "week") return Math.round((unitAmount * 52) / 12);
  if (interval === "day") return Math.round((unitAmount * 365) / 12);
  return 0;
}

/** Price 객체가 펼쳐져 있고 recurring+unit_amount 가 있을 때만 MRR 산출 */
export function subscriptionLineToMrrFields(sub: Stripe.Subscription): SubscriptionMrrFields | null {
  const items = Array.isArray(sub.items?.data) ? sub.items.data : [];
  if (items.length < 1) return null;

  let currency = "";
  let firstUnitAmount = 0;
  let firstInterval = "";
  let totalMrr = 0;

  for (const item of items) {
    const price = item?.price;
    if (!price || typeof price === "string") continue;
    const recurring = price.recurring;
    if (!recurring?.interval || price.unit_amount == null) continue;

    const priceCurrency = String(price.currency || "").toLowerCase();
    if (!currency) {
      currency = priceCurrency;
      firstUnitAmount = price.unit_amount;
      firstInterval = String(recurring.interval);
    } else if (currency !== priceCurrency) {
      // 통화가 섞인 구독은 단일 mrr 숫자로 합치지 않는다.
      continue;
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
    const effectiveUnitAmount = price.unit_amount * quantity;
    totalMrr += monthlyFromRecurring(effectiveUnitAmount, String(recurring.interval));
  }

  if (!Number.isFinite(totalMrr) || totalMrr <= 0 || !currency) return null;
  return {
    mrr: totalMrr,
    billingUnitAmount: firstUnitAmount,
    billingInterval: firstInterval,
    billingCurrency: currency || "usd",
  };
}

export async function fetchSubscriptionWithPriceDetails(
  stripe: Stripe,
  subId: string,
  partial?: Stripe.Subscription
): Promise<Stripe.Subscription> {
  const p0 = partial?.items?.data?.[0]?.price;
  if (
    p0 &&
    typeof p0 !== "string" &&
    typeof (p0 as Stripe.Price).unit_amount === "number" &&
    (p0 as Stripe.Price).recurring
  ) {
    return partial as Stripe.Subscription;
  }
  return stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
}
