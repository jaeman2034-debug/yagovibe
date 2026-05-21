/**
 * Ethics Decision 테이블 (최근 판단)
 */

import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function EthicsDecisionTable({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setRows([]);
      return;
    }

    // 기존 구독 정리
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // 인덱스 없이도 동작하도록 단순 쿼리 사용 (orderBy 제거)
    const q = query(
      collection(db, "_ethicsDecisions"),
      where("tenantId", "==", tenantId),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 클라이언트에서 정렬 (인덱스 없이도 동작)
        docs.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime; // 최신순
        });
        setRows(docs.slice(0, 30)); // 최대 30개만 표시
      },
      (error) => {
        console.error("EthicsDecisionTable onSnapshot error:", error);
        setRows([]); // 에러 시 빈 배열로 설정
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [tenantId]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd", background: "#f9fafb" }}>
            <th style={{ padding: 12, textAlign: "left" }}>Time</th>
            <th style={{ padding: 12, textAlign: "left" }}>Collection</th>
            <th style={{ padding: 12, textAlign: "left" }}>Action</th>
            <th style={{ padding: 12, textAlign: "left" }}>Score</th>
            <th style={{ padding: 12, textAlign: "left" }}>Verdict</th>
            <th style={{ padding: 12, textAlign: "left" }}>Reasons</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 24, textAlign: "center", opacity: 0.6 }}>
                판단 기록이 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 12, fontSize: 13 }}>
                  {r.createdAt?.toDate?.().toLocaleString?.() ?? "-"}
                </td>
                <td style={{ padding: 12 }}>{r.collection}</td>
                <td style={{ padding: 12 }}>{r.action}</td>
                <td style={{ padding: 12, fontWeight: 500 }}>{r.score}</td>
                <td style={{ padding: 12 }}>
                  <span
                    style={{
                      color:
                        r.verdict === "block"
                          ? "#ef4444"
                          : r.verdict === "review_required"
                          ? "#f59e0b"
                          : "#22c55e",
                      fontWeight: 600,
                    }}
                  >
                    {r.verdict}
                  </span>
                </td>
                <td style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                  {(r.reasons ?? []).join(" / ") || "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

