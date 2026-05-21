/**
 * ✅ COMMIT 24: Remediation 상태 패널
 */

import React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function RemediationStatusPanel({ tenantId }: { tenantId: string }) {
  const [remediation, setRemediation] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!tenantId) {
      setRemediation(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "_activeRemediations", tenantId), (snap) => {
      setRemediation(snap.exists() ? snap.data() : null);
    });

    return () => unsubscribe();
  }, [tenantId]);

  if (!remediation) return null;

  const expiresAt = remediation.expiresAt?.toDate?.() ?? new Date(remediation.expiresAt);

  return (
    <div
      style={{
        border: "2px solid #ef4444",
        padding: 12,
        borderRadius: 8,
        background: "#fee",
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#dc2626" }}>
        🛡 Auto-Remediation Active
      </div>
      <div style={{ marginBottom: 4, fontSize: 14 }}>
        <b>Actions:</b> {(remediation.actions ?? []).join(", ")}
      </div>
      <div style={{ marginBottom: 4, fontSize: 14 }}>
        <b>Anomaly:</b> {remediation.anomaly?.level ?? "unknown"} /{" "}
        {remediation.anomaly?.metric ?? "unknown"}
      </div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        <b>Expires at:</b> {expiresAt.toLocaleString()}
      </div>
    </div>
  );
}

