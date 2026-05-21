/**
 * ✅ 완전 자동화 모드 전환 스위치
 */

import React from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AutoModeStatus, AutoModeConfig } from "@/lib/operations/autoMode";
import { AUTOMATION_DECLARATION } from "@/lib/operations/autoMode";

export function AutoModeSwitch({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = React.useState<AutoModeStatus>("full-auto");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    // TODO: 실제로는 _autoModeConfig 컬렉션에서 로드
    // const loadConfig = async () => { ... };
  }, [tenantId]);

  const setAutoMode = async (newStatus: AutoModeStatus) => {
    if (newStatus === "emergency-off" && !confirm("긴급 중단을 활성화하시겠습니까? 모든 자동화가 즉시 중단됩니다.")) {
      return;
    }

    setSaving(true);
    try {
      const config: AutoModeConfig = {
        status: newStatus,
        enabled: newStatus !== "emergency-off",
        auditLevel: "full",
        emergencyKillEnabled: true,
        lastUpdated: Date.now(),
        updatedBy: "admin", // TODO: 실제 userId
      };

      await setDoc(
        doc(db, "_autoModeConfig", tenantId),
        {
          ...config,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setStatus(newStatus);
    } catch (error) {
      console.error("[AutoModeSwitch] 저장 실패:", error);
      alert("자동화 모드 변경 실패");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (s: AutoModeStatus) => {
    if (s === "full-auto") return "#22c55e";
    if (s === "semi-auto") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div
      style={{
        border: `2px solid ${getStatusColor(status)}`,
        padding: 16,
        borderRadius: 8,
        background: "#fff",
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
        🤖 완전 자동화 모드
      </div>
      <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
        {AUTOMATION_DECLARATION.declaration}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>현재 모드:</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: getStatusColor(status),
            marginBottom: 4,
          }}
        >
          {status === "full-auto" ? "FULL-AUTO" : status === "semi-auto" ? "SEMI-AUTO" : "EMERGENCY-OFF"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setAutoMode("full-auto")}
          disabled={saving || status === "full-auto"}
          style={{
            padding: "8px 16px",
            border: "1px solid #22c55e",
            borderRadius: 4,
            background: status === "full-auto" ? "#22c55e" : "#fff",
            color: status === "full-auto" ? "#fff" : "#22c55e",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          Full-Auto
        </button>
        <button
          onClick={() => setAutoMode("semi-auto")}
          disabled={saving || status === "semi-auto"}
          style={{
            padding: "8px 16px",
            border: "1px solid #f59e0b",
            borderRadius: 4,
            background: status === "semi-auto" ? "#f59e0b" : "#fff",
            color: status === "semi-auto" ? "#fff" : "#f59e0b",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          Semi-Auto
        </button>
        <button
          onClick={() => setAutoMode("emergency-off")}
          disabled={saving}
          style={{
            padding: "8px 16px",
            border: "1px solid #ef4444",
            borderRadius: 4,
            background: status === "emergency-off" ? "#ef4444" : "#fff",
            color: status === "emergency-off" ? "#fff" : "#ef4444",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          🚨 Emergency Kill
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        <div>✅ 자동 감지 → 완화 → 복구 → 학습 → 검증</div>
        <div>❌ 영구 변경/승인 자동화 금지</div>
        <div>✅ 모든 조치 설명 + 링크 제공</div>
        <div>✅ 실패 시 즉시 롤백</div>
      </div>
    </div>
  );
}

