/**
 * ✅ COMMIT 26: Remediation 효과 로딩 훅
 */

import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";

export function useRemediationEffects(tenantId: string) {
  const [effects, setEffects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!tenantId) {
      setEffects([]);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "_remediationEffects"),
            where("tenantId", "==", tenantId),
            orderBy("evaluatedAt", "desc"),
            limit(10)
          )
        );

        setEffects(snap.docs.map((d) => d.data()));
      } catch (error) {
        console.error("[useRemediationEffects] 데이터 로딩 오류:", error);
        setEffects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  return { effects, loading };
}

