/**
 * 회비 payments 문서가 paid 로 전환될 때 cashBook 수입 1건 자동 생성 (멱등).
 * 단, 이전 상태가 partial 인 경우는 부분납부 Callable에서 청크별 수입이 이미 들어가므로 스킵한다.
 */
import * as admin from "firebase-admin";
import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getActiveTeamMemberDocSnap } from "../teamFeePayments";
import {
  cashBookDeterministicIdFromRef,
  createCashBookEntryWithSummary,
  parseFeeIdFromFeePaymentSourceRef,
} from "./createCashBookEntry";
import {
  parsePaymentDocUserIdWithKnownFeeId,
  parseTeamFeePaymentDocId,
} from "../../lib/teamFeePaymentDocId";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const SYSTEM_UID = "system_cashbook";

function callableSafeError(scope: string, e: unknown): HttpsError {
  if (e instanceof HttpsError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  const stack = e instanceof Error ? e.stack : undefined;
  logger.error(`[${scope}]`, { message: msg, stack });
  return new HttpsError("internal", `${scope}: ${msg}`);
}

/** Firestore where("status","==","paid")와 불일치하는 레거시·웹훅 값 대비 */
function isPaidLikeStatus(data: Record<string, unknown>): boolean {
  const s = String(data.status ?? "").trim().toLowerCase();
  return (
    s === "paid" ||
    s === "already_paid" ||
    s === "completed" ||
    s === "done" ||
    s === "success" ||
    s === "succeeded"
  );
}

function matchesFeeIdFilter(docSnap: QueryDocumentSnapshot, feeIdFilter: string): boolean {
  if (!feeIdFilter) return true;
  const data = docSnap.data() as Record<string, unknown>;
  const fid = String(data.feeId || "").trim();
  if (fid === feeIdFilter) return true;
  return parseTeamFeePaymentDocId(docSnap.id)?.feeId === feeIdFilter;
}

/**
 * status=paid 인덱스 조회가 0건일 때(대소문자·다른 문자열 등) documentId 순 스캔
 */
async function scanPaymentsForPaidLike(
  col: admin.firestore.CollectionReference,
  feeIdFilter: string,
  maxDocsToRead: number
): Promise<{ matched: QueryDocumentSnapshot[]; docsRead: number }> {
  const matched: QueryDocumentSnapshot[] = [];
  let last: QueryDocumentSnapshot | null = null;
  const PAGE = 400;
  let docsRead = 0;

  while (docsRead < maxDocsToRead) {
    let q = col.orderBy(FieldPath.documentId()).limit(PAGE);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    if (page.empty) break;

    for (const d of page.docs) {
      docsRead++;
      const data = d.data() as Record<string, unknown>;
      if (!isPaidLikeStatus(data)) continue;
      if (!matchesFeeIdFilter(d, feeIdFilter)) continue;
      matched.push(d);
    }
    last = page.docs[page.docs.length - 1];
    if (page.size < PAGE) break;
  }
  return { matched, docsRead };
}

function asTimestamp(raw: unknown): admin.firestore.Timestamp {
  if (raw instanceof admin.firestore.Timestamp) return raw;
  if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
    const d = (raw as { toDate: () => Date }).toDate();
    return admin.firestore.Timestamp.fromDate(d);
  }
  return admin.firestore.Timestamp.now();
}

