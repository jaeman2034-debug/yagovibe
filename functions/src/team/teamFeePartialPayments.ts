/**
 * 오프라인 부분납부·롤백 ( Callable 전용 ).
 * - amountPaid 는 누적; status 는 납부액 대비 청구액으로만 결정 ( paid 직접 고정 금지 ).
 * - 연납 분할·온라인 결제 진행 중 문서는 수정 불가.
 * - cashBook: 입금 청크마다 수입 1건(감사 로그 doc id 기준 멱등), 롤백 시 동일 금액 지출 1건.
 * - partial → paid 전환 시 onFeePaidCashBook 트리거는 전액 수입을 넣지 않음(청크로 이미 반영).
 * - 동일 Callable 호출·동일 auditRef 기준으로 장부 문서가 이미 있으면 멱등 성공(재시도·중복 쓰기 방지).
 *   서로 다른 호출이 같은 금액으로 동시에 들어오는 경우는 별도 idempotency-key API 없이 완전 차단되지 않음.
 */
import * as admin from "firebase-admin";
import type { DocumentData } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  applyCashBookEntryWithSnapshots,
  cashBookDeterministicIdFromRef,
  sanitizeCashBookDeterministicDocId,
} from "./accounting/createCashBookEntry";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import { buildTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";
import { assertTeamMemberCountWithinPlan } from "../lib/teamPlan";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";
import {
  assertHubTeamStaffForManualFee,
  ensureActiveTeamMember,
  getActiveTeamMemberDocSnap,
} from "./teamFeePayments";

const SYSTEM_CASHBOOK_UID = "system_cashbook";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function assertSafeFirestorePathSegment(fieldLabel: string, id: string) {
  const v = String(id || "").trim();
  if (!v) {
    throw new HttpsError("invalid-argument", `${fieldLabel}이(가) 필요합니다.`);
  }
  if (v.includes("/") || v.includes("\\") || v === "." || v === "..") {
    throw new HttpsError("invalid-argument", `유효하지 않은 ${fieldLabel}입니다.`);
  }
  if (v.length > 800) {
    throw new HttpsError("invalid-argument", `${fieldLabel}이(가) 너무 깁니다.`);
  }
}

function floorMoney(label: string, raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) {
    throw new HttpsError("invalid-argument", `${label} 숫자가 올바르지 않습니다.`);
  }
  return n;
}

function isAnnualLockedPayment(data: Record<string, unknown>): boolean {
  const source = String(data.source || "").trim().toLowerCase();
  const sourceType = String(data.sourceType || "").trim().toLowerCase();
  return (
    source === "annual" ||
    sourceType === "annual_prepaid" ||
    sourceType === "annual_prepaid_split"
  );
}

function isOnlineCheckoutInFlight(data: Record<string, unknown>): boolean {
  const prevOrderId = typeof data.orderId === "string" ? data.orderId.trim() : "";
  const st = String(data.status || "").trim().toLowerCase();
  return st === "pending" && prevOrderId.length > 0 && !prevOrderId.startsWith("manual_fee_");
}

function resolveDueFromPaymentAndFee(payment: Record<string, unknown>, feeAmount: number): number {
  const explicit = Math.floor(Number(payment.amountDue));
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  if (Number.isFinite(feeAmount) && feeAmount > 0) {
    return feeAmount;
  }
  const legacyAmount = Math.floor(Number(payment.amount));
  if (Number.isFinite(legacyAmount) && legacyAmount > 0) {
    return legacyAmount;
  }
  return 0;
}

function resolvePaidBaseline(payment: Record<string, unknown>, due: number): number {
  let paid = Math.floor(Number(payment.amountPaid));
  if (!Number.isFinite(paid) || paid < 0) {
    paid = 0;
  }
  const st = String(payment.status || "").trim().toLowerCase();
  if (st === "paid" && paid <= 0) {
    paid = due;
  }
  return paid;
}

