/**
 * ✅ COMMIT 25: Remediation 승인 목록 훅
 */

import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";

export function useRemediationApprovals(tenantId: string) {
  const [approvals, setApprovals] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!tenantId) {
      setApprovals([]);
      return;
    }

    const q = query(
      collection(db, "_remediationApprovals"),
      where("tenantId", "==", tenantId),
      where("status", "==", "pending"),
      orderBy("requestedAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setApprovals(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      },
      (error) => {
        console.error("[useRemediationApprovals] 구독 오류:", error);
        setApprovals([]);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return approvals;
}

