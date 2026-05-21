/**
 * ✅ COMMIT 17: 이상 경보 실시간 구독 훅
 */

import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";

export interface AnomalyAlert {
  id: string;
  tenantId: string;
  metric: string;
  value: number;
  baseline: {
    avg: number;
    std: number;
  };
  anomaly: {
    level: "critical" | "warning";
    kind?: "zero" | "drop" | "z" | "drift";
    z?: number;
    ratio?: number;
    slope?: number;
  };
  date: any;
  createdAt: any;
}

export function useAnomalyAlerts(tenantId: string): AnomalyAlert[] {
  const [alerts, setAlerts] = React.useState<AnomalyAlert[]>([]);

  React.useEffect(() => {
    if (!tenantId) {
      setAlerts([]);
      return;
    }

    const q = query(
      collection(db, "_anomalies"),
      where("tenantId", "==", tenantId),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setAlerts(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as AnomalyAlert[]
        );
      },
      (error) => {
        console.error("[useAnomalyAlerts] 구독 오류:", error);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return alerts;
}

