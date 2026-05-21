import { createHash } from "crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import {
  getOverdueDayNumberFromDueTimestamp,
  shouldSendOverdueReminderDay,
} from "./seoulDateUtils";
import { teamEntitledForBulkFeeReminders } from "../lib/teamPlan";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const MAX_NOTIFS_PER_BATCH = 399;

function overdueNotifDocId(teamId: string, feeId: string, uid: string, overdueDay: number): string {
  const base = `overdue_${teamId}_${feeId}_${uid}_d${overdueDay}`;
  if (base.length <= 800) return base;
  return `overdue_d${overdueDay}_${createHash("sha256").update(base).digest("hex").slice(0, 48)}`;
}

function resolveDueTimestamp(fee: Record<string, unknown>): Timestamp | null {
  const raw = fee.dueDate;
  if (raw instanceof Timestamp) return raw;
  if (raw && typeof (raw as Timestamp).toMillis === "function") {
    return raw as Timestamp;
  }
  return null;
}

/**
 * 연체 자동 독촉: D+1, D+3, D+7n (서울 마감 기준).
 * notifications(queued) 생성 → 기존 onCreate FCM. 문서 ID·pushDedupKey로 중복 방지.
 */
export const feeOverdueReminderScheduler = onSchedule(
  {
    schedule: "20 9 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const nowMs = Date.now();
    let feesTriggered = 0;
    let notifsWritten = 0;

    const teamsSnap = await db.collection("teams").get();

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;
      const teamPayload = teamDoc.data() as Record<string, unknown> | undefined;
      if (!teamEntitledForBulkFeeReminders(teamPayload)) {
        continue;
      }

      let feesSnap;
      try {
        feesSnap = await db.collection("teams").doc(teamId).collection("fees").where("status", "==", "open").get();
      } catch (e) {
        logger.error("[feeOverdueReminderScheduler] fees 조회 실패", { teamId, error: String(e) });
        continue;
      }

      for (const feeDoc of feesSnap.docs) {
        const fee = feeDoc.data() as Record<string, unknown>;
        const dueTs = resolveDueTimestamp(fee);
        if (!dueTs) continue;

        const overdueDay = getOverdueDayNumberFromDueTimestamp(dueTs, nowMs);
        if (!shouldSendOverdueReminderDay(overdueDay)) continue;

        const dayKey = String(overdueDay);
        const history = (fee.overdueReminderHistory as Record<string, boolean> | undefined) || {};
        if (history[dayKey] === true) continue;

        feesTriggered++;
        const feeId = feeDoc.id;
        const feeTitle = String(fee.title || "팀 회비");

        const [membersSnap, paymentsSnap] = await Promise.all([
          db.collection("teams").doc(teamId).collection("members").where("status", "==", "active").get(),
          db.collection("teams").doc(teamId).collection("payments").where("feeId", "==", feeId).get(),
        ]);

        const paymentMap = new Map<string, Record<string, unknown>>();
        paymentsSnap.docs.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const uid = typeof data.userId === "string" && data.userId ? data.userId : "";
          if (uid) paymentMap.set(uid, data);
        });

        type Row = { uid: string; displayName: string };
        const targets: Row[] = [];

        for (const memberDoc of membersSnap.docs) {
          const uid = memberDoc.id;
          const member = memberDoc.data() as Record<string, unknown>;
          const payment = paymentMap.get(uid);
          if (payment?.status === "paid") continue;

          const displayName =
            (typeof member.name === "string" && member.name.trim()) ||
            (typeof member.displayName === "string" && member.displayName.trim()) ||
            "회원";
          targets.push({ uid, displayName });
        }

        if (targets.length === 0) {
          continue;
        }

        let idx = 0;
        while (idx < targets.length) {
          const take = Math.min(MAX_NOTIFS_PER_BATCH, targets.length - idx);
          const batch = db.batch();

          for (let j = 0; j < take; j++) {
            const row = targets[idx + j];
            const docId = overdueNotifDocId(teamId, feeId, row.uid, overdueDay);
            const notifRef = db.collection("notifications").doc(docId);

            batch.set(
              notifRef,
              {
                type: "fee_overdue_reminder",
                teamId,
                feeId,
                correlationId: buildFeePaymentCorrelationId(feeId, row.uid),
                targetUid: row.uid,
                userId: row.uid,
                title: "회비 연체 안내",
                body: `${row.displayName}님, 「${feeTitle}」회비가 ${overdueDay}일 연체되었습니다.`,
                link: `/team/${encodeURIComponent(teamId)}?tab=home`,
                status: "queued",
                pushDedupKey: docId,
                overdueReminderDay: overdueDay,
                createdAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            notifsWritten++;
          }

          await batch.commit();
          idx += take;
        }

        await feeDoc.ref.update({
          overdueReminderHistory: { ...history, [dayKey]: true },
          overdueReminderUpdatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("[feeOverdueReminderScheduler] fee 처리", { teamId, feeId, overdueDay, targets: targets.length });
      }
    }

    logger.info("[feeOverdueReminderScheduler] 완료", { feesTriggered, notifsWritten });
  }
);
