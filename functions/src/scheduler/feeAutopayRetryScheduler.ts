import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import { buildTeamFeeAutopayOrderId } from "../lib/tossTeamFeeOrderIds";
import { isPaidDone, tossBillingExecute, type TossBillingPayResponse } from "../lib/tossAutopayCharge";
import { seoulYyyyMm } from "./seoulDateUtils";
import { getNextRetryAfterAutopayFailure } from "./seoulRetryUtils";
import {
  clearReRegisterAttributionProfileFields,
  paymentFieldsFromReRegisterProfile,
} from "../lib/billingReRegisterAttribution";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

function resolveTeamFeePaymentContext(
  doc: QueryDocumentSnapshot
): { teamId: string; feeId: string; uid: string } | null {
  const data = doc.data() as Record<string, unknown>;
  const teamId = typeof data.teamId === "string" ? data.teamId.trim() : "";
  const feeId = typeof data.feeId === "string" ? data.feeId.trim() : "";
  const uid = typeof data.userId === "string" ? data.userId.trim() : "";
  if (teamId && feeId && uid) {
    return { teamId, feeId, uid };
  }
  const p = doc.ref.path.split("/");
  if (p.length === 6 && p[0] === "teams" && p[2] === "fees" && p[4] === "payments") {
    return { teamId: p[1], feeId: p[3], uid: p[5] };
  }
  return null;
}

async function sendExhaustedNotif(
  teamId: string,
  feeId: string,
  uid: string,
  orderName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nowField: any,
  paymentOrderId?: string
) {
  await db.collection("notifications").add({
    type: "fee_autopay_exhausted",
    teamId,
    feeId,
    userId: uid,
    targetUid: uid,
    correlationId: paymentOrderId?.trim() || buildFeePaymentCorrelationId(feeId, uid),
    title: "회비 자동결제 재시도 종료",
    body: `「${orderName}」자동결제 재시도가 모두 소진되었습니다. 카드 재등록 또는 수동 납부를 해주세요.`,
    link: `/team/${encodeURIComponent(teamId)}?tab=home`,
    status: "queued",
    createdAt: nowField,
  });
}

/**
 * failed + nextRetryAt <= now 인 자동결제 건만 재승인.
 * 알림: 재시도 성공만 즉시 발송, 재시도 소진 시에만 exhausted 발송(노이즈 최소화).
 */
