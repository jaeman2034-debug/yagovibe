/**
 * past_due 유예(7일)·재알림(Day3)·제한 알림용 공통 상수 및 notifications 큐 적재.
 */
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { bumpTeamNotificationExperimentMetric } from "./notificationExperimentMetrics";

const db = admin.firestore();

export const PAST_DUE_GRACE_PERIOD_MS = 7 * 86400000;
export const PAST_DUE_DAY3_REMINDER_MS = 3 * 86400000;

export function teamBillingDeepLink(teamId: string): string {
  return `/team/${encodeURIComponent(teamId)}?tab=home`;
}

export async function enqueueBillingLifecycleNotification(opts: {
  docId: string;
  pushDedupKey: string;
  teamId: string;
  captainUid: string;
  notifType: string;
  title: string;
  body: string;
  link: string;
  experiment?: string;
  variant?: "A" | "B";
  cohort?: "new" | "existing";
}): Promise<void> {
  await db.collection("notifications").doc(opts.docId).set(
    {
      type: opts.notifType,
      teamId: opts.teamId,
      targetUid: opts.captainUid,
      userId: opts.captainUid,
      title: opts.title,
      body: opts.body,
      link: opts.link,
      experiment: opts.experiment || FieldValue.delete(),
      variant: opts.variant || FieldValue.delete(),
      cohort: opts.cohort || FieldValue.delete(),
      status: "queued",
      pushDedupKey: opts.pushDedupKey,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (opts.experiment && opts.variant) {
    try {
      await bumpTeamNotificationExperimentMetric(
        db,
        opts.teamId,
        opts.experiment,
        opts.variant,
        "sent"
      );
    } catch {
      // 실험 집계 실패는 알림 발송 흐름에 영향 없음
    }
  }
}
