/**
 * ApprovalListPage: 승인 목록 페이지
 * 
 * - pending 리스트
 * - 클릭하면 DetailDrawer 오픈
 * - 관리자만 접근
 */

import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ApprovalDetailDrawer } from "@/components/approvals/ApprovalDetailDrawer";
import { useAuth } from "@/context/AuthProvider";

export function ApprovalListPage() {
  const { user } = useAuth();
  // TODO: 실제 tenantId/associationId 가져오기
  const tenantId = "assoc-nowon-football"; // 임시 (실제로는 useParams 또는 context에서)
  // TODO: 실제 권한 체크로 교체 (useIsAssociationAdmin 등)
  const role: "admin" | "editor" | "viewer" = "admin"; // 임시

  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (role !== "admin" || !tenantId) {
      setRows([]);
      return;
    }

    // 기존 구독 정리
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // tenantId 스코프 (승인도 테넌트별로 관리)
    // 인덱스 없이도 동작하도록 단순 쿼리 사용 (orderBy 제거)
    const q = query(
      collection(db, "_approvals"),
      where("tenantId", "==", tenantId),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 클라이언트에서 정렬 (인덱스 없이도 동작)
        list.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime; // 최신순
        });
        setRows(list);
      },
      (error) => {
        console.error("ApprovalListPage onSnapshot error:", error);
        setRows([]); // 에러 시 빈 배열로 설정
      }
    );

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [tenantId, role]);

  const onChanged = () => {
    // onSnapshot이라 자동 갱신되지만, 훅 포인트 남겨둠
  };

  if (role !== "admin") {
    return <div style={{ padding: 16 }}>관리자만 접근 가능합니다.</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", height: "100%" }}>
      <div style={{ padding: 16 }}>
        <h2>Approvals (Pending)</h2>
        {rows.length === 0 ? (
          <div style={{ marginTop: 12, opacity: 0.7 }}>대기중 승인 요청 없음</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                style={{
                  textAlign: "left",
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: selected === r.id ? "#f3f3f3" : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>{r.collection}</b>
                  <span>{r.action}</span>
                </div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  doc: {r.docId ?? "(new)"} · ethics: {r.ethicsScore}
                </div>
                <div style={{ opacity: 0.7, marginTop: 4, fontSize: 12 }}>
                  {(r.ethicsReasons ?? []).join(" / ")}
                </div>
                {/* ✅ AI 요약 표시 */}
                {r.summary ? (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontStyle: "italic" }}>
                    📝 {r.summary}
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 11, opacity: 0.5 }}>
                    요약 생성 중...
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <ApprovalDetailDrawer
          auditId={selected}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      ) : null}
    </div>
  );
}

