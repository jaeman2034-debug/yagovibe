import { FieldValue, type Firestore } from "firebase-admin/firestore";

/** 알림 실험 집계·결제 귀속에 사용하는 experimentId 화이트리스트 */
export const TRACKED_NOTIFICATION_EXPERIMENTS = new Set([
  "billing_reregister_v1",
  "fee_reminder_v1",
  "high_risk_day0_v1",
  "high_risk_day3_v1",
]);

export type ExperimentEngagementMetric =
  | "sent"
  | "opened"
  | "clicked"
  | "reactivated"
  | "converted"
  | "reRegisterConverted";

/**
 * `teams/{teamId}/experiments/{experimentId}` 에 variant별 카운트 증가 (Admin 전용).
 */
export async function bumpTeamNotificationExperimentMetric(
  db: Firestore,
  teamId: string,
  experimentId: string,
  variant: "A" | "B",
  metric: ExperimentEngagementMetric
): Promise<void> {
  if (!teamId || !experimentId || !TRACKED_NOTIFICATION_EXPERIMENTS.has(experimentId)) return;
  const prefix = variant === "A" ? "variantA" : "variantB";
  const ref = db.doc(`teams/${teamId}/experiments/${experimentId}`);
  await ref.set(
    {
      teamId,
      experimentId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await ref.update({
    [`${prefix}.${metric}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
