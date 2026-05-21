/**
 * ✅ COMMIT 14: Incident Summary Panel
 */

import React from "react";

export interface IncidentSummaryData {
  summary: string;
  recommendation: string;
  checklist: string[];
  sourceCounts?: {
    audit?: number;
    ethics?: number;
    approvals?: number;
    policyChanges?: number;
  };
}

export function IncidentSummaryPanel({ data }: { data: IncidentSummaryData | null }) {
  if (!data) {
    return <div style={{ opacity: 0.7, padding: 12 }}>요약 없음</div>;
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
        background: "#f9fafb",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>AI Incident Summary</div>
      
      <div style={{ marginTop: 8, lineHeight: 1.6 }}>{data.summary}</div>
      
      <div style={{ marginTop: 12, opacity: 0.85 }}>
        <b>Recommendation:</b> {data.recommendation}
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Checklist</b>
        <ul style={{ marginTop: 4, paddingLeft: 20 }}>
          {(data.checklist ?? []).map((c: string, idx: number) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {c}
            </li>
          ))}
        </ul>
      </div>

      {data.sourceCounts && (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          counts: audit {data.sourceCounts.audit ?? 0}, ethics {data.sourceCounts.ethics ?? 0},
          approvals {data.sourceCounts.approvals ?? 0}, policy {data.sourceCounts.policyChanges ?? 0}
        </div>
      )}
    </div>
  );
}

