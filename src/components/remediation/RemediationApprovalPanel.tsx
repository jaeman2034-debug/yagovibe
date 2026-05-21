/**
 * ✅ COMMIT 25: Remediation 승인 패널
 */

import React from "react";
import { approveRemediation, rejectRemediation } from "@/lib/remediation/requestRemediationApproval";
import { useRemediationApprovals } from "@/lib/remediation/useRemediationApprovals";

export function RemediationApprovalPanel({ tenantId }: { tenantId: string }) {
  const approvals = useRemediationApprovals(tenantId);
  const [processing, setProcessing] = React.useState<string | null>(null);

  const handleApprove = async (approvalId: string) => {
    setProcessing(approvalId);
    try {
      await approveRemediation({ approvalId });
      // 성공 시 자동으로 목록에서 제거됨 (실시간 구독)
    } catch (error: any) {
      console.error("[RemediationApprovalPanel] 승인 실패:", error);
      alert(`승인 실패: ${error?.message ?? "알 수 없는 오류"}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    if (!confirm("Auto-Remediation을 중단하시겠습니까? 완화 조치가 즉시 해제됩니다.")) {
      return;
    }

    setProcessing(approvalId);
    try {
      await rejectRemediation({ approvalId });
      // 성공 시 자동으로 목록에서 제거됨 (실시간 구독)
    } catch (error: any) {
      console.error("[RemediationApprovalPanel] 중단 실패:", error);
      alert(`중단 실패: ${error?.message ?? "알 수 없는 오류"}`);
    } finally {
      setProcessing(null);
    }
  };

  if (!approvals.length) return null;

  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16, background: "#fff" }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        Auto-Remediation 승인 요청
      </div>
      {approvals.map((approval) => (
        <div
          key={approval.id}
          style={{
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <div style={{ marginBottom: 8, fontSize: 14 }}>
            <b>Actions:</b> {(approval.actions ?? []).join(", ")}
          </div>
          <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.7 }}>
            Requested at: {approval.requestedAt?.toDate?.()?.toLocaleString() ?? ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleApprove(approval.id)}
              disabled={processing === approval.id}
              style={{
                padding: "6px 12px",
                border: "1px solid #22c55e",
                borderRadius: 4,
                background: "#22c55e",
                color: "#fff",
                cursor: processing === approval.id ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              {processing === approval.id ? "처리 중..." : "승인"}
            </button>
            <button
              onClick={() => handleReject(approval.id)}
              disabled={processing === approval.id}
              style={{
                padding: "6px 12px",
                border: "1px solid #ef4444",
                borderRadius: 4,
                background: "#fff",
                color: "#ef4444",
                cursor: processing === approval.id ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              {processing === approval.id ? "처리 중..." : "중단"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

