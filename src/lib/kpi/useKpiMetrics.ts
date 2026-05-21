/**
 * ✅ COMMIT 23: KPI 데이터 로딩 훅
 */

import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";

export function useKpiMetrics(tenantId: string) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!tenantId) {
      setData(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const [anomalies, approvals, resilience] = await Promise.all([
          getDocs(
            query(
              collection(db, "_anomalies"),
              where("tenantId", "==", tenantId),
              orderBy("createdAt", "desc"),
              limit(30)
            )
          ),
          getDocs(
            query(
              collection(db, "_approvals"),
              where("tenantId", "==", tenantId),
              where("status", "in", ["approved", "rejected"]),
              orderBy("resolvedAt", "desc"),
              limit(50)
            )
          ),
          getDocs(
            query(
              collection(db, "_resilienceScores"),
              where("tenantId", "==", tenantId),
              orderBy("createdAt", "asc"),
              limit(30)
            )
          ),
        ]);

        setData({
          anomalies: anomalies.docs.map((d) => d.data()),
          approvals: approvals.docs.map((d) => d.data()),
          resilience: resilience.docs.map((d) => d.data()),
        });
      } catch (error) {
        console.error("[useKpiMetrics] 데이터 로딩 오류:", error);
        setData({ anomalies: [], approvals: [], resilience: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  return { data, loading };
}

