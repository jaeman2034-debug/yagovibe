import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildFeePaymentCorrelationId } from "@/lib/fees/feePaymentCorrelationId";
import { NOTIFICATION_EXPERIMENT_IDS, buildBillingReRegisterExperimentFields } from "@/lib/notifications/experiments/pushExperimentCopy";
import { resolveNotificationExperimentVariant } from "@/lib/notifications/experiments/resolveNotificationExperimentVariant";

/**
 * 모든 회비의 payments 중 자동결제 실패(failed + autopay) 멤버에게 재등록 안내 알림을 보냅니다.
 * 동일 uid는 한 번만 발송합니다.
 */
export async function sendBillingReRegisterRequestNotifications(teamId: string): Promise<number> {
  const feesSnap = await getDocs(collection(db, "teams", teamId, "fees"));
  const seen = new Set<string>();
  const jobs: Promise<unknown>[] = [];
  const link = `/team/${encodeURIComponent(teamId)}?tab=home`;
  const variant = await resolveNotificationExperimentVariant(teamId, NOTIFICATION_EXPERIMENT_IDS.BILLING_REREGISTER_V1);

  for (const feeDoc of feesSnap.docs) {
    const feeId = feeDoc.id;
    const paySnap = await getDocs(
      query(collection(db, "teams", teamId, "payments"), where("feeId", "==", feeId))
    );
    paySnap.forEach((p) => {
      const d = p.data() as Record<string, unknown>;
      if (d.status !== "failed") return;
      if (d.source !== "autopay") return;
      const uid = typeof d.userId === "string" && d.userId ? d.userId : p.id;
      if (!uid || seen.has(uid)) return;
      seen.add(uid);
      const ab = buildBillingReRegisterExperimentFields(variant);
      jobs.push(
        addDoc(collection(db, "notifications"), {
          type: "billing_re_register_request",
          teamId,
          feeId,
          correlationId: buildFeePaymentCorrelationId(feeId, uid),
          link,
          userId: uid,
          targetUid: uid,
          experiment: ab.experiment,
          variant: ab.variant,
          title: ab.title,
          body: ab.message,
          message: ab.message,
          isRead: false,
          status: "queued",
          createdAt: serverTimestamp(),
        })
      );
    });
  }

  await Promise.all(jobs);
  return seen.size;
}