async function assertHubTeamStaffForManualFee(teamId: string, actorUid: string): Promise<void> {
  const teamSnap = await db.doc(`teams/${teamId}`).get();
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }
  const ownerUid = String((teamSnap.data() as Record<string, unknown>)?.ownerUid || "");
  if (ownerUid && ownerUid === actorUid) return;

  const memberSnap = await db.doc(`teams/${teamId}/members/${actorUid}`).get();
  if (!memberSnap.exists) {
    throw new HttpsError("permission-denied", "팀 스태프만 실행할 수 있습니다.");
  }
  const m = memberSnap.data() || {};
  if (String(m.status || "active") !== "active") {
    throw new HttpsError("permission-denied", "활성 팀원만 실행할 수 있습니다.");
  }
  const roleRaw = String(m.role || "").trim();
  const role = roleRaw.toLowerCase();
  const accessLevel = String(m.accessLevel || "").trim();
  const staffRoles = new Set(["owner", "manager", "coach", "admin", "vice", "부팀장", "총무", "관리자", "운영자"]);
  if (accessLevel === "ADMIN" || staffRoles.has(role) || staffRoles.has(roleRaw)) return;
  throw new HttpsError("permission-denied", "팀 스태프만 실행할 수 있습니다.");
}

export const onFeePaidCashBookEntry = onDocumentWritten(
  {
    document: "teams/{teamId}/payments/{paymentId}",
    region: "asia-northeast3",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (event) => {
    logger.info("FUNCTION START", {
      fn: "onFeePaidCashBookEntry",
      teamId: String(event.params.teamId || ""),
      paymentId: String(event.params.paymentId || ""),
    });
    const teamId = String(event.params.teamId || "");
    const paymentId = String(event.params.paymentId || "");
    const afterSnap = event.data?.after;
    const afterData = afterSnap?.exists ? ((afterSnap.data() || {}) as Record<string, unknown>) : {};
    let feeId = String(afterData.feeId || "").trim();
    let userId = String(afterData.userId || String(afterData.memberId || "")).trim();
    /** 레거시·부분 merge 로 필드가 비어도 문서 ID가 `feeId_userId` 면 복구 */
    if ((!feeId || !userId) && paymentId) {
      const parsed = parseTeamFeePaymentDocId(paymentId);
      if (parsed) {
        if (!feeId) feeId = parsed.feeId;
        if (!userId) userId = parsed.userId;
      }
    }
    /** `userId`에 `_` 포함(local_*) 시 마지막 `_` 분리 파서가 깨지므로, 알려진 feeId로 접두 제거 */
    const feeIdForDocParse = String(afterData.feeId || "").trim() || feeId;
    if (paymentId && feeIdForDocParse) {
      const fromDoc = parsePaymentDocUserIdWithKnownFeeId(paymentId, feeIdForDocParse);
      if (fromDoc) userId = fromDoc;
    }
    if (!teamId || !feeId || !userId) {
      logger.warn("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_missing_fee_or_user",
        teamId,
        paymentId,
        hasFeeIdField: Boolean(String(afterData.feeId || "").trim()),
        hasUserIdField: Boolean(String(afterData.userId || "").trim()),
      });
      return;
    }

    const beforeSnap = event.data?.before;
    if (!afterSnap?.exists) {
      logger.info("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_doc_deleted",
        teamId,
        paymentId,
      });
      return;
    }

    const after = afterData as Record<string, unknown>;
    if (!after || !isPaidLikeStatus(after)) {
      logger.info("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_after_not_paid_like",
        teamId,
        paymentId,
        status: String(after?.status ?? ""),
      });
      return;
    }

    const before = beforeSnap?.exists ? (beforeSnap.data() as Record<string, unknown>) : undefined;
    if (before && isPaidLikeStatus(before)) {
      logger.info("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_already_paid_before",
        teamId,
        paymentId,
      });
      return;
    }

    const beforeStatus = before ? String(before.status ?? "").trim().toLowerCase() : "";
    if (beforeStatus === "partial") {
      logger.info("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_partial_to_paid_chunk_income_already_booked",
        teamId,
        paymentId,
        feeId,
        userId,
      });
      return;
    }

    const chunkIncomeFlag = String(after.cashBookIncomeSource ?? "").trim();
    if (chunkIncomeFlag === "fee_payment_chunks") {
      logger.info("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_fee_payment_chunks_flag",
        teamId,
        paymentId,
        feeId,
        userId,
      });
      return;
    }

    const feeSnap = await db.doc(`teams/${teamId}/fees/${feeId}`).get();
    const feeData = (feeSnap.data() || {}) as Record<string, unknown>;
    const feeAmount = Math.floor(Number(feeData.amount || 0));
    const feeDueYear = asTimestamp(feeData.dueDate)?.toDate()?.getFullYear();
    const memberSnap = await getActiveTeamMemberDocSnap(teamId, userId);
    const memberData = (memberSnap?.exists ? memberSnap.data() || {} : {}) as Record<string, unknown>;

    const duesTypeRaw = String(after.duesType ?? memberData.duesType ?? memberData.feePlan ?? "")
      .trim()
      .toLowerCase();
    const duesType = duesTypeRaw === "annual" ? "yearly" : duesTypeRaw;
    const yearlyPaidAtRaw = memberData.yearlyPaidAt ?? memberData.annualPaidAt;
    const yearlyPaidAt = asTimestamp(yearlyPaidAtRaw)?.toDate?.();
    const yearlyCovered =
      duesType === "yearly" &&
      feeDueYear != null &&
      yearlyPaidAt instanceof Date &&
      !Number.isNaN(yearlyPaidAt.getTime()) &&
      yearlyPaidAt.getFullYear() === feeDueYear;
    const expectedZeroForPolicy = duesType === "exempt" || yearlyCovered;

    let amount = Math.floor(Number(after.amount || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      if (expectedZeroForPolicy) {
        logger.warn("💳 payment_event", {
          phase: "fee_paid_cashbook",
          action: "trigger_skip_expected_zero_amount_policy",
          teamId,
          paymentId,
          feeId,
          userId,
          duesType: duesType || undefined,
          feeDueYear: feeDueYear ?? undefined,
        });
        return;
      }
      if (Number.isFinite(feeAmount) && feeAmount > 0) {
        amount = feeAmount;
        await afterSnap.ref.set(
          {
            feeId,
            userId,
            amount: feeAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        logger.warn("💳 payment_event", {
          phase: "fee_paid_cashbook",
          action: "trigger_repair_amount_from_fee_before_cashbook",
          teamId,
          paymentId,
          feeId,
          userId,
          amountRaw: after.amount,
          repairedAmount: feeAmount,
        });
      } else {
        logger.warn("💳 payment_event", {
          phase: "fee_paid_cashbook",
          action: "trigger_skip_invalid_amount_no_fee_amount",
          teamId,
          paymentId,
          feeId,
          userId,
          amountRaw: after.amount,
          feeAmount: Number.isFinite(feeAmount) ? feeAmount : null,
        });
        return;
      }
    }

    const orderId = String(after.orderId || "").trim();
    const paymentKey = String(after.paymentKey || "").trim();
    const sourceTypeRaw = String(after.sourceType || "").trim();
    const sourceBulkPaymentId = String(after.sourceBulkPaymentId || "").trim();
    const allocationOrderRaw = after.allocationOrder;
    const allocationOrder =
      typeof allocationOrderRaw === "number" && Number.isFinite(allocationOrderRaw)
        ? allocationOrderRaw
        : Number.NaN;

    /** 분해 회차(서버가 `annual_prepaid_split` 기록) — cashBook 수입 없음 */
    if (sourceTypeRaw === "annual_prepaid_split") {
      logger.info("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_annual_prepaid_split",
        teamId,
        paymentId,
        feeId,
        userId,
      });
      return;
    }

    /** 레거시: 모두 `annual_prepaid`만 있는 데이터 — 2회차 이후는 스킵 */
    if (sourceTypeRaw === "annual_prepaid" && sourceBulkPaymentId.length > 0 && allocationOrder > 1) {
      logger.info("💳 payment_event", {
        phase: "fee_paid_cashbook",
        action: "trigger_skip_annual_prepaid_secondary_split_legacy",
        teamId,
        paymentId,
        feeId,
        userId,
        sourceBulkPaymentId,
        allocationOrder,
      });
      return;
    }

    /** 연납 bulk 입금 1건 — `annual_prepaid` + bulk id 인 첫 회차 문서만 */
    const isAnnualBulkPrimary =
      sourceTypeRaw === "annual_prepaid" && sourceBulkPaymentId.length > 0;
    if (isAnnualBulkPrimary) {
      const bulkAmt = Math.floor(
        Number(after.finalAmount ?? after.allocatedFromAmount ?? amount)
      );
      if (Number.isFinite(bulkAmt) && bulkAmt > 0) {
        amount = bulkAmt;
      }
    }

    /** payments.orderId(수동 납부 등)와 동일 키로 수동 납부·cashBook 로그 교차 검색 */
    const correlationId =
      orderId.length > 0 ? orderId : paymentKey.length > 0 ? `pk:${paymentKey}` : `${feeId}:${userId}`;

    let sourceRefId: string;
    let deterministicId: string;
    if (isAnnualBulkPrimary) {
      sourceRefId = `annual_prepaid:${teamId}:${sourceBulkPaymentId}`;
      deterministicId = cashBookDeterministicIdFromRef(sourceRefId);
    } else {
      sourceRefId =
        orderId.length > 0
          ? `feePayment:${teamId}:${feeId}:${userId}:${orderId}`
          : paymentKey.length > 0
            ? `feePayment:${teamId}:${feeId}:${userId}:pk:${paymentKey}`
            : `feePayment:${teamId}:${feeId}:${userId}:doc`;
      deterministicId = cashBookDeterministicIdFromRef(sourceRefId);
    }
    const paidAt = asTimestamp(after.paidAt);

    let counterpartyName: string | null = null;
    try {
      const mem = await getActiveTeamMemberDocSnap(teamId, userId);
      if (mem?.exists) {
        const m = mem.data() || {};
        counterpartyName =
          (typeof m.name === "string" && m.name.trim()) ||
          (typeof m.displayName === "string" && m.displayName.trim()) ||
          null;
      }
    } catch {
      /* ignore */
    }

    const feeTitle =
      feeSnap.exists && typeof feeData?.title === "string"
        ? String(feeData.title)
        : "팀 회비";

    try {
      const { skipped, feeIdPatched } = await createCashBookEntryWithSummary({
        teamId,
        deterministicId,
        kind: "income",
        category: "membership",
        amount,
        occurredAt: paidAt,
        memo: `${feeTitle} 자동 반영`,
        counterpartyUid: userId,
        counterpartyName,
        source: "membership",
        feeId,
        sourceRefId,
        sourceRefType: "feePayment",
        createdByUid: SYSTEM_UID,
      });
      logger.info("💳 payment_event", {
        level: skipped && !feeIdPatched ? "warn" : "info",
        phase: "fee_paid_cashbook",
        action: feeIdPatched
          ? "cashbook_entry_fee_id_patched"
          : skipped
            ? "cashbook_entry_idempotent_skip"
            : "cashbook_income_from_fee_payment",
        correlationId,
        orderId: orderId || undefined,
        teamId,
        feeId,
        userId,
        amount,
        deterministicId,
        skipped,
        feeIdPatched: feeIdPatched ?? false,
      });
    } catch (e) {
      logger.error("💳 payment_event", {
        level: "error",
        phase: "fee_paid_cashbook",
        action: "cashbook_income_failed",
        correlationId,
        orderId: orderId || undefined,
        teamId,
        feeId,
        userId,
        amount,
        error: String(e),
      });
    }
  }
);

