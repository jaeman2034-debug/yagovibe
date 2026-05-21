/**
 * DiffViewer: Before / After 시각화
 * 
 * 승인 요청의 변경사항을 시각적으로 비교
 */

import React from "react";

export function DiffViewer({ before, after }: { before: any; after: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div>
        <b>Before</b>
        <pre style={{ background: "#f7f7f7", padding: 8, height: 260, overflow: "auto" }}>
          {JSON.stringify(before ?? null, null, 2)}
        </pre>
      </div>
      <div>
        <b>After</b>
        <pre style={{ background: "#f7f7f7", padding: 8, height: 260, overflow: "auto" }}>
          {JSON.stringify(after ?? null, null, 2)}
        </pre>
      </div>
    </div>
  );
}

