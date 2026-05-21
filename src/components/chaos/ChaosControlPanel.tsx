/**
 * ✅ COMMIT 21: Chaos Engineering 제어 패널
 */

import React from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChaosPolicy, ChaosType } from "@/lib/chaos/chaosPolicy";

export function ChaosControlPanel({ tenantId }: { tenantId: string }) {
  const [policy, setPolicy] = React.useState<ChaosPolicy | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!tenantId) return;
    const loadPolicy = async () => {
      const snap = await getDoc(doc(db, "_chaosPolicies", tenantId));
      setPolicy(snap.exists() ? (snap.data() as ChaosPolicy) : null);
    };
    loadPolicy();
  }, [tenantId]);

  const updatePolicy = async (updates: Partial<ChaosPolicy>) => {
    setSaving(true);
    try {
      const newPolicy: ChaosPolicy = {
        tenantId,
        enabled: updates.enabled ?? policy?.enabled ?? false,
        probability: updates.probability ?? policy?.probability ?? 0.1,
        types: updates.types ?? policy?.types ?? [],
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "_chaosPolicies", tenantId), newPolicy, { merge: true });
      setPolicy(newPolicy);
    } catch (error) {
      console.error("[ChaosControlPanel] 저장 실패:", error);
      alert("Chaos 정책 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const chaosTypes: ChaosType[] = [
    "firestore_read_fail",
    "firestore_write_fail",
    "approval_delay",
    "ethics_timeout",
    "plugin_fail",
  ];

  return (
    <div
      style={{
        border: "2px dashed orange",
        padding: 16,
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        🔥 Chaos Engineering
      </div>
      <div style={{ marginBottom: 12, fontSize: 14, opacity: 0.8 }}>
        무작위 실패를 주입하여 회복력을 측정합니다.
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16, color: "#dc2626" }}>
        ⚠️ 운영 시간 외에만 사용 권장
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={policy?.enabled ?? false}
            onChange={(e) => updatePolicy({ enabled: e.target.checked })}
            disabled={saving}
          />
          <span style={{ fontWeight: 600 }}>Chaos 활성화</span>
        </label>
      </div>

      {policy?.enabled && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              확률: {(policy.probability * 100).toFixed(1)}%
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={policy.probability * 100}
              onChange={(e) =>
                updatePolicy({ probability: Number(e.target.value) / 100 })
              }
              disabled={saving}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Chaos 타입:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {chaosTypes.map((type) => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={policy.types?.includes(type) ?? false}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...(policy.types ?? []), type]
                        : (policy.types ?? []).filter((t) => t !== type);
                      updatePolicy({ types });
                    }}
                    disabled={saving}
                  />
                  <span style={{ fontSize: 13 }}>{type}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

