/**
 * 회비 환불 기록 — append-only (`payments` 수정 금지)
 * 읽기·누적 한도 검증·쓰기는 runTransaction 으로 원자화 (동시 환불 레이스 방지)
 */
import * as admin from "firebase-admin";
import type { DocumentData } from "firebase-admin/firestore";
import { createHash } from "crypto";
import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { buildTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";
import { assertHubTeamStaffForManualFee, ensureActiveTeamMember } from "./teamFeePayments";
import { createCashBookEntryWithSummary } from "./accounting/createCashBookEntry";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/** 출납부 멱등 키 — `cashBook` 문서 ID와 동일 */
function feeRefundCashBookDeterministicId(refundDocId: string): string {
  const id = String(refundDocId || "").trim();
  return `feeRefund:${id}`;
}

async function ensureFeeRefundCashBookExpense(input: {
  teamId: string;
  refundDocId: string;
  feeId: string;
  memberId: string;
  refundAmountWon: number;
  reason: string;
  actorUid: string;
}): Promise<void> {
  const sourceRefId = feeRefundCashBookDeterministicId(input.refundDocId);
  await createCashBookEntryWithSummary({
    teamId: input.teamId,
    deterministicId: sourceRefId,
    kind: "expense",
    category: "refund",
    amount: input.refundAmountWon,
    occurredAt: admin.firestore.Timestamp.now(),
    memo:
      input.reason.length > 220 ? `${input.reason.slice(0, 217).trim()}…` : input.reason.trim(),
    counterpartyUid: input.memberId,
    source: "auto",
    feeId: input.feeId,
    sourceRefId,
    sourceRefType: "feeRefund",
    createdByUid: input.actorUid,
  });
}

function assertSegment(label: string, id: string): void {
  const v = String(id || "").trim();
  if (!v) throw new HttpsError("invalid-argument", `${label}이(가) 필요합니다.`);
  if (v.includes("/") || v.includes("\\")) throw new HttpsError("invalid-argument", `유효하지 않은 ${label}입니다.`);
}

type TxOutcome =
  | { duplicate: true; refundId: string; refundAmountWon: number }
  | {
      duplicate: false;
      refundId: string;
      refundAmountWon: number;
      originalPaymentDocId: string;
    };

/** 단일 회차 환불 — 동일 payment+fee 누적 환불 ≤ 납부 금액 */
export const registerFeeRefund = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const actorUid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const feeId = String(request.data?.feeId || "").trim();
    const memberId = String(request.data?.memberId || request.data?.userId || "").trim();
    const refundAmountRaw = Math.floor(Number(request.data?.refundAmountWon ?? NaN));
    const reason = String(request.data?.reason || "").trim();
    const idempotencyKeyRaw =
      typeof request.data?.idempotencyKey === "string" ? request.data.idempotencyKey.trim() : "";

    assertSegment("teamId", teamId);
    assertSegment("feeId", feeId);
    assertSegment("memberId", memberId);

    if (!Number.isFinite(refundAmountRaw) || refundAmountRaw < 1) {
      throw new HttpsError("invalid-argument", "환불 금액은 1원 이상이어야 합니다.");
    }
    if (!reason || reason.length < 2) {
      throw new HttpsError("invalid-argument", "환불 사유를 짧게라도 입력해 주세요.");
    }
    if (reason.length > 500) {
      throw new HttpsError("invalid-argument", "환불 사유가 너무 깁니다.");
    }

    const paymentDocId = buildTeamFeePaymentDocId(feeId, memberId);

    try {
      await assertHubTeamStaffForManualFee(teamId, actorUid);
      await ensureActiveTeamMember(teamId, memberId);

      const paymentRef = db.doc(`teams/${teamId}/payments/${paymentDocId}`);
      const refundsCol = db.collection(`teams/${teamId}/feeRefunds`);
      const priorQuery = refundsCol
        .where("originalPaymentDocId", "==", paymentDocId)
        .where("feeId", "==", feeId)
        .where("status", "==", "completed");
      const teamRef = db.doc(`teams/${teamId}`);

      const idemHash = idempotencyKeyRaw
        ? createHash("sha256")
            .update(`${teamId}|${feeId}|${memberId}|${idempotencyKeyRaw}`)
            .digest("hex")
            .slice(0, 40)
        : null;
      const idemRef = idemHash ? refundsCol.doc(`idem_${idemHash}`) : null;
      /** 요청당 1회 생성 — 트랜잭션 재시도 시 동일 ref 로 set 이 멱등 */
      const newRefundRef = idemRef ? null : refundsCol.doc();

      const txOutcome: TxOutcome = await db.runTransaction(async (transaction) => {
        if (idemRef) {
          const idemSnap = await transaction.get(idemRef);
          if (idemSnap.exists) {
            const prevAmt = Math.floor(Number(idemSnap.data()?.refundAmountWon ?? 0));
            return {
              duplicate: true,
              refundId: idemRef.id,
              refundAmountWon: Number.isFinite(prevAmt) ? prevAmt : refundAmountRaw,
            };
          }
        }

        const paymentSnap = await transaction.get(paymentRef);
        if (!paymentSnap.exists) {
          throw new HttpsError("not-found", "납부 문서를 찾을 수 없습니다.");
        }
        const pd = paymentSnap.data() || {};
        const status = String(pd.status || "").trim();
        if (status !== "paid") {
          throw new HttpsError("failed-precondition", "완납된 건만 환불 기록할 수 있습니다.");
        }
        const docFeeId = String(pd.feeId || "").trim();
        if (docFeeId && docFeeId !== feeId) {
          throw new HttpsError("invalid-argument", "회차와 납부 문서가 일치하지 않습니다.");
        }

        const paidAmount = Math.floor(Number(pd.amount ?? 0));
        if (!Number.isFinite(paidAmount) || paidAmount < 1) {
          throw new HttpsError("failed-precondition", "납부 금액을 확인할 수 없습니다.");
        }

        const priorSnap = await transaction.get(priorQuery);
        let priorSum = 0;
        priorSnap.forEach((d) => {
          const x = Math.floor(Number(d.data()?.refundAmountWon ?? 0));
          if (Number.isFinite(x) && x > 0) priorSum += x;
        });

        const remaining = paidAmount - priorSum;
        if (remaining < 1) {
          throw new HttpsError("failed-precondition", "남은 환불 가능 금액이 없습니다.");
        }
        if (refundAmountRaw > remaining) {
          throw new HttpsError(
            "invalid-argument",
            `환불 가능 금액은 최대 ${remaining.toLocaleString("ko-KR")}원입니다. (이미 환불 기록 ${priorSum.toLocaleString("ko-KR")}원)`
          );
        }

        const sourceBulkPaymentId =
          typeof pd.sourceBulkPaymentId === "string" && pd.sourceBulkPaymentId.trim()
            ? String(pd.sourceBulkPaymentId).trim()
            : undefined;

        const allocationDetail = {
          perFeeWon: { [feeId]: refundAmountRaw } as Record<string, number>,
        };

        const basePayload: Record<string, unknown> = {
          teamId,
          feeId,
          memberId,
          originalPaymentDocId: paymentDocId,
          refundAmountWon: refundAmountRaw,
          currency: "KRW",
          reason,
          refundKind: "single_fee",
          status: "completed",
          allocationDetail,
          feeIds: [feeId],
          createdByUid: actorUid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (sourceBulkPaymentId) basePayload.sourceBulkPaymentId = sourceBulkPaymentId;
        if (idempotencyKeyRaw) basePayload.idempotencyKey = idempotencyKeyRaw.slice(0, 200);

        const refundTargetRef = idemRef ?? newRefundRef;
        if (!refundTargetRef) {
          throw new HttpsError("internal", "환불 문서 참조를 만들 수 없습니다.");
        }

        transaction.set(refundTargetRef, basePayload as DocumentData);
        transaction.set(teamRef, teamDocumentActivityPatch() as DocumentData, { merge: true });

        return {
          duplicate: false,
          refundId: refundTargetRef.id,
          refundAmountWon: refundAmountRaw,
          originalPaymentDocId: paymentDocId,
        };
      });

      logger.info("[registerFeeRefund] completed", {
        teamId,
        feeId,
        memberId,
        actorUid,
        refundAmountWon: refundAmountRaw,
        duplicate: txOutcome.duplicate,
        refundDocId: txOutcome.refundId,
      });

      let cashBookSynced = true;
      try {
        await ensureFeeRefundCashBookExpense({
          teamId,
          refundDocId: txOutcome.refundId,
          feeId,
          memberId,
          refundAmountWon: txOutcome.refundAmountWon,
          reason,
          actorUid,
        });
      } catch (cbErr) {
        cashBookSynced = false;
        logger.error("[registerFeeRefund] cashBook expense failed (feeRefund doc committed)", {
          teamId,
          feeId,
          refundDocId: txOutcome.refundId,
          message: cbErr instanceof Error ? cbErr.message : String(cbErr),
        });
      }

      if (txOutcome.duplicate === false) {
        return {
          success: true as const,
          duplicate: false as const,
          originalPaymentDocId: txOutcome.originalPaymentDocId,
          refundAmountWon: txOutcome.refundAmountWon,
          refundId: txOutcome.refundId,
          cashBookSynced,
        };
      }
      return {
        success: true as const,
        duplicate: true as const,
        refundId: txOutcome.refundId,
        refundAmountWon: txOutcome.refundAmountWon,
        cashBookSynced,
      };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("[registerFeeRefund] unexpected", {
        teamId,
        feeId,
        memberId,
        message: e instanceof Error ? e.message : String(e),
      });
      throw new HttpsError("internal", "환불 기록 처리 중 오류가 발생했습니다.");
    }
  }
);
