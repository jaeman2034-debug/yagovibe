/**
 * 시뮬레이션 결과 카드 UI
 */

import React from "react";

export function SimulationResultCards({ result, impact }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      <Card title="Total Decisions" value={result.total} />
      <Card title="Allow" value={result.allow} color="#22c55e" />
      <Card title="Review" value={result.review} color="#f59e0b" />
      <Card title="Block" value={result.block} color="#ef4444" />
      <Card title="Predicted Delay (min)" value={impact.predictedApprovalDelayMin} />
      <Card
        title="Risk Score"
        value={impact.riskScore}
        color={impact.riskScore > 70 ? "#ef4444" : impact.riskScore > 50 ? "#f59e0b" : "#22c55e"}
      />
    </div>
  );
}

function Card({ title, value, color }: { title: string; value: number; color?: string }) {
  return (
    <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ opacity: 0.7, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: color || "#000", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

