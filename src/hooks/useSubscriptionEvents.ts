import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    SUBSCRIPTION_EVENT_TYPES,
    type SubscriptionLifecycleEventDoc,
    type SubscriptionLifecycleEventType,
} from "@/types/billing";

const MAX_EVENT_ROWS = 8000;

export type SubscriptionEventRow = Omit<SubscriptionLifecycleEventDoc, "type"> & {
    id: string;
    type: SubscriptionLifecycleEventType;
    occurredAtMs: number;
};

function toMillis(v: unknown): number | null {
    if (v && typeof v === "object" && "toMillis" in v) {
        return (v as { toMillis: () => number }).toMillis();
    }
    return null;
}

function isEventType(v: string): v is SubscriptionLifecycleEventType {
    return (Object.values(SUBSCRIPTION_EVENT_TYPES) as string[]).includes(v);
}

export function useSubscriptionEvents(enabled: boolean) {
    const [data, setData] = useState<SubscriptionEventRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!enabled) {
            setData([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const q = query(
                collection(db, "subscription_events"),
                orderBy("occurredAt", "desc"),
                limit(MAX_EVENT_ROWS)
            );
            const snap = await getDocs(q);
            const rows: SubscriptionEventRow[] = [];
            for (const doc of snap.docs) {
                const d = doc.data() as Partial<SubscriptionLifecycleEventDoc>;
                const type = String(d.type || "").trim();
                const occurredAtMs = toMillis(d.occurredAt);
                if (!isEventType(type) || occurredAtMs == null) continue;
                rows.push({
                    id: doc.id,
                    subscriptionId: String(d.subscriptionId || ""),
                    customerId: d.customerId ?? null,
                    orgId: d.orgId ?? null,
                    teamId: d.teamId ?? null,
                    type,
                    statusBefore: d.statusBefore ?? null,
                    statusAfter: String(d.statusAfter || ""),
                    price: typeof d.price === "number" ? d.price : undefined,
                    currency: d.currency,
                    billingInterval: d.billingInterval,
                    mrr: typeof d.mrr === "number" ? d.mrr : null,
                    mrrCurrency: d.mrrCurrency ?? null,
                    sourceEvent: d.sourceEvent ?? null,
                    stripeEventId: d.stripeEventId ?? null,
                    stripeEventCreated: typeof d.stripeEventCreated === "number" ? d.stripeEventCreated : null,
                    occurredAt: d.occurredAt,
                    recordedAt: d.recordedAt,
                    occurredAtMs,
                });
            }
            rows.sort((a, b) => a.occurredAtMs - b.occurredAtMs);
            setData(rows);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        void load();
    }, [load]);

    return { data, loading, error, refetch: load };
}
