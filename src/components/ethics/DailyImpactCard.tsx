/**
 * 일간 Impact 요약 카드 컴포넌트
 */

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requestDailyImpactSummary } from "@/lib/api/ai";

export function DailyImpactCard({ tenantId }: { tenantId: string }) {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const reportId = `${tenantId}_${today}`;

  useEffect(() => {
    if (!tenantId) return;

    const loadReport = async () => {
      try {
        const ref = doc(db, "_dailyReports", reportId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setReport(snap.data());
        }
      } catch (error) {
        console.error("일간 리포트 로드 실패:", error);
      }
    };

    loadReport();
  }, [tenantId, reportId]);

  const handleGenerate = async () => {
    if (generating) return;

    setGenerating(true);
    try {
      await requestDailyImpactSummary(tenantId, today);
      // 생성 완료 후 잠시 대기 후 다시 로드
      setTimeout(async () => {
        const ref = doc(db, "_dailyReports", reportId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setReport(snap.data());
        }
        setGenerating(false);
      }, 2000);
    } catch (error) {
      console.error("일간 리포트 생성 요청 실패:", error);
      setGenerating(false);
    }
  };

  return (
    <div style={{ marginTop: 32, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Daily Impact Report ({today})</h3>
        {!report && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: "6px 12px",
              background: generating ? "#ccc" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: generating ? "not-allowed" : "pointer",
            }}
          >
            {generating ? "생성 중..." : "생성"}
          </button>
        )}
      </div>

      {report ? (
        <div style={{ display: "grid", gap: 12 }}>
          {report.summary && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>요약</div>
              <div style={{ opacity: 0.85 }}>{report.summary}</div>
            </div>
          )}
          {report.risks && report.risks.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>위험 요소</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {report.risks.map((risk: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: 4 }}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
          {report.actions && report.actions.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>권장 조치</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {report.actions.map((action: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: 4 }}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div style={{ opacity: 0.6, fontStyle: "italic" }}>
          일간 리포트가 아직 생성되지 않았습니다. "생성" 버튼을 클릭하세요.
        </div>
      )}
    </div>
  );
}

