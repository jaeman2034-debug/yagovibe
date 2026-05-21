import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { TRACKED_NOTIFICATION_EXPERIMENTS } from "./notificationExperimentMetrics";

export type ReRegisterProfileAttribution = {
  experiment: string;
  variant: "A" | "B";
  attributionNotificationId: string;
};

/** billingProfiles 문서에서 재등록 실험 귀속 필드 추출 */
export function extractReRegisterAttributionFromProfile(
  profile: Record<string, unknown>
): ReRegisterProfileAttribution | null {
  const experiment =
    typeof profile.reRegisterAttributionExperiment === "string"
      ? profile.reRegisterAttributionExperiment.trim()
      : "";
  const variant =
    profile.reRegisterAttributionVariant === "A" || profile.reRegisterAttributionVariant === "B"
      ? profile.reRegisterAttributionVariant
      : null;
  const attributionNotificationId =
    typeof profile.reRegisterAttributionNotificationId === "string"
      ? profile.reRegisterAttributionNotificationId.trim()
      : "";
  if (
    !experiment ||
    !variant ||
    !attributionNotificationId ||
    !TRACKED_NOTIFICATION_EXPERIMENTS.has(experiment)
  ) {
    return null;
  }
  return { experiment, variant, attributionNotificationId };
}

/** payments 문서에 붙일 패치 (자동결제 성공 직전) */
export function paymentFieldsFromReRegisterProfile(
  profile: Record<string, unknown>
): Record<string, unknown> | null {
  const attr = extractReRegisterAttributionFromProfile(profile);
  if (!attr) return null;
  return {
    experiment: attr.experiment,
    variant: attr.variant,
    attributionNotificationId: attr.attributionNotificationId,
    attributionType: "billing_reregister",
  };
}

export function clearReRegisterAttributionProfileFields(): Record<string, unknown> {
  return {
    reRegisterAttributionExperiment: FieldValue.delete(),
    reRegisterAttributionVariant: FieldValue.delete(),
    reRegisterAttributionNotificationId: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * `notifications/{id}` 가 billing_re_register_request 인지 서버 검증.
 */
export async function resolveValidatedBillingReRegisterAttribution(
  db: Firestore,
  uid: string,
  teamId: string,
  notificationIdRaw: unknown
): Promise<ReRegisterProfileAttribution | null> {
  const notificationId = typeof notificationIdRaw === "string" ? notificationIdRaw.trim() : "";
  if (!notificationId) return null;

  const snap = await db.doc(`notifications/${notificationId}`).get();
  if (!snap.exists) return null;
  const n = snap.data() || {};
  const targetUid =
    (typeof n.userId === "string" && n.userId) ||
    (typeof n.targetUid === "string" && n.targetUid) ||
    "";
  if (targetUid !== uid) return null;
  if ((typeof n.teamId === "string" ? n.teamId : "") !== teamId) return null;
  if ((typeof n.type === "string" ? n.type : "") !== "billing_re_register_request") return null;

  const experiment = typeof n.experiment === "string" ? n.experiment.trim() : "";
  const variant = n.variant === "A" || n.variant === "B" ? n.variant : null;
  if (!variant || experiment !== "billing_reregister_v1") return null;

  return { experiment, variant, attributionNotificationId: notificationId };
}
