/**
 * 마감 전 알림(fee_due_reminder) 이후에도 미납인 멤버에게만
 * `non_responder_reminder` (n2 / n5) 를 하루 1회 큐잉.
 * — `fee_overdue_reminder`(마감일 기준) 과 타입·dedup 이 분리됨.
 */
import { createHash } from "crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import { parseTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";
import { teamEntitledForBulkFeeReminders } from "../lib/teamPlan";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const MAX_NOTIFS_PER_BATCH = 399;

type NudgeStep = "n2" | "n5";

function nonResponderNotifDocId(teamId: string, feeId: string, uid: string, step: NudgeStep): string {
  const base = `noresp_${teamId}_${feeId}_${uid}_${step}`;
  if (base.length <= 800) return base;
  return `noresp_${step}_${createHash("sha256").update(base).digest("hex").slice(0, 48)}`;
}

function toMillis(raw: unknown): number | null {
  if (raw == null) return null;
  if (raw instanceof Timestamp) return raw.toMillis();
  if (typeof (raw as Timestamp).toMillis === "function") return (raw as Timestamp).toMillis();
  return null;
}

function daysSinceReminderMs(lastReminderMs: number, nowMs: number): number {
  return Math.floor((nowMs - lastReminderMs) / (24 * 60 * 60 * 1000));
}

function readNonResponderHistory(data: Record<string, unknown>): Record<string, boolean> {
  const h = data.nonResponderReminderHistory as Record<string, unknown> | undefined;
  if (!h || typeof h !== "object") return {};
  return {
    n2: h.n2 === true,
    n5: h.n5 === true,
  };
}

/**
 * 서울 09:40 — `feeOverdueReminderScheduler`(09:20) 이후 실행.
 */
export const nonResponderFeeReminderScheduler = onSchedule(
  {
    schedule: "40 9 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const nowMs = Date.now();
    let teamsProcessed = 0;
    let feesScanned = 0;
    let notifsWritten = 0;

    const teamsSnap = await db.collection("teams").get();

    for (const teamDoc of teamsSnap.docs) {
      teamsProcessed++;
      const teamId = teamDoc.id;
      const teamPayload = teamDoc.data() as Record<string, unknown> | undefined;
      if (!teamEntitledForBulkFeeReminders(teamPayload)) continue;

      let feesSnap;
      try {
        feesSnap = await db.collection("teams").doc(teamId).collection("fees").where("status", "==", "open").get();
      } catch (e) {
        logger.error("[nonResponderFeeReminderScheduler] fees 조회 실패", { teamId, error: String(e) });
        continue;
      }

      for (const feeDoc of feesSnap.docs) {
        feesScanned++;
        const feeId = feeDoc.id;
        const feeTitle = String((feeDoc.data() as Record<string, unknown>).title || "팀 회비");

        const [membersSnap, paymentsSnap, notifSnap] = await Promise.all([
          db.collection("teams").doc(teamId).collection("members").where("status", "==", "active").get(),
          db.collection("teams").doc(teamId).collection("payments").where("feeId", "==", feeId).get(),
          db
            .collection("notifications")
            .where("teamId", "==", teamId)
            .where("feeId", "==", feeId)
            .where("type", "==", "fee_due_reminder")
            .get(),
        ]);

        const lastFeeDueByUid = new Map<string, number>();
        for (const n of notifSnap.docs) {
          const d = n.data() as Record<string, unknown>;
          const uid = String(d.targetUid || d.userId || "").trim();
          if (!uid) continue;
          const ms = toMillis(d.createdAt);
          if (ms == null) continue;
          lastFeeDueByUid.set(uid, Math.max(lastFeeDueByUid.get(uid) ?? 0, ms));
        }

        const paymentByUid = new Map<string, { ref: DocumentReference; data: Record<string, unknown> }>();
        paymentsSnap.docs.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          let uid = String(data.userId || "").trim();
          if (!uid) uid = parseTeamFeePaymentDocId(doc.id)?.userId || "";
          if (uid) paymentByUid.set(uid, { ref: doc.ref, data });
        });

        type Target = { uid: string; displayName: string; step: NudgeStep; paymentRef: DocumentReference };
        const targets: Target[] = [];

        for (const memberDoc of membersSnap.docs) {
          const uid = memberDoc.id;
          const member = memberDoc.data() as Record<string, unknown>;
          const displayName =
            (typeof member.name === "string" && member.name.trim()) ||
            (typeof member.displayName === "string" && member.displayName.trim()) ||
            "회원";

          const lastMs = lastFeeDueByUid.get(uid);
          if (lastMs == null) continue;

          const pay = paymentByUid.get(uid);
          if (!pay) continue;
          const status = String(pay.data.status || "").trim().toLowerCase();
          if (status === "paid") continue;

          const days = daysSinceReminderMs(lastMs, nowMs);
          const hist = readNonResponderHistory(pay.data);

          let step: NudgeStep | null = null;
          if (days === 2 && !hist.n2) step = "n2";
          else if (days === 5 && !hist.n5) step = "n5";
          if (!step) continue;

          targets.push({ uid, displayName, step, paymentRef: pay.ref });
        }

        if (targets.length === 0) continue;

        let idx = 0;
        while (idx < targets.length) {
          const take = Math.min(MAX_NOTIFS_PER_BATCH, targets.length - idx);
          const batch = db.batch();

          for (let j = 0; j < take; j++) {
            const t = targets[idx + j];
            const docId = nonResponderNotifDocId(teamId, feeId, t.uid, t.step);
            const notifRef = db.collection("notifications").doc(docId);
            const title = t.step === "n2" ? "회비 납부 재안내" : "회비 납부 확인 요청";
            const body =
              t.step === "n2"
                ? `${t.displayName}님, 「${feeTitle}」납부 확인이 필요합니다. 잠시 앱에서 결제를 완료해 주세요.`
                : `${t.displayName}님, 「${feeTitle}」회비가 아직 완납 처리되지 않았습니다. 지금 바로 확인해 주세요.`;

            batch.set(
              notifRef,
              {
                type: "non_responder_reminder",
                teamId,
                feeId,
                nonResponderStep: t.step,
                correlationId: buildFeePaymentCorrelationId(feeId, t.uid),
                targetUid: t.uid,
                userId: t.uid,
                title,
                body,
                message: body,
                link: `/team/${encodeURIComponent(teamId)}?tab=home`,
                status: "queued",
                pushDedupKey: `non_responder_reminder:${teamId}:${feeId}:${t.uid}:${t.step}`,
                createdAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            batch.set(
              t.paymentRef,
              {
                [`nonResponderReminderHistory.${t.step}`]: true,
                nonResponderReminderUpdatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            notifsWritten++;
          }

          await batch.commit();
          idx += take;
        }
      }
    }

    logger.info("[nonResponderFeeReminderScheduler] 완료", {
      teamsProcessed,
      feesScanned,
      notifsWritten,
    });
  }
);
