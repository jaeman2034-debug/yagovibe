/**
 * ✅ COMMIT 24: Auto-Remediation Actions (실제 완화 동작)
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

/**
 * ✅ COMMIT 24: Remediation Action 적용
 */
export async function applyAction(
  tenantId: string,
  action: string,
  expiresAt: Date
): Promise<void> {
  const expiresAtTs = admin.firestore.Timestamp.fromDate(expiresAt);

  switch (action) {
    case "temporary_read_only":
      await db.collection("_drPolicies").doc(tenantId).set(
        {
          tenantId,
          mode: "read_only",
          reason: "auto-remediation",
          expiresAt: expiresAtTs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      logger.info(`[applyAction] temporary_read_only 적용: ${tenantId}`);
      break;

    case "disable_approvals":
      await db.collection("_featureFlags").doc(tenantId).set(
        {
          approvalsDisabled: true,
          reason: "auto-remediation",
          expiresAt: expiresAtTs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      logger.info(`[applyAction] disable_approvals 적용: ${tenantId}`);
      break;

    case "pause_plugins":
      await db.collection("_pluginControls").doc(tenantId).set(
        {
          paused: true,
          reason: "auto-remediation",
          expiresAt: expiresAtTs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      logger.info(`[applyAction] pause_plugins 적용: ${tenantId}`);
      break;

    case "rate_limit":
      await db.collection("_rateLimits").doc(tenantId).set(
        {
          level: "strict",
          reason: "auto-remediation",
          expiresAt: expiresAtTs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      logger.info(`[applyAction] rate_limit 적용: ${tenantId}`);
      break;

    default:
      logger.warn(`[applyAction] 알 수 없는 action: ${action}`);
  }
}

