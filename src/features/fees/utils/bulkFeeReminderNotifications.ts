import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildFeePaymentCorrelationId } from "@/lib/fees/feePaymentCorrelationId";
import {
  NOTIFICATION_EXPERIMENT_IDS,
  buildFeeCheckoutPendingReminderExperimentFields,
  buildFeeReminderExperimentFields,
} from "@/lib/notifications/experiments/pushExperimentCopy";
import { resolveNotificationExperimentVariant } from "@/lib/notifications/experiments/resolveNotificationExperimentVariant";
import type { FeeMemberRow } from "../types";

export type FeeReminderTargetRow = Pick<FeeMemberRow, "uid" | "name" | "paymentStatus" | "isBillingActionable">;
const FEE_REMINDER_COOLDOWN_MS = 10 * 60 * 1000;

type FeeReminderKind = "outstanding" | "checkout_pending";

function reminderDocRef(teamId: string, feeId: string, uid: string, kind: FeeReminderKind) {
  const paymentId = `${feeId}_${uid}`;
  return doc(db, "teams", teamId, "payments", paymentId, "reminders", `fee_${kind}`);
}

function toMillisOrNull(raw: unknown): number | null {
  if (raw instanceof Timestamp) return raw.toMillis();
  if (raw && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return null;
}

async function shouldSendFeeReminder(
  teamId: string,
  feeId: string,
  uid: string,
  kind: FeeReminderKind
): Promise<boolean> {
  const snap = await getDoc(reminderDocRef(teamId, feeId, uid, kind));
  if (!snap.exists()) return true;
  const ms = toMillisOrNull((snap.data() as Record<string, unknown>).sentAt);
  if (ms == null) return true;
  return Date.now() - ms >= FEE_REMINDER_COOLDOWN_MS;
}

async function markFeeReminderSent(
  teamId: string,
  feeId: string,
  uid: string,
  kind: FeeReminderKind
): Promise<void> {
  await setDoc(
    reminderDocRef(teamId, feeId, uid, kind),
    {
      teamId,
      feeId,
      uid,
      kind,
      sentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** 미납·실패·연체 멤버에게 회비 알림 문서를 각각 생성합니다. */
export async function sendBulkFeeReminderNotifications(
  teamId: string,
  feeId: string,
  rows: FeeReminderTargetRow[]
): Promise<number> {
  const targets = rows.filter(
    (r) =>
      r.isBillingActionable !== false &&
      (r.paymentStatus === "unpaid" ||
      r.paymentStatus === "failed" ||
      r.paymentStatus === "overdue")
  );
  const link = `/team/${encodeURIComponent(teamId)}?tab=home`;
  const variant = await resolveNotificationExperimentVariant(teamId, NOTIFICATION_EXPERIMENT_IDS.FEE_REMINDER_V1);
  const sentUids = new Set<string>();
  await Promise.all(
    targets.map(async (target) => {
      const allowed = await shouldSendFeeReminder(teamId, feeId, target.uid, "outstanding");
      if (!allowed) return;
      const ab = buildFeeReminderExperimentFields(target.name, variant);
      await addDoc(collection(db, "notifications"), {
        type: "fee_reminder",
        teamId,
        feeId,
        feeReminderKind: "outstanding",
        correlationId: buildFeePaymentCorrelationId(feeId, target.uid),
        link,
        userId: target.uid,
        targetUid: target.uid,
        experiment: ab.experiment,
        variant: ab.variant,
        title: ab.title,
        body: ab.message,
        message: ab.message,
        isRead: false,
        status: "queued",
        createdAt: serverTimestamp(),
      });
      await markFeeReminderSent(teamId, feeId, target.uid, "outstanding");
      sentUids.add(target.uid);
    })
  );
  return sentUids.size;
}

/** 온라인 결제 시도 중(pending)인 멤버에게만 안내 알림을 보냅니다. */
export async function sendCheckoutPendingFeeReminderNotifications(
  teamId: string,
  feeId: string,
  rows: FeeReminderTargetRow[]
): Promise<number> {
  const targets = rows.filter(
    (r) => r.isBillingActionable !== false && r.paymentStatus === "pending"
  );
  const link = `/team/${encodeURIComponent(teamId)}?tab=home`;
  const variant = await resolveNotificationExperimentVariant(teamId, NOTIFICATION_EXPERIMENT_IDS.FEE_REMINDER_V1);
  const sentUids = new Set<string>();
  await Promise.all(
    targets.map(async (target) => {
      const allowed = await shouldSendFeeReminder(teamId, feeId, target.uid, "checkout_pending");
      if (!allowed) return;
      const ab = buildFeeCheckoutPendingReminderExperimentFields(target.name, variant);
      await addDoc(collection(db, "notifications"), {
        type: "fee_reminder",
        teamId,
        feeId,
        feeReminderKind: "checkout_pending",
        correlationId: buildFeePaymentCorrelationId(feeId, target.uid),
        link,
        userId: target.uid,
        targetUid: target.uid,
        experiment: ab.experiment,
        variant: ab.variant,
        title: ab.title,
        body: ab.message,
        message: ab.message,
        isRead: false,
        status: "queued",
        createdAt: serverTimestamp(),
      });
      await markFeeReminderSent(teamId, feeId, target.uid, "checkout_pending");
      sentUids.add(target.uid);
    })
  );
  return sentUids.size;
}
