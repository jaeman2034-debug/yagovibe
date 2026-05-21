/**
 * ✅ COMMIT 19: Approval 적용 시 DR 체크
 * ✅ COMMIT 21: Chaos Engineering 주입
 * 승인 적용 전 DR 정책 확인
 */

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { drApprove } from "@/lib/firebase/firestoreProxy";
import { getChaosPolicy, maybeChaos } from "@/lib/chaos/chaosInjector";

/**
 * Approval 적용 전 DR 체크 + Chaos 주입
 * (실제 approval 적용 함수는 별도로 존재한다고 가정)
 */
export async function applyApprovalWithDrCheck(input: {
  tenantId: string;
  approvalId: string;
  region?: string;
}): Promise<void> {
  // ✅ COMMIT 21: Chaos 주입
  const chaos = await getChaosPolicy(input.tenantId);
  maybeChaos(chaos, "approval_delay");

  // ✅ COMMIT 19: DR 체크 (승인 차단)
  await drApprove({ tenantId: input.tenantId, region: input.region });

  // 이후 실제 approval 적용 로직...
  // (기존 applyApproval 함수 호출)
}

/**
 * Approval 적용
 */
export async function applyApproval(input: {
  auditId?: string;
  approvalId?: string;
  tenantId?: string;
  decidedBy?: string;
  approvedBy?: string;
  userId?: string;
  decisionNote?: string;
}): Promise<void> {
  const id = input.approvalId || input.auditId;
  if (!id) throw new Error("approvalId or auditId is required");
  
  const approvalRef = doc(db, `_approvals/${id}`);
  await updateDoc(approvalRef, {
    status: "approved",
    approvedAt: new Date(),
    approvedBy: input.decidedBy || input.approvedBy || input.userId,
    decisionNote: input.decisionNote,
  });
}

/**
 * Approval 거부
 */
export async function rejectApproval(input: {
  auditId?: string;
  approvalId?: string;
  tenantId?: string;
  decidedBy?: string;
  rejectedBy?: string;
  userId?: string;
  reason?: string;
  rejectionReason?: string;
  decisionNote?: string;
}): Promise<void> {
  const id = input.approvalId || input.auditId;
  if (!id) throw new Error("approvalId or auditId is required");
  
  const approvalRef = doc(db, `_approvals/${id}`);
  await updateDoc(approvalRef, {
    status: "rejected",
    rejectedAt: new Date(),
    rejectedBy: input.decidedBy || input.rejectedBy || input.userId,
    rejectionReason: input.reason || input.rejectionReason || input.decisionNote,
  });
}
