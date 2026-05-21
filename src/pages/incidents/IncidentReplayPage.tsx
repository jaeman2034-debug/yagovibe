/**
 * 운영 사고 재현 페이지
 * 
 * Audit/Ethics/Approval/PolicyChange를 시간축으로 합쳐서 보여줌
 */

import React, { useState, useEffect } from "react";
import { loadIncidentTimeline } from "@/lib/incidents/loadIncidentTimeline";
import { IncidentTimeline } from "@/components/incidents/IncidentTimeline";
import { IncidentEventDrawer } from "@/components/incidents/IncidentEventDrawer";
import { IncidentSummaryPanel, type IncidentSummaryData } from "@/components/incidents/IncidentSummaryPanel";
import { requestIncidentSummary } from "@/lib/incidents/requestIncidentSummary";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { IncidentEvent } from "@/types/incident";
import { useAuth } from "@/context/AuthProvider";

export function IncidentReplayPage() {
  const { user } = useAuth();
  // TODO: 실제 tenantId/associationId 가져오기
  const tenantId = "assoc-nowon-football"; // 임시 (실제로는 useParams 또는 context에서)
  // TODO: 실제 권한 체크로 교체 (useIsAssociationAdmin 등)
  const role: "admin" | "editor" | "viewer" = "admin"; // 임시

  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<IncidentSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fromTo = () => {
    const now = Date.now();
    const ms = range === "24h" ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
    return { from: new Date(now - ms), to: new Date(now) };
  };

  const hashKey = (tenantId: string, fromIso: string, toIso: string): string => {
    return `${tenantId}_${fromIso}_${toIso}`.replace(/[:.]/g, "_");
  };

  const loadSummary = async (fromIso: string, toIso: string) => {
    try {
      const key = hashKey(tenantId, fromIso, toIso);
      const snap = await getDoc(doc(db, "_incidentSummaries", key));
      setSummary(snap.exists() ? (snap.data() as IncidentSummaryData) : null);
    } catch (error) {
      console.error("요약 로드 실패:", error);
      setSummary(null);
    }
  };

  const onGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const { from, to } = fromTo();
      const fromIso = from.toISOString();
      const toIso = to.toISOString();

      await requestIncidentSummary({ tenantId, from: fromIso, to: toIso });
      await loadSummary(fromIso, toIso);
    } catch (error) {
      console.error("요약 생성 실패:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const reload = async () => {
    setLoading(true);
    try {
      const { from, to } = fromTo();
      const list = await loadIncidentTimeline({ tenantId, from, to });
      setEvents(list);
      if (list.length > 0 && !selected) {
        setSelected(list[list.length - 1].id); // 최신 이벤트 선택
      }
    } catch (error) {
      console.error("타임라인 로드 실패:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin" && tenantId) {
      reload();
      const { from, to } = fromTo();
      loadSummary(from.toISOString(), to.toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, range, role]);

  if (role !== "admin") {
    return <div style={{ padding: 16 }}>관리자만 접근 가능합니다.</div>;
  }

  const selectedEvent = events.find((e) => e.id === selected) ?? null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: selected ? "1fr 480px" : "1fr",
        height: "100vh",
      }}
    >
      <div style={{ padding: 16, overflowY: "auto" }}>
        <h2 style={{ marginBottom: 16 }}>Incident Replay</h2>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as "24h" | "7d")}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
          >
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
          </select>
          <button
            onClick={reload}
            disabled={loading}
            style={{
              padding: "6px 12px",
              background: loading ? "#ccc" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "로딩..." : "새로고침"}
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            총 {events.length}개 이벤트
          </span>
          <button
            onClick={onGenerateSummary}
            disabled={summaryLoading}
            style={{
              padding: "6px 12px",
              background: summaryLoading ? "#ccc" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: summaryLoading ? "not-allowed" : "pointer",
              fontWeight: 600,
              marginLeft: 8,
            }}
          >
            {summaryLoading ? "생성 중..." : "AI 요약 생성"}
          </button>
        </div>

        <IncidentSummaryPanel data={summary} />

        <div style={{ marginTop: 16 }}>
          <IncidentTimeline events={events} onSelect={setSelected} selectedId={selected} />
        </div>
      </div>

      {selectedEvent ? (
        <IncidentEventDrawer
          event={selectedEvent}
          allEvents={events}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}