export const recordPartialTeamFeePayment = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const actorUid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const feeId = String(request.data?.feeId || "").trim();
    const targetUid = String(request.data?.targetUid || "").trim();
    const amountChunkWon = floorMoney("납부액", request.data?.amountChunkWon);

    assertSafeFirestorePathSegment("teamId", teamId);
    assertSafeFirestorePathSegment("feeId", feeId);
    assertSafeFirestorePathSegment("targetUid", targetUid);

    if (amountChunkWon < 1) {
      throw new HttpsError("invalid-argument", "납부 금액은 1원 이상이어야 합니다.");
    }

    await assertHubTeamStaffForManualFee(teamId, actorUid);
    await ensureActiveTeamMember(teamId, targetUid);
    await assertTeamMemberCountWithinPlan(teamId);

    const resolvedMember = await getActiveTeamMemberDocSnap(teamId, targetUid);
    const memberRef = resolvedMember?.ref ?? db.doc(`teams/${teamId}/members/${targetUid}`);

    const feeRef = db.doc(`teams/${teamId}/fees/${feeId}`);
    const paymentRef = db.doc(`teams/${teamId}/payments/${buildTeamFeePaymentDocId(feeId, targetUid)}`);
    const teamRef = db.doc(`teams/${teamId}`);
    const summaryRef = db.doc(`teams/${teamId}/cashBookSummary/default`);
    const correlationBase = buildFeePaymentCorrelationId(feeId, targetUid);

    /** 서버 전용 auto-id — 인자 없는 `doc()` (클라이언트가 id를 넘기지 않음, 충돌 없음) */
    const auditRef = feeRef.collection("paymentAuditLog").doc();

    try {
      const summary = await db.runTransaction(async (tx) => {
        const feeSnap = await tx.get(feeRef);
        const paySnap = await tx.get(paymentRef);
        const memSnap = await tx.get(memberRef);
        if (!feeSnap.exists) {
          throw new HttpsError("not-found", "회비를 찾을 수 없습니다.");
        }
        if (!paySnap.exists) {
          throw new HttpsError("not-found", "납부 문서가 없습니다. 회비 생성·시드를 확인해 주세요.");
        }

        const feeData = feeSnap.data() || {};
        if (feeData.status !== "open") {
          throw new HttpsError("failed-precondition", "마감된 회비에는 납부를 기록할 수 없습니다.");
        }
        const feeAmount = Math.floor(Number(feeData.amount || 0));

        const data = (paySnap.data() || {}) as Record<string, unknown>;
        if (isAnnualLockedPayment(data)) {
          throw new HttpsError("failed-precondition", "연납으로 처리된 회차는 부분납부를 수정할 수 없습니다.");
        }
        if (isOnlineCheckoutInFlight(data)) {
          throw new HttpsError(
            "failed-precondition",
            "이 멤버는 온라인 결제가 진행 중입니다. 결제가 끝난 뒤 처리해 주세요."
          );
        }

        const st = String(data.status || "").trim().toLowerCase();
        if (st === "cancelled") {
          throw new HttpsError("failed-precondition", "취소된 납부 문서에는 금액을 더할 수 없습니다.");
        }

        const due = resolveDueFromPaymentAndFee(data, feeAmount);
        if (!Number.isFinite(due) || due < 1) {
          throw new HttpsError("failed-precondition", "청구 금액을 확인할 수 없습니다.");
        }

        const paidBefore = resolvePaidBaseline(data, due);
        if (paidBefore >= due) {
          throw new HttpsError("failed-precondition", "이미 완납된 회차입니다.");
        }

        const nextPaid = paidBefore + amountChunkWon;
        if (nextPaid > due) {
          throw new HttpsError(
            "failed-precondition",
            `납부 합계가 청구액(${due.toLocaleString("ko-KR")}원)을 초과합니다.`
          );
        }

        const nextStatus = nextPaid >= due ? "paid" : "partial";

        const feeTitle =
          typeof feeData.title === "string" && feeData.title.trim()
            ? String(feeData.title)
            : "팀 회비";
        let counterpartyName: string | null = null;
        if (memSnap.exists) {
          const md = memSnap.data() || {};
          counterpartyName =
            (typeof md.name === "string" && md.name.trim()) ||
            (typeof md.displayName === "string" && md.displayName.trim()) ||
            null;
        }

        const partialSourceRefId = `feePaymentPartial:${teamId}:${feeId}:${targetUid}:${auditRef.id}`;
        const cbDeterministic = cashBookDeterministicIdFromRef(partialSourceRefId);
        const cbRef = db
          .collection(`teams/${teamId}/cashBook`)
          .doc(sanitizeCashBookDeterministicDocId(cbDeterministic));

        const auditSnap = await tx.get(auditRef);
        const cbSnap = await tx.get(cbRef);
        const sumSnap = await tx.get(summaryRef);

        if (auditSnap.exists && cbSnap.exists) {
          const ad = auditSnap.data() || {};
          const chunk = Math.floor(Number(ad.amountChunkWon));
          const paidAfterAudit = Math.floor(Number(ad.amountPaidAfter));
          const paidBeforeAudit = Math.floor(Number(ad.amountPaidBefore));
          const payPaidNow = resolvePaidBaseline(data, due);
          if (
            String(ad.type) === "partial_payment" &&
            chunk === amountChunkWon &&
            Number.isFinite(paidAfterAudit) &&
            Number.isFinite(paidBeforeAudit) &&
            payPaidNow === paidAfterAudit
          ) {
            logger.info("💳 payment_event", {
              phase: "partial_payment",
              action: "idempotent_replay_same_audit_and_cashbook",
              teamId,
              feeId,
              targetUid,
              auditId: auditRef.id,
              amountChunkWon,
            });
            return {
              idempotentReplay: true as const,
              amountDue: due,
              amountPaidBefore: paidBeforeAudit,
              amountPaidAfter: paidAfterAudit,
              status: String(ad.statusAfter || data.status || "partial"),
            };
          }
          throw new HttpsError(
            "failed-precondition",
            "동일 감사·장부 키가 있으나 납부 상태와 맞지 않습니다. 새로고침 후 확인해 주세요."
          );
        }
        if (auditSnap.exists !== cbSnap.exists) {
          throw new HttpsError(
            "failed-precondition",
            "장부와 감사 로그가 불일치합니다. 운영자에게 문의해 주세요."
          );
        }

        await applyCashBookEntryWithSnapshots(
          tx,
          {
            teamId,
            kind: "income",
            category: "membership",
            amount: amountChunkWon,
            occurredAt: admin.firestore.Timestamp.now(),
            memo: `${feeTitle} 부분납부`,
            counterpartyUid: targetUid,
            counterpartyName,
            source: "membership",
            feeId,
            sourceRefId: partialSourceRefId,
            sourceRefType: "feePayment",
            createdByUid: SYSTEM_CASHBOOK_UID,
          },
          cbRef,
          summaryRef,
          cbSnap,
          sumSnap
        );

        const patch: Record<string, unknown> = {
          teamId,
          feeId,
          userId: targetUid,
          amountDue: due,
          amountPaid: nextPaid,
          amount: due,
          status: nextStatus,
          /** 백필·paid 트리거가 전액 수입을 또 넣지 않도록 표시 (청크별 장부 반영) */
          cashBookIncomeSource: "fee_payment_chunks",
          source: "manual",
          method: "manual_partial",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          manualRecordedByUid: actorUid,
          manualRecordedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPaymentChunkAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPaymentChunkAmount: amountChunkWon,
          paymentKey: admin.firestore.FieldValue.delete(),
          failCode: admin.firestore.FieldValue.delete(),
          failReason: admin.firestore.FieldValue.delete(),
          failedAt: admin.firestore.FieldValue.delete(),
        };

        if (nextStatus === "paid") {
          patch.paidAt = admin.firestore.FieldValue.serverTimestamp();
          patch.orderId = correlationBase;
        } else {
          patch.paidAt = admin.firestore.FieldValue.delete();
        }

        tx.set(paymentRef, patch as DocumentData, { merge: true });

        const auditPayload: Record<string, unknown> = {
          type: "partial_payment",
          teamId,
          feeId,
          targetUid,
          amountChunkWon,
          amountDue: due,
          amountPaidBefore: paidBefore,
          amountPaidAfter: nextPaid,
          statusAfter: nextStatus,
          recordedByUid: actorUid,
          orderId: correlationBase,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(auditRef, auditPayload as DocumentData);

        tx.set(teamRef, teamDocumentActivityPatch() as DocumentData, { merge: true });

        return {
          amountDue: due,
          amountPaidBefore: paidBefore,
          amountPaidAfter: nextPaid,
          status: nextStatus,
        };
      });

      logger.info("💳 payment_event", {
        phase: "partial_payment",
        teamId,
        feeId,
        targetUid,
        actorUid,
        ...summary,
      });

      return { success: true as const, ...summary };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("[recordPartialTeamFeePayment] unexpected", {
        message: e instanceof Error ? e.message : String(e),
        teamId,
        feeId,
        targetUid,
      });
      throw new HttpsError("internal", "부분납부 처리 중 오류가 발생했습니다.");
    }
  }
);

