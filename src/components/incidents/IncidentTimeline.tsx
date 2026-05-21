/**
 * 운영 사고 타임라인 UI
 * 
 * 이벤트 리스트를 시간순으로 표시
 */

import React from "react";
import type { IncidentEvent } from "@/types/incident";

export function IncidentTimeline({
  events,
  onSelect,
  selectedId,
}: {
  events: IncidentEvent[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {events.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", opacity: 0.6 }}>
          이벤트가 없습니다.
        </div>
      ) : (
        events.map((e) => (
          <button
            key={`${e.source}-${e.id}`}
            onClick={() => onSelect(e.id)}
            style={{
              textAlign: "left",
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 10,
              background: selectedId === e.id ? "#f3f3f3" : "white",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b>{e.title}</b>
              <span style={{ opacity: 0.7, fontSize: 12 }}>
                {e.timestamp.toLocaleString()}
              </span>
            </div>
            {e.collection ? (
              <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
                {e.collection}/{e.docId ?? "(new)"}
              </div>
            ) : null}
            {e.summary ? (
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                {e.summary}
              </div>
            ) : null}
            {e.auditId || e.approvalId || e.policyChangeId ? (
              <div style={{ opacity: 0.55, fontSize: 11, marginTop: 6 }}>
                key: {e.auditId ?? e.approvalId ?? e.policyChangeId}
              </div>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}










