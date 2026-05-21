/**
 * ✅ COMMIT 20: Copilot Chat UI 컴포넌트
 */

import React from "react";
import { requestOpsCopilot } from "@/lib/copilot/requestCopilot";
import type { CopilotAnswer } from "@/types/copilot";

export function CopilotChat({ tenantId }: { tenantId: string }) {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [ans, setAns] = React.useState<CopilotAnswer | null>(null);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res: any = await requestOpsCopilot({ tenantId, question: q.trim() });
      if (res.ok && res.answer) {
        setAns(res.answer);
      } else {
        alert(res.error || "답변 생성 실패");
      }
    } catch (error: any) {
      console.error("[CopilotChat] 요청 실패:", error);
      alert("질의 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 820 }}>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder='예: "어제 왜 경보 울렸어?" / "승인 대기 왜 늘었지?"'
        style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10, minHeight: 90 }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            ask();
          }
        }}
      />
      <button onClick={ask} disabled={loading || !q.trim()} style={{ padding: "10px 20px", borderRadius: 6, background: "#3b82f6", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "조회 중..." : "질의"}
      </button>

      {ans ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, background: "#fff" }}>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ans.answer}</div>

          {ans.evidence && ans.evidence.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <b>Evidence</b>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {ans.evidence.map((e, idx) => (
                  <li key={`${e.source}-${e.id}-${idx}`} style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{e.source}</span> · {e.id}{" "}
                    {e.timestamp ? `· ${new Date(e.timestamp).toLocaleString()}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ans.checklist && ans.checklist.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <b>Checklist</b>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {ans.checklist.map((c, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ans.links && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee" }}>
              <b>Links</b>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {ans.links.incidentReplayUrl && (
                  <a
                    href={ans.links.incidentReplayUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14 }}
                  >
                    → Incident Replay 열기
                  </a>
                )}
                {ans.links.sentryQueryUrl && (
                  <a
                    href={ans.links.sentryQueryUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14 }}
                  >
                    → Sentry 열기
                  </a>
                )}
                {ans.links.datadogLogsUrl && (
                  <a
                    href={ans.links.datadogLogsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14 }}
                  >
                    → Datadog Logs
                  </a>
                )}
                {ans.links.datadogApmUrl && (
                  <a
                    href={ans.links.datadogApmUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14 }}
                  >
                    → Datadog APM
                  </a>
                )}
              </div>
            </div>
          )}

          {ans.limits && (
            <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7, paddingTop: 12, borderTop: "1px solid #eee" }}>
              tenant: {ans.limits.tenantId} · from {ans.limits.from} · to {ans.limits.to}
              {ans.limits.capped ? " · (결과 일부만 반영됨)" : ""}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

