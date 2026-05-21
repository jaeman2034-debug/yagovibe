/**
 * ApprovalDetailDrawer: 승인 상세 Drawer
 * 
 * - pending 승인/반려 버튼
 * - before/after 표시 (간단 JSON)
 * - 관리자 전용 가드
 */

import React, { useMemo, useState, useEffect } from "react";
import { applyApproval, rejectApproval } from "@/lib/approvals/applyApproval";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { DiffViewer } from "@/components/common/DiffViewer";

type Props = {
  auditId: string;
  onClose: () => void;
  onChanged: () => void; // 승인 후 리스트 리프레시
};

export function ApprovalDetailDrawer({ auditId, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [approval, setApproval] = useState<any | null>(null);
  const [note, setNote] = useState("");

  const userId = user?.uid ?? "unknown-user";
  // TODO: 실제 권한 체크로 교체 (useIsAssociationAdmin 등)
  const role: "admin" | "editor" | "viewer" = "admin"; // 임시

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "_approvals", auditId));
      setApproval(snap.exists() ? snap.data() : null);
    })();
  }, [auditId]);

  const isPending = approval?.status === "pending";
  const canDecide = role === "admin";

  const onApprove = async () => {
    if (!canDecide || !isPending) return;
    setLoading(true);
    try {
      await applyApproval({ auditId, decidedBy: userId, decisionNote: note });
      onChanged();
      onClose();
    } catch (error) {
      console.error("승인 실패:", error);
      alert("승인에 실패했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const onReject = async () => {
    if (!canDecide || !isPending) return;
    setLoading(true);
    try {
      await rejectApproval({ auditId, decidedBy: userId, decisionNote: note });
      onChanged();
      onClose();
    } catch (error) {
      console.error("반려 실패:", error);
      alert("반려에 실패했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (!approval) return <div style={{ padding: 16 }}>승인 요청을 불러오는 중...</div>;

  return (
    <div style={{ padding: 16, borderLeft: "1px solid #ddd" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h3>Approval Detail</h3>
        <button onClick={onClose}>닫기</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div><b>Status:</b> {approval.status}</div>
        <div><b>Collection:</b> {approval.collection}</div>
        <div><b>Action:</b> {approval.action}</div>
        <div><b>DocId:</b> {approval.docId ?? "(new)"}</div>
        <div><b>EthicsScore:</b> {approval.ethicsScore}</div>
        <div><b>Reasons:</b> {(approval.ethicsReasons ?? []).join(" / ")}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Decision Note</b>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={{ width: "100%", marginTop: 6 }}
          placeholder="승인/반려 사유(옵션)"
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <DiffViewer before={approval.before} after={approval.payload} />
      </div>

      {approval.status === "approved" && approval.appliedDocId ? (
        <div style={{ marginTop: 12, padding: 12, background: "#f0f9ff", borderRadius: 8, opacity: 0.9 }}>
          <div><b>✅ 적용 완료</b></div>
          <div style={{ marginTop: 4, fontSize: 14 }}>
            적용 문서 ID: {approval.appliedDocId}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
            이 변경은 Version 히스토리에서 롤백 가능합니다.
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {canDecide && isPending ? (
          <>
            <button disabled={loading} onClick={onApprove}>승인 적용</button>
            <button disabled={loading} onClick={onReject}>반려</button>
          </>
        ) : (
          <div style={{ opacity: 0.7 }}>
            {role !== "admin" ? "관리자만 승인/반려 가능" : "이미 처리됨"}
          </div>
        )}
      </div>
    </div>
  );
}