export const feeAutopayRetryScheduler = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const nowTs = Timestamp.now();
    const nowMs = nowTs.toMillis();
    const nowField = FieldValue.serverTimestamp();

    let dueSnap;
    try {
      dueSnap = await db
        .collectionGroup("payments")
        .where("source", "==", "autopay")
        .where("status", "==", "failed")
        .where("nextRetryAt", "<=", nowTs)
        .limit(200)
        .get();
    } catch (e) {
      logger.error("[feeAutopayRetryScheduler] 쿼리 실패 — Firestore 복합 인덱스 확인", { error: String(e) });
      return;
    }

    if (dueSnap.empty) {
      logger.info("[feeAutopayRetryScheduler] 대상 없음");
      return;
    }

    let processed = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const paymentDoc of dueSnap.docs) {
      const parsed = resolveTeamFeePaymentContext(paymentDoc);
      if (!parsed) continue;

      const payment = paymentDoc.data() as Record<string, unknown>;
      if (payment.retryExhausted === true) continue;

      const prevCount =
        typeof payment.chargeAttemptCount === "number" && Number.isFinite(payment.chargeAttemptCount)
          ? payment.chargeAttemptCount
          : 0;
      if (prevCount >= 3) continue;

      const { teamId, feeId, uid } = parsed;
      const feeSnap = await db.doc(`teams/${teamId}/fees/${feeId}`).get();
      if (!feeSnap.exists) continue;
      const fee = feeSnap.data() as Record<string, unknown>;
      if (fee.status !== "open") continue;

      const amount = Number(fee.amount || 0);
      const orderName = String(fee.title || "팀 회비");
      if (amount <= 0) continue;

      const profileSnap = await db.doc(`teams/${teamId}/billingProfiles/${uid}`).get();
      const secretSnap = await db.doc(`teams/${teamId}/billingSecrets/${uid}`).get();

      const nextSeq = prevCount + 1;
      const scheduleFail = async (failCode: string, failReason: string) => {
        const nxt = getNextRetryAfterAutopayFailure(nextSeq, nowMs);
        await paymentDoc.ref.set(
          {
            userId: uid,
            status: "failed",
            failCode,
            failReason,
            chargeAttemptCount: FieldValue.increment(1),
            nextRetryAt: nxt,
            retryExhausted: nxt === null,
            lastFailedAt: nowField,
            lastRetryScheduledAt: nowField,
            updatedAt: nowField,
            failedAt: nowField,
          },
          { merge: true }
        );
        if (nxt === null) {
          await sendExhaustedNotif(teamId, feeId, uid, orderName, nowField, undefined);
        }
        failedCount++;
        processed++;
      };

      if (!profileSnap.exists || !secretSnap.exists) {
        await scheduleFail("NO_BILLING_KEY", "자동결제 수단이 등록되어 있지 않습니다.");
        continue;
      }

      const profile = profileSnap.data() as Record<string, unknown>;
      const secret = secretSnap.data() as Record<string, unknown>;
      const billingKey = String(secret.billingKey || "");
      const customerKey = String(secret.customerKey || "");
      if (profile.status !== "active" || !billingKey || !customerKey) {
        await scheduleFail("BILLING_INACTIVE", "자동결제 수단이 비활성 상태입니다.");
        continue;
      }

      const orderId = buildTeamFeeAutopayOrderId(teamId, feeId, uid, seoulYyyyMm(nowMs), nextSeq);
      if (payment.orderId === orderId && payment.status === "pending") {
        continue;
      }

      let exec: { httpOk: boolean; status: number; data: TossBillingPayResponse };
      try {
        exec = await tossBillingExecute(billingKey, {
          customerKey,
          amount,
          orderId,
          orderName,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const nxt = getNextRetryAfterAutopayFailure(nextSeq, nowMs);
        await paymentDoc.ref.set(
          {
            status: "failed",
            orderId,
            failCode: "AUTOPAY_RETRY_EXCEPTION",
            failReason: msg,
            chargeAttemptCount: FieldValue.increment(1),
            nextRetryAt: nxt,
            retryExhausted: nxt === null,
            lastFailedAt: nowField,
            lastRetryScheduledAt: nowField,
            updatedAt: nowField,
            failedAt: nowField,
          },
          { merge: true }
        );
        if (nxt === null) {
          await sendExhaustedNotif(teamId, feeId, uid, orderName, nowField, orderId);
        }
        failedCount++;
        processed++;
        continue;
      }

      const { httpOk, data, status: httpStatus } = exec;
      const done = httpOk && isPaidDone(data);
      const paymentKey = typeof data.paymentKey === "string" ? data.paymentKey : "";

      if (done) {
        const reRegisterPatch = paymentFieldsFromReRegisterProfile(profile);
        const paidPayload: Record<string, unknown> = {
          status: "paid",
          source: "autopay",
          orderId,
          paymentKey: paymentKey || null,
          paidAt: nowField,
          nextRetryAt: null,
          retryExhausted: false,
          lastFailedAt: null,
          lastRetryScheduledAt: null,
          failCode: null,
          failReason: null,
          failedAt: null,
          chargeAttemptCount: nextSeq,
          updatedAt: nowField,
        };
        if (reRegisterPatch) {
          Object.assign(paidPayload, reRegisterPatch);
        }
        await paymentDoc.ref.set(paidPayload, { merge: true });
        if (reRegisterPatch) {
          await db
            .doc(`teams/${teamId}/billingProfiles/${uid}`)
            .set(clearReRegisterAttributionProfileFields(), { merge: true });
        }

        await db.collection("notifications").add({
          type: "fee_autopay_retry_success",
          teamId,
          feeId,
          userId: uid,
          targetUid: uid,
          correlationId: orderId,
          title: "자동결제 재시도 성공",
          body: `「${orderName}」회비 자동결제가 정상 처리되었습니다.`,
          link: `/team/${encodeURIComponent(teamId)}?tab=home`,
          status: "queued",
          createdAt: nowField,
        });

        successCount++;
      } else {
        const nxt = getNextRetryAfterAutopayFailure(nextSeq, nowMs);
        await paymentDoc.ref.set(
          {
            status: "failed",
            source: "autopay",
            orderId,
            paymentKey: paymentKey || null,
            failCode: data.code || `HTTP_${httpStatus}`,
            failReason: data.message || "자동결제 재시도에 실패했습니다.",
            chargeAttemptCount: FieldValue.increment(1),
            nextRetryAt: nxt,
            retryExhausted: nxt === null,
            lastFailedAt: nowField,
            lastRetryScheduledAt: nowField,
            updatedAt: nowField,
            failedAt: nowField,
          },
          { merge: true }
        );
        if (nxt === null) {
          await sendExhaustedNotif(teamId, feeId, uid, orderName, nowField, orderId);
        }
        failedCount++;
      }

      processed++;
    }

    logger.info("[feeAutopayRetryScheduler] 완료", { processed, successCount, failedCount });
  }
);
