/**
 * ✅ COMMIT 26: Remediation 효과 평가
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { calcRemediationEffect } from "../../../src/lib/remediation/calcRemediationEffect";

const db = admin.firestore();

/**
 * ✅ COMMIT 26: Remediation 효과 평가 및 저장
 * Before/After 비교 (30분 윈도우)
 */
export async function evaluateRemediationEffect(input: {
  tenantId: string;
  remediationId: string;
  createdAt: Date;
}): Promise<void> {
  const { tenantId, remediationId, createdAt } = input;

  const windowMinutes = 30;
  const beforeStart = new Date(createdAt.getTime() - windowMinutes * 60000);
  const beforeEnd = createdAt;
  const afterStart = createdAt;
  const afterEnd = new Date(createdAt.getTime() + windowMinutes * 60000);

  const beforeStartTs = admin.firestore.Timestamp.fromDate(beforeStart);
  const beforeEndTs = admin.firestore.Timestamp.fromDate(beforeEnd);
  const afterStartTs = admin.firestore.Timestamp.fromDate(afterStart);
  const afterEndTs = admin.firestore.Timestamp.fromDate(afterEnd);

  try {
    // Before: 이전 30분 데이터 수집
    const [beforeAudit, beforeAnomalies, beforeApprovals] = await Promise.all([
      db
        .collection("_auditLogs")
        .where("tenantId", "==", tenantId)
        .where("createdAt", ">=", beforeStartTs)
        .where("createdAt", "<=", beforeEndTs)
        .get(),
      db
        .collection("_anomalies")
        .where("tenantId", "==", tenantId)
        .where("createdAt", ">=", beforeStartTs)
        .where("createdAt", "<=", beforeEndTs)
        .get(),
      db
        .collection("_approvals")
        .where("tenantId", "==", tenantId)
        .where("status", "==", "pending")
        .where("createdAt", "<=", beforeEndTs)
        .get(),
    ]);

    // After: 이후 30분 데이터 수집
    const [afterAudit, afterAnomalies, afterApprovals] = await Promise.all([
      db
        .collection("_auditLogs")
        .where("tenantId", "==", tenantId)
        .where("createdAt", ">=", afterStartTs)
        .where("createdAt", "<=", afterEndTs)
        .get(),
      db
        .collection("_anomalies")
        .where("tenantId", "==", tenantId)
        .where("createdAt", ">=", afterStartTs)
        .where("createdAt", "<=", afterEndTs)
        .get(),
      db
        .collection("_approvals")
        .where("tenantId", "==", tenantId)
        .where("status", "==", "pending")
        .where("createdAt", "<=", afterEndTs)
        .get(),
    ]);

    const before = {
      audit: beforeAudit.size,
      anomalies: beforeAnomalies.size,
      pendingApprovals: beforeApprovals.size,
    };

    const after = {
      audit: afterAudit.size,
      anomalies: afterAnomalies.size,
      pendingApprovals: afterApprovals.size,
    };

    const effect = calcRemediationEffect(before, after);

    // 효과 저장
    const effectId = `${tenantId}_${createdAt.getTime()}`;
    await db.collection("_remediationEffects").doc(effectId).set({
      tenantId,
      remediationId,
      before,
      after,
      effect,
      evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: createdAt.toISOString(),
    });

    logger.info(
      `[evaluateRemediationEffect] 완료: ${tenantId}, auditReduction=${effect.auditReductionRate}%, anomalyResolved=${effect.anomalyResolved}`
    );
  } catch (error: any) {
    logger.error(`[evaluateRemediationEffect] 오류:`, error);
    // 평가 실패해도 Remediation은 계속 작동
  }
}