/**
 * 트리거 이전에 이미 paid 인 결제건을 cashBook으로 1회 백필.
 * - 멱등: createCashBookEntryWithSummary(deterministicId)로 중복 방지
 * - 대상: teams/{teamId}/payments 납부 완료 건 (옵션 feeId 필터). indexed status=paid 가 0건이면 docId 스캔 폴백.
 */
export const backfillTeamFeeCashBookEntries = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 180 },
  async (request) => {
    try {
      logger.info("[backfillTeamFeeCashBookEntries] start", {
        teamId: request.data?.teamId,
        feeId: request.data?.feeId,
      });
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }
      const teamId = String(request.data?.teamId || "").trim();
      const feeIdFilter = String(request.data?.feeId || "").trim();
      if (!teamId) {
        throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
      }
      await assertHubTeamStaffForManualFee(teamId, request.auth.uid);

      const paymentsCol = db.collection("teams").doc(teamId).collection("payments");
      const snap = await paymentsCol.where("status", "==", "paid").limit(1000).get();

      let candidates: QueryDocumentSnapshot[];
      let fetchedCount: number;
      let queryMode: "indexed_paid" | "doc_scan";

      if (!snap.empty) {
        queryMode = "indexed_paid";
        fetchedCount = snap.size;
        candidates = snap.docs.filter((d) => {
          const data = d.data() as Record<string, unknown>;
          if (!isPaidLikeStatus(data)) return false;
          return matchesFeeIdFilter(d, feeIdFilter);
        });
      } else {
        queryMode = "doc_scan";
        logger.warn("[backfillTeamFeeCashBookEntries] indexed status=paid returned 0; scanning by documentId", {
          teamId,
          feeIdFilter: feeIdFilter || null,
        });
        const scan = await scanPaymentsForPaidLike(paymentsCol, feeIdFilter, 8000);
        candidates = scan.matched;
        fetchedCount = scan.docsRead;
      }

    logger.info("[backfillTeamFeeCashBookEntries] query", {
      teamId,
      feeIdFilter: feeIdFilter || null,
      fetched: fetchedCount,
      paidCandidates: candidates.length,
      queryMode,
    });

    if (candidates.length === 0) {
      return { scanned: 0, created: 0, skipped: 0, patched: 0, fetched: fetchedCount, rowErrors: 0 };
    }

    let created = 0;
    let skipped = 0;
    let patched = 0;
    let rowErrors = 0;
    for (const docSnap of candidates) {
      try {
        const p = docSnap.data() as Record<string, unknown>;
        const parsedId = parseTeamFeePaymentDocId(docSnap.id);
        let feeId = String(p.feeId || "").trim();
        let userId = String(p.userId || String(p.memberId || "")).trim();
        if (!feeId && parsedId) feeId = parsedId.feeId;
        if (!userId && parsedId) userId = parsedId.userId;
        if (feeIdFilter && docSnap.id.startsWith(`${feeIdFilter}_`)) {
          const fromDoc = parsePaymentDocUserIdWithKnownFeeId(docSnap.id, feeIdFilter);
          if (fromDoc) {
            userId = fromDoc;
            feeId = feeIdFilter;
          }
        } else if (feeId) {
          const fromDoc = parsePaymentDocUserIdWithKnownFeeId(docSnap.id, feeId);
          if (fromDoc) userId = fromDoc;
        }
        const amount = Math.floor(Number(p.amount || 0));
        if (!feeId || !userId || !Number.isFinite(amount) || amount <= 0) {
          skipped++;
          continue;
        }
        if (String(p.cashBookIncomeSource ?? "").trim() === "fee_payment_chunks") {
          skipped++;
          continue;
        }
        const orderId = String(p.orderId || "").trim();
        const paymentKey = String(p.paymentKey || "").trim();
        const sourceRefId =
          orderId.length > 0
            ? `feePayment:${teamId}:${feeId}:${userId}:${orderId}`
            : paymentKey.length > 0
              ? `feePayment:${teamId}:${feeId}:${userId}:pk:${paymentKey}`
              : `feePayment:${teamId}:${feeId}:${userId}:doc`;
        const deterministicId = cashBookDeterministicIdFromRef(sourceRefId);
        const paidAt = asTimestamp(p.paidAt);

        const memberSnap = await getActiveTeamMemberDocSnap(teamId, userId);
        const md = memberSnap?.exists ? memberSnap.data() || {} : {};
        const counterpartyName =
          (typeof md.name === "string" && md.name.trim()) ||
          (typeof md.displayName === "string" && md.displayName.trim()) ||
          null;

        const feeSnap = await db.doc(`teams/${teamId}/fees/${feeId}`).get();
        const feeTitle =
          feeSnap.exists && typeof (feeSnap.data() as Record<string, unknown>)?.title === "string"
            ? String((feeSnap.data() as Record<string, unknown>).title)
            : "팀 회비";

        const result = await createCashBookEntryWithSummary({
          teamId,
          deterministicId,
          kind: "income",
          category: "membership",
          amount,
          occurredAt: paidAt,
          memo: `${feeTitle} 백필 반영`,
          counterpartyUid: userId,
          counterpartyName,
          source: "membership",
          feeId,
          sourceRefId,
          sourceRefType: "feePayment",
          createdByUid: SYSTEM_UID,
        });
        if (result.feeIdPatched) patched++;
        else if (result.skipped) skipped++;
        else created++;
      } catch (rowErr) {
        rowErrors++;
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        logger.warn("[backfillTeamFeeCashBookEntries] row failed", {
          teamId,
          paymentDocId: docSnap.id,
          error: msg,
        });
      }
    }

      return {
        scanned: candidates.length,
        created,
        skipped,
        patched,
        fetched: fetchedCount,
        rowErrors,
      };
    } catch (e) {
      throw callableSafeError("backfillTeamFeeCashBookEntries", e);
    }
  }
);

