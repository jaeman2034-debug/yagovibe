import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import type { SubscriptionDoc, SubscriptionStatus } from "@/types/billing";
import { toMillis } from "@/utils/firestoreTime";
import { parseSubscriptionStatus } from "@/utils/parseSubscriptionStatus";

function statusRank(status?: string): number {
    const s = String(status || "").toLowerCase();
    switch (s) {
        case "active":
            return 5;
        case "trialing":
        case "trial":
            return 4;
        case "past_due":
            return 3;
        case "unpaid":
        case "paused":
            return 2;
        case "incomplete":
        case "incomplete_expired":
            return 1;
        case "canceled":
            return 0;
        default:
            return 0;
    }
}

function betterSubscription(a: SubscriptionDoc, b: SubscriptionDoc): SubscriptionDoc {
    const ra = statusRank(a.status);
    const rb = statusRank(b.status);
    if (rb > ra) return b;
    if (ra > rb) return a;
    if (b.updatedAtMs > a.updatedAtMs) return b;
    return a;
}

/**
 * `subscriptions` 컬렉션 문서 → `SubscriptionDoc`
 * (절대 `org.billing` 머지 없음)
 */
export function mapSnapshotToSubscriptionDoc(
    d: QueryDocumentSnapshot<DocumentData>
): SubscriptionDoc | null {
    const data = d.data() as Record<string, unknown>;
    const orgId = String(data.orgId || "").trim();
    if (!orgId) return null;
    const price = Number(data.price);
    const amt = Number(data.amount);
    const amount = Number.isFinite(price) && price > 0 ? price : Number.isFinite(amt) && amt > 0 ? amt : 0;
    const bi = data.billingInterval;
    const interval: "month" | "year" = bi === "year" ? "year" : "month";
    return {
        id: d.id,
        orgId,
        status: parseSubscriptionStatus(data.status) as SubscriptionStatus,
        plan: data.plan != null ? String(data.plan) : undefined,
        priceId: data.priceId != null ? String(data.priceId) : undefined,
        currency: data.currency != null ? String(data.currency).toUpperCase() : undefined,
        amount,
        interval,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        updatedAtMs: toMillis(data.updatedAt) || toMillis(data.createdAt) || 0,
        lastStripeEventCreated:
            data.lastStripeEventCreated != null && data.lastStripeEventCreated !== ""
                ? Number(data.lastStripeEventCreated)
                : undefined,
        lastStripeEventId:
            data.lastStripeEventId != null && String(data.lastStripeEventId).trim() !== ""
                ? String(data.lastStripeEventId)
                : undefined,
    };
}

export function parseSubscriptionQuerySnapshot(
    docs: Array<QueryDocumentSnapshot<DocumentData>>
): SubscriptionDoc[] {
    const out: SubscriptionDoc[] = [];
    for (const d of docs) {
        const row = mapSnapshotToSubscriptionDoc(d);
        if (row) out.push(row);
    }
    return out;
}

/**
 * orgId 당 **대표 1문서** (중복·반복 checkout 방어)
 *
 * QA: 같은 org에 `subscriptions` N개 → UI/KPI는 항상 1개로만 투영되는지 확인.
 * - 우선순위: status rank (active > trialing > …) → 동점이면 `updatedAtMs` 최신
 */
export function buildSubscriptionsByOrgId(
    subscriptions: SubscriptionDoc[]
): Map<string, SubscriptionDoc> {
    const map = new Map<string, SubscriptionDoc>();

    for (const sub of subscriptions) {
        const key = String(sub.orgId || "").trim();
        if (!key) continue;
        const existing = map.get(key);
        if (!existing) {
            map.set(key, sub);
            continue;
        }
        map.set(key, betterSubscription(existing, sub));
    }

    return map;
}
