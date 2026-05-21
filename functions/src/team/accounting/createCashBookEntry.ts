/**
 * 팀 cashBook + cashBookSummary 동시 반영 (Admin 전용)
 * - idempotent: deterministicId 지정 시 동일 문서가 이미 있으면 스킵(잔액 중복 반영 없음)
 */
import * as admin from "firebase-admin";
import type {
  DocumentReference,
  DocumentSnapshot,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import { createHash } from "crypto";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export type CashBookSource = "manual" | "membership" | "auto";
export type CashBookSourceRefType = "feePayment" | "manual" | "eventSponsor" | "feeRefund";

export type CreateCashBookEntryInput = {
  teamId: string;
  /** 지정 시 동일 키로 멱등 생성 (예: 회비 orderId 기반 해시) */
  deterministicId?: string;
  kind: "income" | "expense";
  category: string;
  amount: number;
  occurredAt: Timestamp;
  memo?: string | null;
  counterpartyUid?: string | null;
  counterpartyName?: string | null;
  source: CashBookSource;
  /** 회비 정합 조회용 (선택) */
  feeId?: string | null;
  sourceRefId?: string | null;
  sourceRefType?: CashBookSourceRefType | null;
  /** CF용 시스템 UID (클라이언트 규칙과 무관) */
  createdByUid: string;
};

/** Firestore 문서 ID로 안전한 짧은 키 */
export function cashBookDeterministicIdFromRef(sourceRefId: string): string {
  const h = createHash("sha256").update(sourceRefId).digest("hex").slice(0, 32);
  return `mship_${h}`;
}

/**
 * feePayment:{teamId}:{feeId}:{userId}:... 형식의 sourceRefId 에서 feeId 추출 (회비 정합 복구용)
 */
export function parseFeeIdFromFeePaymentSourceRef(sourceRefId: string, teamId: string): string | null {
  const tid = String(teamId || "").trim();
  const sr = String(sourceRefId || "").trim();
  if (!tid || !sr) return null;
  const prefix = `feePayment:${tid}:`;
  if (!sr.startsWith(prefix)) return null;
  const rest = sr.slice(prefix.length);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  const feeId = rest.slice(0, colon).trim();
  return feeId || null;
}

function validateCashBookEntryInput(input: CreateCashBookEntryInput): {
  amt: number;
  teamId: string;
  delta: number;
} {
  const amt = Math.floor(Number(input.amount));
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("createCashBookEntryWithSummary: invalid amount");
  }
  const teamId = String(input.teamId || "").trim();
  if (!teamId) throw new Error("createCashBookEntryWithSummary: missing teamId");
  const delta = input.kind === "income" ? amt : -amt;
  return { amt, teamId, delta };
}

/** deterministicId 해시 전 문자열 → Firestore 문서 ID 안전화 */
export function sanitizeCashBookDeterministicDocId(raw: string): string {
  const s = String(raw || "").replace(/[/\\]/g, "_").slice(0, 800);
  return s || "id";
}

/**
 * 동일 트랜잭션 안에서 다른 문서를 먼저 읽은 뒤 장부만 반영할 때 사용.
 * 호출 전에 `entryRef`·`summaryRef`에 대해 `transaction.get`으로 스냅샷을 받아 두고,
 * 모든 읽기를 쓰기보다 앞에 두어야 한다.
 */
