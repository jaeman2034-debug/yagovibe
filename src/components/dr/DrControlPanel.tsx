/**
 * ✅ COMMIT 19: DR 제어 패널 (관리자 전용)
 */

import React from "react";
import { useDrStatus } from "@/lib/dr/useDrStatus";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DrMode } from "@/lib/dr/drPolicy";

export function DrControlPanel({ tenantId }: { tenantId: string }) {
  const policy = useDrStatus(tenantId);
  const [saving, setSaving] = React.useState(false);

  const setMode = async (mode: DrMode, message?: string) => {
    if (!confirm(`DR 모드를 "${mode}"로 변경하시겠습니까? 이 설정은 즉시 전체 시스템에 반영됩니다.`)) {
      return;
    }

    if (!confirm("정말로 변경하시겠습니까? (최종 확인)")) {
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "_drPolicies", tenantId),
        {
          tenantId,
          mode,
          message,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("[DrControlPanel] 저장 실패:", error);
      alert("DR 모드 변경 실패");
    } finally {
      setSaving(false);
    }
  };

  const getModeColor = (mode: string) => {
    if (mode === "normal") return "#22c55e";
    if (mode === "read_only") return "#f59e0b";
    if (mode === "write_blocked") return "#ef4444";
    if (mode === "region_down") return "#dc2626";
    return "#6b7280";
  };

  return (
    <div
      style={{
        border: `2px solid ${getModeColor(policy?.mode ?? "normal")}`,
        padding: 16,
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        🚨 DR Simulation
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          현재 모드:
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: getModeColor(policy?.mode ?? "normal"),
          }}
        >
          {policy?.mode ?? "normal"}
        </div>
        {policy?.message && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {policy.message}
          </div>
        )}
        {policy?.affectedRegions && policy.affectedRegions.length > 0 && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            영향 리전: {policy.affectedRegions.join(", ")}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 12,
          opacity: 0.8,
          marginBottom: 16,
          padding: 8,
          background: "#fef3c7",
          borderRadius: 4,
        }}
      >
        ⚠️ 이 설정은 즉시 전체 시스템에 반영됩니다.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => setMode("normal")}
          disabled={saving}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: policy?.mode === "normal" ? "#22c55e" : "#fff",
            color: policy?.mode === "normal" ? "#fff" : "#000",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Normal
        </button>

        <button
          onClick={() => setMode("read_only", "DR 시뮬레이션: 읽기 전용 모드")}
          disabled={saving}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: policy?.mode === "read_only" ? "#f59e0b" : "#fff",
            color: policy?.mode === "read_only" ? "#fff" : "#000",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Read Only
        </button>

        <button
          onClick={() => setMode("write_blocked", "DR 시뮬레이션: 쓰기/승인 차단")}
          disabled={saving}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: policy?.mode === "write_blocked" ? "#ef4444" : "#fff",
            color: policy?.mode === "write_blocked" ? "#fff" : "#000",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Write Blocked
        </button>

        <button
          onClick={async () => {
            const message = "DR 시뮬레이션: 리전 장애";
            setSaving(true);
            try {
              await setDoc(
                doc(db, "_drPolicies", tenantId),
                {
                  tenantId,
                  mode: "region_down",
                  affectedRegions: ["us-central1"],
                  message,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            } catch (error) {
              console.error("[DrControlPanel] 저장 실패:", error);
              alert("DR 모드 변경 실패");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: policy?.mode === "region_down" ? "#dc2626" : "#fff",
            color: policy?.mode === "region_down" ? "#fff" : "#000",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Region Down
        </button>
      </div>
    </div>
  );
}

