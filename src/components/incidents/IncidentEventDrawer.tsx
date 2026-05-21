/**
 * 운영 사고 이벤트 상세 Drawer
 * 
 * 원본 raw JSON 및 관련 이벤트 표시
 */

import React, { useMemo } from "react";
import type { IncidentEvent } from "@/types/incident";
import { DiffViewer } from "@/components/common/DiffViewer";

export function IncidentEventDrawer({
  event,
  allEvents,
  onClose,
}: {
  event: IncidentEvent;
  allEvents: IncidentEvent[];
  onClose: () => void;
}) {
  const key = event.auditId || event.approvalId || event.policyChangeId;

  const related = useMemo(() => {
    if (!key) return [];
    return allEvents.filter(
      (e) =>
        e.id !== event.id &&
        (e.auditId || e.approvalId || e.policyChangeId) === key
    );
  }, [allEvents, key, event.id]);

  const before = event.raw?.before ?? null;
  const after = event.raw?.after ?? event.raw?.payload ?? null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 480,
        height: "100vh",
        background: "white",
        borderLeft: "1px solid #ddd",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
        zIndex: 1000,
        overflowY: "auto",
      }}
    >
      <div style={{ padding: 16, borderBottom: "1px solid #ddd" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Event Detail</h3>
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: 4,
              background: "white",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ marginTop: 8 }}>
          <div>
            <b>Source:</b> {event.source}
          </div>
          <div>
            <b>Time:</b> {event.timestamp.toLocaleString()}
          </div>
          {event.collection ? (
            <div>
              <b>Target:</b> {event.collection}/{event.docId ?? "(new)"}
            </div>
          ) : null}
          {key ? (
            <div>
              <b>Correlation:</b> {key}
            </div>
          ) : null}
        </div>

        {before || after ? (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Before / After</h4>
            <DiffViewer before={before} after={after} />
          </div>
        ) : null}

        {related.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Related Events ({related.length})</h4>
            <ul style={{ listStyle: "disc", paddingLeft: 20 }}>
              {related.map((r) => (
                <li key={`${r.source}-${r.id}`} style={{ marginBottom: 4, fontSize: 13 }}>
                  {r.source} · {r.title} · {r.timestamp.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 8 }}>Raw</h4>
          <pre
            style={{
              background: "#f7f7f7",
              padding: 10,
              borderRadius: 8,
              overflow: "auto",
              maxHeight: 260,
              fontSize: 12,
            }}
          >
            {JSON.stringify(event.raw, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}










