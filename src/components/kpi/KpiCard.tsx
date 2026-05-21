/**
 * ✅ COMMIT 23: KPI 카드 컴포넌트
 */

import React from "react";

export function KpiCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        minWidth: 200,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.6 }}>{sub}</div>}
    </div>
  );
}

