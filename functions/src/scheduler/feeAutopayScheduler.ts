import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import { buildTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";
import { buildTeamFeeAutopayOrderId } from "../lib/tossTeamFeeOrderIds";
import { isPaidDone, tossBillingExecute, type TossBillingPayResponse } from "../lib/tossAutopayCharge";
import { seoulYyyyMm, seoulYyyymmdd } from "./seoulDateUtils";
import { getNextRetryAfterAutopayFailure } from "./seoulRetryUtils";
import {
  clearReRegisterAttributionProfileFields,
  paymentFieldsFromReRegisterProfile,
} from "../lib/billingReRegisterAttribution";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";

/** Firestore batch 상한에 여유 */
const MAX_BATCH_OPS = 400;
const ONE_DAY_MS = 86400000;
const TWENTY_EIGHT_DAYS_MS = 28 * ONE_DAY_MS;

/**
 * autopayRunAt 이 지난 오픈 회비에 대해 빌링키 자동 승인.
 * - billingMode: autopay_required | autopay_optional (등록 멤버만)
 * - 동일 서울일 1회: autopayRuns/day_{YYYYMMDD} completed 면 스킵
 * - 최종 paid/failed 는 토스 웹훅과 이중으로 맞출 수 있음(스케줄러는 즉시 반영)
 */
export const feeAutopayScheduler = onSchedule(
  {
    schedule: "30 8 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    if (!TOSS_SECRET_KEY) {
      logger.error("[feeAutopayScheduler] TOSS_SECRET_KEY 없음 — 중단");
      return;
    }

    const nowMs = Date.now();
    const cycleYm = seoulYyyyMm(nowMs);
    const dateKey = seoulYyyymmdd(nowMs);

    let feesSeen = 0;
    let feesRun = 0;
    let chargesOk = 0;
    let chargesFail = 0;

    const teamsSnap = await db.collection("teams").get();

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;

      let feesSnap;
      try {
        feesSnap = await db.collection("teams").doc(teamId).collection("fees").where("status", "==", "open").get();
      } catch (e) {
        logger.error("[feeAutopayScheduler] fees 조회 실패", { teamId, error: String(e) });
        continue;
      }

      for (const feeDoc of feesSnap.docs) {
        feesSeen++;
        const fee = feeDoc.data() as Record<string, unknown>;
        const billingMode = String(fee.billingMode || "");
        if (billingMode !== "autopay_required" && billingMode !== "autopay_optional") {
          continue;
        }

        const runAt = fee.autopayRunAt;
        const runAtMs =
          runAt instanceof Timestamp
            ? runAt.toMillis()
            : runAt && typeof (runAt as Timestamp).toMillis === "function"
              ? (runAt as Timestamp).toMillis()
              : null;
        if (runAtMs == null || runAtMs > nowMs) {
          continue;
        }

        const dayRunRef = feeDoc.ref.collection("autopayRuns").doc(`day_${dateKey}`);
        const dayRunSnap = await dayRunRef.get();
        if (dayRunSnap.exists) {
          const dr = dayRunSnap.data() as Record<string, unknown>;
          if (dr.status === "completed") {
            continue;
          }
          if (dr.status === "processing") {
            const started = dr.startedAt;
            const startedMs =
              started instanceof Timestamp
                ? started.toMillis()
                : started && typeof (started as Timestamp).toMillis === "function"
                  ? (started as Timestamp).toMillis()
                  : 0;
            if (startedMs && nowMs - startedMs < 2 * 60 * 60 * 1000) {
              continue;
            }
          }
        }

        const feeId = feeDoc.id;
        const amount = Number(fee.amount || 0);
        const orderName = String(fee.title || "팀 회비");
        if (amount <= 0) {
          logger.warn("[feeAutopayScheduler] amount<=0 스킵", { teamId, feeId });
          continue;
        }

        feesRun++;
        const runId = `day_${dateKey}`;
        const nowField = FieldValue.serverTimestamp();

        await dayRunRef.set(
          {
            runId,
            teamId,
            feeId,
            scheduledFor: Timestamp.fromMillis(nowMs),
            startedAt: nowField,
            status: "processing",
            targetCount: 0,
            successCount: 0,
            failedCount: 0,
          },
          { merge: true }
        );

        const membersSnap = await db
          .collection("teams")
          .doc(teamId)
          .collection("members")
          .where("status", "==", "active")
          .get();

        type Target = {
          uid: string;
          paymentRef: DocumentReference;
          orderId: string;
          seq: number;
        };
        const targets: Target[] = [];

        for (const memberDoc of membersSnap.docs) {
          const uid = memberDoc.id;
          const paymentRef = db.doc(`teams/${teamId}/payments/${buildTeamFeePaymentDocId(feeId, uid)}`);
          const paymentSnap = await paymentRef.get();
          const pay = paymentSnap.exists ? (paymentSnap.data() as Record<string, unknown>) : {};

          if (pay.status === "paid") continue;

          const existingOrder = typeof pay.orderId === "string" ? pay.orderId : "";
          const attemptBase = typeof pay.chargeAttemptCount === "number" && Number.isFinite(pay.chargeAttemptCount) ? pay.chargeAttemptCount : 0;
          const seq = attemptBase + 1;

          const profileSnap = await db.doc(`teams/${teamId}/billingProfiles/${uid}`).get();
          if (!profileSnap.exists) {
            if (billingMode === "autopay_required") {
              targets.push({
                uid,
                paymentRef,
                orderId: buildTeamFeeAutopayOrderId(teamId, feeId, uid, cycleYm, seq),
                seq,
              });
            }
            continue;
          }

          const profile = profileSnap.data() as Record<string, unknown>;
          if (profile.status !== "active") continue;

          const secretSnap = await db.doc(`teams/${teamId}/billingSecrets/${uid}`).get();
          if (!secretSnap.exists) continue;

          const billingKey = String((secretSnap.data() as Record<string, unknown>)?.billingKey || "");
          const customerKey = String((secretSnap.data() as Record<string, unknown>)?.customerKey || "");
          if (!billingKey || !customerKey) continue;

          const orderId = buildTeamFeeAutopayOrderId(teamId, feeId, uid, cycleYm, seq);
          if (existingOrder === orderId && pay.status === "pending") {
            continue;
          }

          targets.push({ uid, paymentRef, orderId, seq });
        }

        const targetCount = targets.length;
        await dayRunRef.set({ targetCount, updatedAt: nowField }, { merge: true });

        let successCount = 0;
        let failedCount = 0;
        const failureNotifs: Array<{ uid: string; body: string; orderId: string }> = [];

        let batch = db.batch();
        let ops = 0;

        const flush = async () => {
          if (ops > 0) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
          }
        };

        for (const t of targets) {
          const secretSnap = await db.doc(`teams/${teamId}/billingSecrets/${t.uid}`).get();
          const billingKey = String((secretSnap.data() as Record<string, unknown>)?.billingKey || "");
          const customerKey = String((secretSnap.data() as Record<string, unknown>)?.customerKey || "");
          if (!billingKey || !customerKey) {
            failedCount++;
            chargesFail++;
            const nxtFail = getNextRetryAfterAutopayFailure(t.seq, nowMs);
            batch.set(
              t.paymentRef,
              {
                teamId,
                feeId,
                userId: t.uid,
                uid: t.uid,
                amount,
                status: "failed",
                source: "autopay",
                orderId: t.orderId,
                failCode: "NO_BILLING_KEY",
                failReason: "빌링키가 없습니다.",
                chargeAttemptCount: FieldValue.increment(1),
                nextRetryAt: nxtFail,
                retryExhausted: nxtFail === null,
                lastRetryScheduledAt: nowField,
                lastFailedAt: nowField,
                autopayRunId: runId,
                updatedAt: nowField,
                failedAt: nowField,
              },
              { merge: true }
            );
            ops++;
            failureNotifs.push({
              uid: t.uid,
              body: `「${orderName}」자동결제에 실패했습니다. 카드 등록을 확인해 주세요.`,
              orderId: t.orderId,
            });
            if (ops >= MAX_BATCH_OPS) await flush();
            continue;
          }

          let exec: { httpOk: boolean; status: number; data: TossBillingPayResponse };
          try {
            exec = await tossBillingExecute(billingKey, {
              customerKey,
              amount,
              orderId: t.orderId,
              orderName,
            });
          } catch (e) {
            failedCount++;
            chargesFail++;
            const msg = e instanceof Error ? e.message : String(e);
            const nxtFail = getNextRetryAfterAutopayFailure(t.seq, nowMs);
            batch.set(
              t.paymentRef,
              {
                teamId,
                feeId,
                userId: t.uid,
                uid: t.uid,
                amount,
                status: "failed",
                source: "autopay",
                orderId: t.orderId,
                failCode: "AUTOPAY_NETWORK",
                failReason: msg,
                chargeAttemptCount: FieldValue.increment(1),
                nextRetryAt: nxtFail,
                retryExhausted: nxtFail === null,
                lastRetryScheduledAt: nowField,
                lastFailedAt: nowField,
                autopayRunId: runId,
                updatedAt: nowField,
                failedAt: nowField,
              },
              { merge: true }
            );
            ops++;
            failureNotifs.push({ uid: t.uid, body: `「${orderName}」자동결제 요청 중 오류: ${msg}`, orderId: t.orderId });
            if (ops >= MAX_BATCH_OPS) await flush();
            continue;
          }

          const { httpOk, data } = exec;
          const done = httpOk && isPaidDone(data);
          const paymentKey = typeof data.paymentKey === "string" ? data.paymentKey : "";

          if (done) {
            successCount++;
            chargesOk++;
            const profileRefForAttr = db.doc(`teams/${teamId}/billingProfiles/${t.uid}`);
            const profileSnapAttr = await profileRefForAttr.get();
            const profileAttrData = profileSnapAttr.exists
              ? (profileSnapAttr.data() as Record<string, unknown>)
              : {};
            const reRegisterPatch = paymentFieldsFromReRegisterProfile(profileAttrData);

            const paidPayload: Record<string, unknown> = {
              teamId,
              feeId,
              userId: t.uid,
              uid: t.uid,
              amount,
              status: "paid",
              source: "autopay",
              orderId: t.orderId,
              paymentKey: paymentKey || null,
              paidAt: nowField,
              failCode: null,
              failReason: null,
              failedAt: null,
              nextRetryAt: null,
              retryExhausted: false,
              lastFailedAt: null,
              lastRetryScheduledAt: null,
              autopayRunId: runId,
              updatedAt: nowField,
            };
            if (reRegisterPatch) {
              Object.assign(paidPayload, reRegisterPatch);
            }
            batch.set(t.paymentRef, paidPayload, { merge: true });
            if (reRegisterPatch) {
              batch.set(profileRefForAttr, clearReRegisterAttributionProfileFields(), { merge: true });
              ops++;
            }
          } else {
            failedCount++;
            chargesFail++;
            const nxtFail = getNextRetryAfterAutopayFailure(t.seq, nowMs);
            batch.set(
              t.paymentRef,
              {
                teamId,
                feeId,
                userId: t.uid,
                uid: t.uid,
                amount,
                status: "failed",
                source: "autopay",
                orderId: t.orderId,
                paymentKey: paymentKey || null,
                failCode: data.code || `HTTP_${exec.status}`,
                failReason: data.message || "자동결제가 완료되지 않았습니다.",
                chargeAttemptCount: FieldValue.increment(1),
                nextRetryAt: nxtFail,
                retryExhausted: nxtFail === null,
                lastRetryScheduledAt: nowField,
                lastFailedAt: nowField,
                autopayRunId: runId,
                updatedAt: nowField,
                failedAt: nowField,
              },
              { merge: true }
            );
            failureNotifs.push({
              uid: t.uid,
              body: `「${orderName}」자동결제 실패: ${data.message || data.code || "알 수 없음"}`,
              orderId: t.orderId,
            });
          }
          ops++;
          if (ops >= MAX_BATCH_OPS) await flush();
        }

        await flush();

        const finalStatus =
          successCount > 0 && failedCount > 0 ? "partial" : failedCount > 0 ? "failed" : successCount > 0 ? "completed" : "completed";

        await dayRunRef.set(
          {
            finishedAt: nowField,
            successCount,
            failedCount,
            status: finalStatus,
            updatedAt: nowField,
          },
          { merge: true }
        );

        const nextAutopayRunAtMs =
          targetCount === 0 ? nowMs + ONE_DAY_MS : nowMs + TWENTY_EIGHT_DAYS_MS;

        await feeDoc.ref.set(
          {
            autopayLastRunAt: nowField,
            autopayRunAt: Timestamp.fromMillis(nextAutopayRunAtMs),
            autopayStatus: finalStatus === "partial" ? "partial" : finalStatus === "failed" ? "failed" : "done",
            updatedAt: nowField,
          },
          { merge: true }
        );

        for (const n of failureNotifs.slice(0, 50)) {
          await db.collection("notifications").add({
            type: "fee_autopay_failed",
            teamId,
            feeId,
            userId: n.uid,
            targetUid: n.uid,
            correlationId: n.orderId || buildFeePaymentCorrelationId(feeId, n.uid),
            title: "회비 자동결제 실패",
            body: n.body,
            link: `/team/${encodeURIComponent(teamId)}?tab=home`,
            status: "queued",
            createdAt: nowField,
          });
        }

        logger.info("[feeAutopayScheduler] fee 완료", {
          teamId,
          feeId,
          targetCount,
          successCount,
          failedCount,
        });
      }
    }

    logger.info("[feeAutopayScheduler] 전체 완료", {
      feesSeen,
      feesRun,
      chargesOk,
      chargesFail,
      dateKey,
    });
  }
);
