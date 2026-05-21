import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BillingMetricDailyDoc } from "@/types/billing";

/** 최근 N일만 로드 (비용·렌더 상한) — `date desc` 후 클라이언트에서 시간순 정렬 */
const MAX_DAILY_ROWS = 90;

export type BillingMetricRow = BillingMetricDailyDoc & { id: string };

export function useBillingMetrics(enabled: boolean) {
    const [data, setData] = useState<BillingMetricRow[]>([]);
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
                collection(db, "billing_metrics_daily"),
                orderBy("date", "desc"),
                limit(MAX_DAILY_ROWS)
            );
            const snap = await getDocs(q);
            const rows: BillingMetricRow[] = snap.docs.map((doc) => {
                const d = doc.data() as Partial<BillingMetricDailyDoc>;
                return {
                    id: doc.id,
                    date: typeof d.date === "string" ? d.date : doc.id,
                    mrr: typeof d.mrr === "number" ? d.mrr : 0,
                    activeCount: typeof d.activeCount === "number" ? d.activeCount : 0,
                    newCount: typeof d.newCount === "number" ? d.newCount : 0,
                    churnCount: typeof d.churnCount === "number" ? d.churnCount : 0,
                    churnEventsDay: typeof d.churnEventsDay === "number" ? d.churnEventsDay : undefined,
                    windowDays: typeof d.windowDays === "number" ? d.windowDays : 30,
                    computedAt: d.computedAt,
                };
            });
            rows.reverse();
            setData(rows);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
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
