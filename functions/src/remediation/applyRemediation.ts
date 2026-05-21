/**
 * ✅ COMMIT 24: Remediation 실행기
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { applyAction } from "./remediationActions";
import type { RemediationPolicy } from "../../../src/lib/remediation/remediationPolicy";

const db = admin.firestore();

/**
 * ✅ COMMIT 24: Auto-Remediation 적용
 */
export async function applyRemediation(input: {
  tenantId: string;
  policy: RemediationPolicy;
  anomaly: { level: string; metric?: string };
}): Promise<void> {
  const { tenantId, policy, anomaly } = input;

  const expiresAt = new Date(Date.now() + policy.ttlMinutes * 60000);

  logger.info(
    `[applyRemediation] 시작: ${tenantId}, actions=${policy.actions.join(",")}, expiresAt=${expiresAt.toISOString()}`
  );

  // 각 Action 적용
  for (const action of policy.actions) {
    try {
      await applyAction(tenantId, action, expiresAt);
    } catch (error: any) {
      logger.error(`[applyRemediation] action 적용 실패 (${action}):`, error);
      // 하나 실패해도 나머지 계속 진행
    }
  }

  // Active Remediation 기록
  await db.collection("_activeRemediations").doc(tenantId).set(
    {
      tenantId,
      actions: policy.actions,
      anomaly: {
        level: anomaly.level,
        metric: anomaly.metric ?? null,
      },
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // ✅ COMMIT 25: Auto-Remediation 승인 요청 생성
  await db.collection("_remediationApprovals").add({
    tenantId,
    remediationId: tenantId,
    actions: policy.actions,
    status: "pending",
    requestedBy: "system",
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ✅ COMMIT 26: 효과 평가 (비동기, 결과 기다리지 않음)
  const createdAt = new Date();
  evaluateRemediationEffect({
    tenantId,
    remediationId: tenantId,
    createdAt,
  }).catch((error) => {
    logger.warn(`[applyRemediation] 효과 평가 실패 (무시):`, error);
  });

  logger.info(`[applyRemediation] 완료: ${tenantId}`);
}

