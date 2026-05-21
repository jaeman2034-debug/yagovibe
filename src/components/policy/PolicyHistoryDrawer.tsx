/**
 * 정책 변경 이력 Drawer
 * 
 * 정책 변경 이력을 표시하고 롤백 기능 제공
 */

import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { rollbackPolicy } from "@/lib/policy/rollbackPolicy";
import { useAuth } from "@/context/AuthProvider";

export function PolicyHistoryDrawer({
  tenantId,
  onClose,
}: {
  tenantId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const userId = user?.uid ?? "unknown-user";
  // TODO: 실제 권한 체크로 교체
  const role: "admin" | "editor" | "viewer" = "admin"; // 임시

  const [rows, setRows] = useState<any[]>([]);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
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

    // 인덱스 없이도 동작하도록 단순 쿼리 사용
    const q = query(collection(db, "_policyChanges"), where("tenantId", "==", tenantId));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 클라이언트에서 정렬 (최신순)
        list.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });
        setRows(list);
      },
      (error) => {
        console.error("Policy history 로드 실패:", error);
        setRows([]);
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

  const handleRollback = async (changeId: string) => {
    if (!confirm("이 정책으로 롤백하시겠습니까?")) return;

    setRollingBack(changeId);
    try {
      await rollbackPolicy({ tenantId, changeId, userId });
      alert("정책 롤백 완료");
      // TODO: 정책 페이지 새로고침 또는 상태 업데이트
    } catch (error: any) {
      console.error("정책 롤백 실패:", error);
      alert(`정책 롤백 실패: ${error.message}`);
    } finally {
      setRollingBack(null);
    }
  };

  if (role !== "admin") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 420,
        height: "100vh",
        background: "white",
        borderLeft: "1px solid #ddd",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
        zIndex: 1000,
        overflowY: "auto",
      }}
    >
      <div style={{ padding: 16, borderBottom: "1px solid #ddd" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Policy History</h3>
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
        {rows.length === 0 ? (
          <div style={{ opacity: 0.6, fontStyle: "italic" }}>정책 변경 이력이 없습니다.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                marginTop: 8,
                background: r.rollbackFrom ? "#f9fafb" : "white",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {r.createdAt?.toDate?.().toLocaleString?.() ?? "-"} · by {r.createdBy?.slice(0, 8) ?? "unknown"}
              </div>

              {r.rollbackFrom && (
                <div style={{ marginTop: 4, fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
                  ⚠️ 롤백됨
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>시뮬레이션 결과</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  Risk: <strong>{r.simulationResult?.riskScore ?? "-"}</strong>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Allow/Review/Block = {r.simulationResult?.allow ?? 0}/{r.simulationResult?.review ?? 0}/
                  {r.simulationResult?.block ?? 0}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>정책 변경</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  Threshold: allow={r.after?.thresholds?.allow ?? "-"} / review={r.after?.thresholds?.review ?? "-"}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Weights: t={r.after?.weights?.transparency ?? "-"} / a={r.after?.weights?.accountability ?? "-"} /
                  f={r.after?.weights?.fairness ?? "-"} / h={r.after?.weights?.humanFirst ?? "-"}
                </div>
              </div>

              {!r.rollbackFrom && (
                <button
                  onClick={() => handleRollback(r.changeId)}
                  disabled={rollingBack === r.changeId}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    background: rollingBack === r.changeId ? "#ccc" : "#3b82f6",
                    color: "white",
                    cursor: rollingBack === r.changeId ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {rollingBack === r.changeId ? "롤백 중..." : "이 정책으로 롤백"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