/**
 * 기존 cashBook 문서 중 sourceRefId 는 있으나 feeId 가 비어 있거나 다른 경우 일괄 보정 (합계·요약 잔액은 변경하지 않음)
 */
export const repairTeamMembershipCashBookFeeIds = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 300 },
  async (request) => {
    try {
      logger.info("[repairTeamMembershipCashBookFeeIds] start", { teamId: request.data?.teamId });
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }
      const teamId = String(request.data?.teamId || "").trim();
      if (!teamId) {
        throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
      }
      await assertHubTeamStaffForManualFee(teamId, request.auth.uid);

      let lastDoc: QueryDocumentSnapshot | null = null;
    let totalScanned = 0;
    let totalPatched = 0;
    const pageSize = 400;

    while (true) {
      let q = db
        .collection(`teams/${teamId}/cashBook`)
        .orderBy(FieldPath.documentId())
        .limit(pageSize);
      if (lastDoc) q = q.startAfter(lastDoc);
      const page = await q.get();
      if (page.empty) break;

      let batch = db.batch();
      let ops = 0;
      const flush = async () => {
        if (ops === 0) return;
        await batch.commit();
        batch = db.batch();
        ops = 0;
      };

      for (const docSnap of page.docs) {
        totalScanned++;
        const d = docSnap.data() as Record<string, unknown>;
        if (d.kind !== "income") continue;
        if (d.category !== "membership") continue;
        if (d.isDeleted === true) continue;
        const sr = typeof d.sourceRefId === "string" ? d.sourceRefId.trim() : "";
        const parsed = parseFeeIdFromFeePaymentSourceRef(sr, teamId);
        if (!parsed) continue;
        const current = typeof d.feeId === "string" ? d.feeId.trim() : "";
        if (current === parsed) continue;

        batch.update(docSnap.ref, {
          feeId: parsed,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        ops++;
        totalPatched++;
        if (ops >= 450) await flush();
      }
      await flush();

      lastDoc = page.docs[page.docs.length - 1];
      if (page.size < pageSize) break;
    }

      logger.info("[repairTeamMembershipCashBookFeeIds] done", { teamId, totalScanned, totalPatched });
      return { scanned: totalScanned, patched: totalPatched };
    } catch (e) {
      throw callableSafeError("repairTeamMembershipCashBookFeeIds", e);
    }
  }
);
