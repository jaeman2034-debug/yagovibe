/**
 * 팀 회비 payments 가 paid 로 전환될 때 실험 conversion 집계.
 * - 수동 결제: createTeamFeePayment 에서 검증된 experiment/variant → `converted`
 * - 재등록 후 자동결제: 스케줄러가 billingProfiles 귀속을 복사한 뒤 → `reRegisterConverted`
 */
import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { bumpTeamNotificationExperimentMetric } from "../lib/notificationExperimentMetrics";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const onTeamFeePaymentConversionExperiment = onDocumentUpdated(
  {
    document: "teams/{teamId}/payments/{paymentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!before || !after) return;
    if (before.status === "paid" || after.status !== "paid") return;

    const experiment = typeof after.experiment === "string" ? after.experiment.trim() : "";
    const variant = after.variant === "A" || after.variant === "B" ? after.variant : null;
    const teamId = event.params.teamId as string;
    if (!experiment || !variant || !teamId) return;

    const attributionType =
      typeof after.attributionType === "string" ? after.attributionType.trim() : "";

    try {
      if (
        after.source === "autopay" &&
        attributionType === "billing_reregister" &&
        experiment === "billing_reregister_v1"
      ) {
        await bumpTeamNotificationExperimentMetric(db, teamId, experiment, variant, "reRegisterConverted");
        return;
      }

      /** 일반 자동결제 성공은 알림→즉시결제 converted에 포함하지 않음 */
      if (after.source === "autopay") return;

      await bumpTeamNotificationExperimentMetric(db, teamId, experiment, variant, "converted");
    } catch {
      // 집계 실패는 결제 UX에 영향 없음
    }
  }
);