export async function applyCashBookEntryWithSnapshots(
  t: Transaction,
  input: CreateCashBookEntryInput,
  entryRef: DocumentReference,
  summaryRef: DocumentReference,
  entrySnap: DocumentSnapshot,
  summarySnap: DocumentSnapshot
): Promise<{ id: string; skipped: boolean; feeIdPatched?: boolean }> {
  const { amt, teamId, delta } = validateCashBookEntryInput(input);

  const ref = entryRef;

  if (entrySnap.exists) {
    const existing = (entrySnap.data() || {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    const wantFee = String(input.feeId ?? "").trim();
    const haveFee = existing.feeId != null ? String(existing.feeId).trim() : "";
    if (wantFee && haveFee !== wantFee) {
      patch.feeId = wantFee;
    }

    const wantSr = String(input.sourceRefId ?? "").trim();
    const haveSr = existing.sourceRefId != null ? String(existing.sourceRefId).trim() : "";
    if (wantSr && !haveSr) {
      patch.sourceRefId = wantSr;
    }

    const wantSrt = input.sourceRefType != null ? String(input.sourceRefType).trim() : "";
    const haveSrt = existing.sourceRefType != null ? String(existing.sourceRefType).trim() : "";
    if (wantSrt && !haveSrt) {
      patch.sourceRefType = wantSrt;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      t.update(ref, patch);
      const feeIdPatched = "feeId" in patch;
      logger.info("[applyCashBookEntryWithSnapshots] patched existing", {
        teamId,
        id: ref.id,
        feeIdPatched,
        keys: Object.keys(patch),
      });
      return { id: ref.id, skipped: true, feeIdPatched };
    }

    logger.info("[applyCashBookEntryWithSnapshots] skip existing", { teamId, id: ref.id });
    return { id: ref.id, skipped: true };
  }

  t.set(ref, {
    kind: input.kind,
    category: input.category,
    amount: amt,
    occurredAt: input.occurredAt,
    memo: input.memo ?? null,
    counterpartyName: input.counterpartyName ?? null,
    counterpartyUid: input.counterpartyUid ?? null,
    source: input.source,
    feeId: input.feeId ?? null,
    sourceRefId: input.sourceRefId ?? null,
    sourceRefType: input.sourceRefType ?? null,
    isDeleted: false,
    createdByUid: input.createdByUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (!summarySnap.exists) {
    t.set(summaryRef, {
      balance: delta,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    t.set(
      summaryRef,
      {
        balance: admin.firestore.FieldValue.increment(delta),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  logger.info("[applyCashBookEntryWithSnapshots] created", {
    teamId,
    id: ref.id,
    kind: input.kind,
    amount: amt,
    source: input.source,
  });
  return { id: ref.id, skipped: false };
}

export async function createCashBookEntryWithSummary(
  input: CreateCashBookEntryInput
): Promise<{ id: string; skipped: boolean; feeIdPatched?: boolean }> {
  const { teamId } = validateCashBookEntryInput(input);

  const col = db.collection(`teams/${teamId}/cashBook`);
  const ref = input.deterministicId ? col.doc(sanitizeCashBookDeterministicDocId(input.deterministicId)) : col.doc();
  const summaryRef = db.doc(`teams/${teamId}/cashBookSummary/default`);

  return db.runTransaction(async (t) => {
    const cur = await t.get(ref);
    const sumSnap = await t.get(summaryRef);
    return applyCashBookEntryWithSnapshots(t, input, ref, summaryRef, cur, sumSnap);
  });
}

/**
 * `createCashBookEntryWithSummary`가 사용한 `deterministicId`(해시) 규칙과 동일 문서를 소프트 삭제하고 요약 잔액을 역반영.
 * 연납 bulk 수입(`annual_prepaid:${teamId}:${bulkId}`) 취소 등에 사용.
 */
export async function voidCashBookEntryIfExistsBySourceRef(input: {
  teamId: string;
  sourceRefId: string;
  voidedByUid: string;
  voidReason?: string;
}): Promise<{ voided: boolean; docId: string }> {
  const teamId = String(input.teamId || "").trim();
  const sourceRefId = String(input.sourceRefId || "").trim();
  const deterministicHash = cashBookDeterministicIdFromRef(sourceRefId);
  const docId = sanitizeCashBookDeterministicDocId(deterministicHash);

  if (!teamId || !sourceRefId || !input.voidedByUid) {
    return { voided: false, docId };
  }

  const ref = db.collection(`teams/${teamId}/cashBook`).doc(docId);
  const summaryRef = db.doc(`teams/${teamId}/cashBookSummary/default`);

  return db.runTransaction(async (t) => {
    const txSnap = await t.get(ref);
    if (!txSnap.exists) {
      logger.info("[voidCashBookEntryIfExistsBySourceRef] missing", { teamId, docId, sourceRefId });
      return { voided: false, docId };
    }

    const d = txSnap.data() as Record<string, unknown>;
    if (d.isDeleted === true) {
      logger.info("[voidCashBookEntryIfExistsBySourceRef] already_void", { teamId, docId });
      return { voided: false, docId };
    }

    const kind = d.kind === "income" || d.kind === "expense" ? d.kind : null;
    const amount = Math.floor(Number(d.amount));
    if (!kind || !Number.isFinite(amount) || amount <= 0) {
      logger.warn("[voidCashBookEntryIfExistsBySourceRef] invalid_row", { teamId, docId, kind, amount });
      return { voided: false, docId };
    }

    const reversal = kind === "income" ? -amount : amount;
    const reason = String(input.voidReason || "").trim().slice(0, 500) || "void";

    t.update(ref, {
      isDeleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedByUid: input.voidedByUid,
      voidReason: reason,
    });

    const sumSnap = await t.get(summaryRef);
    if (sumSnap.exists) {
      t.set(
        summaryRef,
        {
          balance: admin.firestore.FieldValue.increment(reversal),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    logger.info("[voidCashBookEntryIfExistsBySourceRef] ok", {
      teamId,
      docId,
      sourceRefId,
      kind,
      amount,
      reversal,
    });
    return { voided: true, docId };
  });
}
