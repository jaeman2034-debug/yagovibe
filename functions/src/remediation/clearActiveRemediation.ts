/**
 * ✅ COMMIT 25: Active Remediation 해제
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { applyAction } from "./remediationActions";

const db = admin.firestore();

/**
 * ✅ COMMIT 25: Active Remediation 해제 (reject 시)
 */
export async function clearActiveRemediation(tenantId: string): Promise<void> {
  try {
    // _activeRemediations 삭제
    await db.collection("_activeRemediations").doc(tenantId).delete();

    // DR Policy 원복
    await db.collection("_drPolicies").doc(tenantId).update({
      mode: "normal",
      reason: null,
      expiresAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Feature Flags 원복
    await db.collection("_featureFlags").doc(tenantId).update({
      approvalsDisabled: false,
      reason: null,
      expiresAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Plugin Controls 원복
    await db.collection("_pluginControls").doc(tenantId).delete();

    // Rate Limits 원복
    await db.collection("_rateLimits").doc(tenantId).delete();

    logger.info(`[clearActiveRemediation] 완료: ${tenantId}`);
  } catch (error: any) {
    logger.error(`[clearActiveRemediation] 오류:`, error);
    throw error;
  }
}

