/**
 * ✅ COMMIT 24: 만료된 Remediation 자동 해제
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

/**
 * ✅ COMMIT 24: 만료된 Remediation 정리
 */
export async function clearExpiredRemediation(tenantId: string): Promise<void> {
  try {
    const policySnap = await db.collection("_drPolicies").doc(tenantId).get();
    if (!policySnap.exists) return;

    const policy = policySnap.data();
    const expiresAt = policy?.expiresAt as admin.firestore.Timestamp | undefined;

    if (expiresAt && expiresAt.toDate() < new Date()) {
      // 만료됨 → 자동 해제
      await db.collection("_drPolicies").doc(tenantId).update({
        mode: "normal",
        reason: null,
        expiresAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("_activeRemediations").doc(tenantId).delete();

      logger.info(`[clearExpiredRemediation] DR 정책 자동 해제: ${tenantId}`);
    }
  } catch (error: any) {
    logger.error(`[clearExpiredRemediation] 오류:`, error);
  }
}

