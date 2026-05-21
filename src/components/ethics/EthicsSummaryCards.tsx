/**
 * Ethics 요약 카드 UI
 */

import React from "react";

export function EthicsSummaryCards({ stats }: { stats: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      <Card title="Total Decisions" value={stats.total} />
      <Card title="Allowed" value={stats.allow} color="#22c55e" />
      <Card title="Review Required" value={stats.review} color="#f59e0b" />
      <Card title="Blocked" value={stats.block} color="#ef4444" />
    </div>
  );
}

function Card({ title, value, color }: { title: string; value: number; color?: string }) {
  return (
    <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ opacity: 0.7, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: color || "#000", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

