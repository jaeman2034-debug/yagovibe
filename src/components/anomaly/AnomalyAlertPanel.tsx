/**
 * ✅ COMMIT 17: 이상 경보 패널 컴포넌트
 */

import React from "react";
import type { AnomalyAlert } from "@/lib/anomaly/useAnomalyAlerts";

export function AnomalyAlertPanel({ alerts }: { alerts: AnomalyAlert[] }) {
  if (!alerts.length) {
    return (
      <div style={{ padding: 12, opacity: 0.7, textAlign: "center" }}>
        이상 없음
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    return level === "critical" ? "#dc2626" : "#f59e0b";
  };

  const getLevelEmoji = (level: string) => {
    return level === "critical" ? "🚨" : "⚠️";
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 12,
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        🚨 Anomaly Alerts
      </div>
      {alerts.map((a) => (
        <div
          key={a.id}
          style={{
            marginTop: 12,
            padding: 8,
            borderLeft: `4px solid ${getLevelColor(a.anomaly.level)}`,
            background: "#f9fafb",
            borderRadius: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{getLevelEmoji(a.anomaly.level)}</span>
            <span style={{ fontWeight: 600 }}>{a.metric}</span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                background: getLevelColor(a.anomaly.level),
                color: "white",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {a.anomaly.level.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            value: {a.value} / baseline: {a.baseline.avg.toFixed(2)} ± {a.baseline.std.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, fontStyle: "italic" }}>
            {a.anomaly.kind === "zero"
              ? "침묵: 값이 0 또는 미수집"
              : a.anomaly.kind === "drop" && a.anomaly.ratio
              ? `급감: 평균 대비 ${(a.anomaly.ratio * 100).toFixed(1)}%`
              : a.anomaly.kind === "drift" && a.anomaly.slope
              ? `점진 변화: 기울기 ${(a.anomaly.slope * 100).toFixed(2)}%/일`
              : a.anomaly.z
              ? `Z-score: ${a.anomaly.z.toFixed(2)}`
              : "이상 탐지"}
          </div>
          <div style={{ marginTop: 8 }}>
            <a
              href={`/incidents?range=24h`}
              style={{
                color: "#3b82f6",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              → Incident Replay 열기
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

