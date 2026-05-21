/**
 * ✅ COMMIT 25: Remediation 승인 처리
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { clearActiveRemediation } from "./clearActiveRemediation";

const db = admin.firestore();

/**
 * ✅ COMMIT 25: Remediation 승인
 */
export async function approveRemediation(input: {
  approvalId: string;
  userId: string;
  extendMinutes?: number; // TTL 연장 (선택)
}): Promise<void> {
  const { approvalId, userId, extendMinutes } = input;

  const approvalRef = db.collection("_remediationApprovals").doc(approvalId);
  const approvalSnap = await approvalRef.get();

  if (!approvalSnap.exists) {
    throw new Error("Approval not found");
  }

  const approval = approvalSnap.data() as any;
  if (approval.status !== "pending") {
    throw new Error("Approval already processed");
  }

  await approvalRef.update({
    status: "approved",
    resolvedBy: userId,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // TTL 연장 (옵션)
  if (extendMinutes && extendMinutes > 0) {
    const remediationRef = db.collection("_activeRemediations").doc(approval.tenantId);
    const remediationSnap = await remediationRef.get();

    if (remediationSnap.exists) {
      const remediation = remediationSnap.data() as any;
      const currentExpiresAt = remediation.expiresAt?.toDate?.() ?? new Date(remediation.expiresAt);
      const newExpiresAt = new Date(currentExpiresAt.getTime() + extendMinutes * 60000);

      await remediationRef.update({
        expiresAt: admin.firestore.Timestamp.fromDate(newExpiresAt),
      });

      logger.info(
        `[approveRemediation] TTL 연장: ${approval.tenantId}, +${extendMinutes}분`
      );
    }
  }

  // Audit 로그
  await db.collection("_auditLogs").add({
    tenantId: approval.tenantId,
    action: "remediation.approved",
    collection: "_remediationApprovals",
    docId: approvalId,
    after: { status: "approved", resolvedBy: userId },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`[approveRemediation] 완료: ${approvalId}`);
}

/**
 * ✅ COMMIT 25: Remediation 중단 (reject)
 */
export async function rejectRemediation(input: {
  approvalId: string;
  userId: string;
}): Promise<void> {
  const { approvalId, userId } = input;

  const approvalRef = db.collection("_remediationApprovals").doc(approvalId);
  const approvalSnap = await approvalRef.get();

  if (!approvalSnap.exists) {
    throw new Error("Approval not found");
  }

  const approval = approvalSnap.data() as any;
  if (approval.status !== "pending") {
    throw new Error("Approval already processed");
  }

  await approvalRef.update({
    status: "rejected",
    resolvedBy: userId,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ✅ COMMIT 25: 즉시 완화 해제
  await clearActiveRemediation(approval.tenantId);

  // Audit 로그
  await db.collection("_auditLogs").add({
    tenantId: approval.tenantId,
    action: "remediation.rejected",
    collection: "_remediationApprovals",
    docId: approvalId,
    after: { status: "rejected", resolvedBy: userId },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`[rejectRemediation] 완료: ${approvalId}`);
}