export const rollbackPartialTeamFeePayment = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const actorUid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const feeId = String(request.data?.feeId || "").trim();
    const targetUid = String(request.data?.targetUid || "").trim();
    const amountChunkWon = floorMoney("되돌릴 금액", request.data?.amountChunkWon);

    assertSafeFirestorePathSegment("teamId", teamId);
    assertSafeFirestorePathSegment("feeId", feeId);
    assertSafeFirestorePathSegment("targetUid", targetUid);

    if (amountChunkWon < 1) {
      throw new HttpsError("invalid-argument", "되돌릴 금액은 1원 이상이어야 합니다.");
    }

    await assertHubTeamStaffForManualFee(teamId, actorUid);
    await ensureActiveTeamMember(teamId, targetUid);

    const resolvedMemberRb = await getActiveTeamMemberDocSnap(teamId, targetUid);
    const memberRef = resolvedMemberRb?.ref ?? db.doc(`teams/${teamId}/members/${targetUid}`);

    const feeRef = db.doc(`teams/${teamId}/fees/${feeId}`);
    const paymentRef = db.doc(`teams/${teamId}/payments/${buildTeamFeePaymentDocId(feeId, targetUid)}`);
    const teamRef = db.doc(`teams/${teamId}`);
    const summaryRef = db.doc(`teams/${teamId}/cashBookSummary/default`);
    const correlationBase = buildFeePaymentCorrelationId(feeId, targetUid);
    /** 서버 전용 auto-id — 인자 없는 `doc()` */
    const auditRef = feeRef.collection("paymentAuditLog").doc();

    try {
      const summary = await db.runTransaction(async (tx) => {
        const feeSnap = await tx.get(feeRef);
        const paySnap = await tx.get(paymentRef);
        const memSnap = await tx.get(memberRef);
        if (!feeSnap.exists) {
          throw new HttpsError("not-found", "회비를 찾을 수 없습니다.");
        }
        if (!paySnap.exists) {
          throw new HttpsError("not-found", "납부 문서가 없습니다.");
        }

        const feeData = feeSnap.data() || {};
        if (feeData.status !== "open") {
          throw new HttpsError("failed-precondition", "마감된 회비에서는 롤백할 수 없습니다.");
        }
        const feeAmount = Math.floor(Number(feeData.amount || 0));

        const data = (paySnap.data() || {}) as Record<string, unknown>;
        if (isAnnualLockedPayment(data)) {
          throw new HttpsError("failed-precondition", "연납으로 처리된 회차는 롤백할 수 없습니다.");
        }
        if (isOnlineCheckoutInFlight(data)) {
          throw new HttpsError(
            "failed-precondition",
            "이 멤버는 온라인 결제가 진행 중입니다. 결제가 끝난 뒤 처리해 주세요."
          );
        }

        const st = String(data.status || "").trim().toLowerCase();
        if (st === "cancelled") {
          throw new HttpsError("failed-precondition", "취소된 납부 문서는 롤백할 수 없습니다.");
        }

        const due = resolveDueFromPaymentAndFee(data, feeAmount);
        if (!Number.isFinite(due) || due < 1) {
          throw new HttpsError("failed-precondition", "청구 금액을 확인할 수 없습니다.");
        }

        const paidBefore = resolvePaidBaseline(data, due);
        if (paidBefore < amountChunkWon) {
          throw new HttpsError(
            "failed-precondition",
            `되돌릴 수 있는 납부액(${paidBefore.toLocaleString("ko-KR")}원)보다 큽니다.`
          );
        }

        const nextPaid = paidBefore - amountChunkWon;
        const nextStatus =
          nextPaid <= 0 ? "pending" : nextPaid >= due ? "paid" : "partial";

        const feeTitle =
          typeof feeData.title === "string" && feeData.title.trim()
            ? String(feeData.title)
            : "팀 회비";
        let counterpartyName: string | null = null;
        if (memSnap.exists) {
          const md = memSnap.data() || {};
          counterpartyName =
            (typeof md.name === "string" && md.name.trim()) ||
            (typeof md.displayName === "string" && md.displayName.trim()) ||
            null;
        }

        const rollbackSourceRefId = `feePaymentPartialRollback:${teamId}:${feeId}:${targetUid}:${auditRef.id}`;
        const rbDeterministic = cashBookDeterministicIdFromRef(rollbackSourceRefId);
        const rbRef = db
          .collection(`teams/${teamId}/cashBook`)
          .doc(sanitizeCashBookDeterministicDocId(rbDeterministic));

        const auditSnap = await tx.get(auditRef);
        const rbSnap = await tx.get(rbRef);
        const sumSnap = await tx.get(summaryRef);

        if (auditSnap.exists && rbSnap.exists) {
          const ad = auditSnap.data() || {};
          const chunk = Math.floor(Number(ad.amountChunkWon));
          const paidAfterAudit = Math.floor(Number(ad.amountPaidAfter));
          const paidBeforeAudit = Math.floor(Number(ad.amountPaidBefore));
          const payPaidNow = resolvePaidBaseline(data, due);
          if (
            String(ad.type) === "partial_payment_rollback" &&
            chunk === amountChunkWon &&
            Number.isFinite(paidAfterAudit) &&
            Number.isFinite(paidBeforeAudit) &&
            payPaidNow === paidAfterAudit
          ) {
            logger.info("💳 payment_event", {
              phase: "partial_payment_rollback",
              action: "idempotent_replay_same_audit_and_cashbook",
              teamId,
              feeId,
              targetUid,
              auditId: auditRef.id,
              amountChunkWon,
            });
            return {
              idempotentReplay: true as const,
              amountDue: due,
              amountPaidBefore: paidBeforeAudit,
              amountPaidAfter: paidAfterAudit,
              status: String(ad.statusAfter || data.status || "pending"),
              cashBookAdjustmentSuggested: false,
            };
          }
          throw new HttpsError(
            "failed-precondition",
            "동일 감사·장부 롤백 키가 있으나 납부 상태와 맞지 않습니다. 새로고침 후 확인해 주세요."
          );
        }
        if (auditSnap.exists !== rbSnap.exists) {
          throw new HttpsError(
            "failed-precondition",
            "장부와 감사 로그가 불일치합니다. 운영자에게 문의해 주세요."
          );
        }

        await applyCashBookEntryWithSnapshots(
          tx,
          {
            teamId,
            kind: "expense",
            category: "membership",
            amount: amountChunkWon,
            occurredAt: admin.firestore.Timestamp.now(),
            memo: `${feeTitle} 부분납부 취소`,
            counterpartyUid: targetUid,
            counterpartyName,
            source: "membership",
            feeId,
            sourceRefId: rollbackSourceRefId,
            sourceRefType: "feeRefund",
            createdByUid: SYSTEM_CASHBOOK_UID,
          },
          rbRef,
          summaryRef,
          rbSnap,
          sumSnap
        );

        const patch: Record<string, unknown> = {
          teamId,
          feeId,
          userId: targetUid,
          amountDue: due,
          amountPaid: nextPaid,
          amount: due,
          status: nextStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          manualRecordedByUid: actorUid,
          manualRecordedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (nextPaid <= 0) {
          patch.cashBookIncomeSource = admin.firestore.FieldValue.delete();
        } else {
          patch.cashBookIncomeSource = "fee_payment_chunks";
        }

        if (nextStatus === "paid") {
          patch.paidAt = data.paidAt ?? admin.firestore.FieldValue.serverTimestamp();
        } else {
          patch.paidAt = admin.firestore.FieldValue.delete();
          if (nextPaid <= 0) {
            patch.orderId = admin.firestore.FieldValue.delete();
          }
        }

        tx.set(paymentRef, patch as DocumentData, { merge: true });

        const auditPayload: Record<string, unknown> = {
          type: "partial_payment_rollback",
          teamId,
          feeId,
          targetUid,
          amountChunkWon,
          amountDue: due,
          amountPaidBefore: paidBefore,
          amountPaidAfter: nextPaid,
          statusAfter: nextStatus,
          recordedByUid: actorUid,
          orderId: correlationBase,
          cashBookNote: `장부 지출 1건 반영(부분납부 취소, ${amountChunkWon.toLocaleString("ko-KR")}원)`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(auditRef, auditPayload as DocumentData);

        tx.set(teamRef, teamDocumentActivityPatch() as DocumentData, { merge: true });

        return {
          idempotentReplay: false as const,
          amountDue: due,
          amountPaidBefore: paidBefore,
          amountPaidAfter: nextPaid,
          status: nextStatus,
          cashBookAdjustmentSuggested: false,
        };
      });

      logger.info("💳 payment_event", {
        phase: "partial_payment_rollback",
        teamId,
        feeId,
        targetUid,
        actorUid,
        ...summary,
      });

      return { success: true as const, ...summary };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("[rollbackPartialTeamFeePayment] unexpected", {
        message: e instanceof Error ? e.message : String(e),
        teamId,
        feeId,
        targetUid,
      });
      throw new HttpsError("internal", "납부 롤백 처리 중 오류가 발생했습니다.");
    }
  }
);
