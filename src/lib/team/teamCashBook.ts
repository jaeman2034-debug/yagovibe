import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  limit,
  where,
  Timestamp,
  type Unsubscribe,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  TeamCashBookSummary,
  TeamCashBookTransaction,
  TeamCashBookSource,
  TeamCashBookSourceRefType,
  TeamCashCategory,
  TeamCashKind,
} from "@/types/teamAccounting";
import { normalizeTeamCashCategory } from "@/types/teamAccounting";

const CASH = "cashBook" as const;
const SUMMARY = "cashBookSummary" as const;

/** 화면 목록 구독 시 기본 건수 — `occurredAt` 최신순 일부만 로드하므로, 이 구간의 수입−지출 합은 누적 잔액과 다를 수 있음 */
export const TEAM_CASH_BOOK_UI_ROW_LIMIT = 220;

/** Firestore `cashBook` 문서 → UI 행 (실시간 구독·페이지 조회 공용) */
export function parseTeamCashBookDoc(id: string, data: Record<string, unknown>): TeamCashBookTransaction | null {
  return parseTx(id, data);
}

function parseTx(id: string, data: Record<string, unknown>): TeamCashBookTransaction | null {
  const kind = data.kind === "income" || data.kind === "expense" ? data.kind : null;
  if (!kind) return null;
  const rawCat = typeof data.category === "string" ? data.category : "";
  const category: TeamCashCategory = normalizeTeamCashCategory(kind, rawCat) ?? "etc";
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  let occurredAt = "";
  const oa = data.occurredAt;
  if (oa && typeof (oa as { toDate?: () => Date }).toDate === "function") {
    occurredAt = (oa as { toDate: () => Date }).toDate().toISOString();
  } else if (typeof oa === "string") occurredAt = oa;
  if (!occurredAt) return null;

  const src = data.source;
  const source: TeamCashBookSource =
    src === "membership" || src === "auto" || src === "manual" ? src : "manual";

  const srt = data.sourceRefType;
  const sourceRefType: TeamCashBookSourceRefType | null =
    srt === "feePayment" || srt === "manual" || srt === "eventSponsor" || srt === "feeRefund" ? srt : null;

  return {
    id,
    kind,
    category,
    amount,
    occurredAt,
    memo: data.memo != null ? String(data.memo) : null,
    counterpartyName: data.counterpartyName != null ? String(data.counterpartyName) : null,
    counterpartyUid: data.counterpartyUid != null ? String(data.counterpartyUid) : null,
    source,
    sourceRefId: data.sourceRefId != null ? String(data.sourceRefId) : null,
    sourceRefType,
    receipt:
      data.receipt && typeof data.receipt === "object"
        ? (() => {
            const r = data.receipt as Record<string, unknown>;
            const imageUrl = typeof r.imageUrl === "string" ? r.imageUrl : "";
            const uploadedByUid = typeof r.uploadedByUid === "string" ? r.uploadedByUid : "";
            let uploadedAt = "";
            if (r.uploadedAt && typeof (r.uploadedAt as { toDate?: () => Date }).toDate === "function") {
              uploadedAt = (r.uploadedAt as { toDate: () => Date }).toDate().toISOString();
            } else if (typeof r.uploadedAt === "string") {
              uploadedAt = r.uploadedAt;
            }
            if (!imageUrl || !uploadedByUid || !uploadedAt) return null;
            const ocrRaw = r.ocrRawText;
            const ocrRawText =
              ocrRaw != null && typeof ocrRaw === "string" && ocrRaw.length > 0
                ? ocrRaw.length > 2000
                  ? ocrRaw.slice(0, 2000)
                  : ocrRaw
                : undefined;
            return { imageUrl, uploadedByUid, uploadedAt, ...(ocrRawText ? { ocrRawText } : {}) };
          })()
        : null,
    isDeleted: data.isDeleted === true,
    voidReason: data.voidReason != null ? String(data.voidReason) : null,
    createdByUid: String(data.createdByUid ?? ""),
  };
}

export function subscribeTeamCashBookSummary(
  teamId: string,
  onData: (s: TeamCashBookSummary | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const ref = doc(db, "teams", teamId, SUMMARY, "default");
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data() as Record<string, unknown>;
      const balance = Number(d.balance ?? 0);
      let reconciledAt: string | undefined;
      const ra = d.reconciledAt;
      if (ra && typeof (ra as { toDate?: () => Date }).toDate === "function") {
        reconciledAt = (ra as { toDate: () => Date }).toDate().toISOString();
      }
      onData({
        balance: Number.isFinite(balance) ? balance : 0,
        reconciledAt,
        lastReconciledDelta:
          typeof d.lastReconciledDelta === "number" && Number.isFinite(d.lastReconciledDelta)
            ? d.lastReconciledDelta
            : undefined,
        lastReconciledTxCount:
          typeof d.lastReconciledTxCount === "number" && Number.isFinite(d.lastReconciledTxCount)
            ? d.lastReconciledTxCount
            : undefined,
      });
    },
    (e) => onError?.(e)
  );
}

export function subscribeTeamCashBookRows(
  teamId: string,
  onData: (rows: TeamCashBookTransaction[]) => void,
  onError?: (e: Error) => void,
  options?: { maxRows?: number }
): Unsubscribe {
  const maxRows = Math.min(800, Math.max(30, options?.maxRows ?? TEAM_CASH_BOOK_UI_ROW_LIMIT));
  const qy = query(collection(db, "teams", teamId, CASH), orderBy("occurredAt", "desc"), limit(maxRows));
  return onSnapshot(
    qy,
    (snap) => {
      const rows: TeamCashBookTransaction[] = [];
      snap.forEach((d) => {
        const row = parseTeamCashBookDoc(d.id, d.data() as Record<string, unknown>);
        if (row) rows.push(row);
      });
      onData(rows);
    },
    (e) => onError?.(e)
  );
}

export function subscribeTeamCashBookMonthSlice(
  teamId: string,
  range: { start: Date; end: Date },
  onData: (rows: TeamCashBookTransaction[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(
    collection(db, "teams", teamId, CASH),
    where("occurredAt", ">=", Timestamp.fromDate(range.start)),
    where("occurredAt", "<=", Timestamp.fromDate(range.end)),
    orderBy("occurredAt", "desc")
  );
  return onSnapshot(
    qy,
    (snap) => {
      const rows: TeamCashBookTransaction[] = [];
      snap.forEach((d) => {
        const row = parseTeamCashBookDoc(d.id, d.data() as Record<string, unknown>);
        if (row) rows.push(row);
      });
      onData(rows);
    },
    (e) => onError?.(e)
  );
}

/** `occurredAt` 최신순 페이지 (전체 원장 탐색용). */
export async function fetchCashBookPageDescending(
  teamId: string,
  pageSize: number,
  cursor?: QueryDocumentSnapshot | null
): Promise<{
  rows: TeamCashBookTransaction[];
  nextCursor: QueryDocumentSnapshot | null;
  hasMore: boolean;
}> {
  const tid = String(teamId || "").trim();
  if (!tid) {
    return { rows: [], nextCursor: null, hasMore: false };
  }
  const take = Math.min(100, Math.max(10, Math.floor(pageSize)));
  const col = collection(db, "teams", tid, CASH);
  const qy = cursor
    ? query(col, orderBy("occurredAt", "desc"), startAfter(cursor), limit(take + 1))
    : query(col, orderBy("occurredAt", "desc"), limit(take + 1));
  const snap = await getDocs(qy);
  const docs = snap.docs;
  const hasMore = docs.length > take;
  const slice = hasMore ? docs.slice(0, take) : docs;
  const rows: TeamCashBookTransaction[] = [];
  for (const d of slice) {
    const row = parseTeamCashBookDoc(d.id, d.data() as Record<string, unknown>);
    if (row) rows.push(row);
  }
  const nextCursor = hasMore && slice.length > 0 ? slice[slice.length - 1]! : null;
  return { rows, nextCursor, hasMore };
}

export type AddTeamCashBookInput = {
  kind: TeamCashKind;
  category: TeamCashCategory;
  amount: number;
  occurredAt: Date;
  memo?: string;
  counterpartyName?: string;
  counterpartyUid?: string;
  txId?: string;
  receipt?: {
    imageUrl: string;
    uploadedByUid: string;
    uploadedAt: Date;
    ocrRawText?: string;
  };
};

export function generateTeamCashBookTxId(teamId: string): string {
  return doc(collection(db, "teams", teamId, CASH)).id;
}

export async function addTeamCashBookTransaction(
  teamId: string,
  actorUid: string,
  input: AddTeamCashBookInput
): Promise<string> {
  const amt = Math.floor(Number(input.amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("금액이 올바르지 않습니다.");

  const summaryRef = doc(db, "teams", teamId, SUMMARY, "default");
  const delta = input.kind === "income" ? amt : -amt;
  const txId = input.txId?.trim() || generateTeamCashBookTxId(teamId);

  await runTransaction(db, async (transaction) => {
    const summarySnap = await transaction.get(summaryRef);
    const newTxRef = doc(db, "teams", teamId, CASH, txId);

    transaction.set(newTxRef, {
      kind: input.kind,
      category: input.category,
      amount: amt,
      occurredAt: input.occurredAt,
      memo: input.memo?.trim() || null,
      counterpartyName: input.counterpartyName?.trim() || null,
      counterpartyUid: input.counterpartyUid?.trim() || null,
      receipt: input.receipt
        ? {
            imageUrl: input.receipt.imageUrl,
            uploadedByUid: input.receipt.uploadedByUid,
            uploadedAt: input.receipt.uploadedAt,
            ...(typeof input.receipt.ocrRawText === "string" && input.receipt.ocrRawText.length > 0
              ? {
                  ocrRawText:
                    input.receipt.ocrRawText.length > 2000
                      ? input.receipt.ocrRawText.slice(0, 2000)
                      : input.receipt.ocrRawText,
                }
              : {}),
          }
        : null,
      source: "manual",
      isDeleted: false,
      createdByUid: actorUid,
      createdAt: serverTimestamp(),
    });

    if (!summarySnap.exists()) {
      transaction.set(summaryRef, {
        balance: delta,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.update(summaryRef, {
        balance: increment(delta),
        updatedAt: serverTimestamp(),
      });
    }
  });
  return txId;
}

/**
 * 소프트 삭제(무효) — 문서는 보존하고 잔액만 역반영 (감사 추적)
 */
export async function voidTeamCashBookTransaction(
  teamId: string,
  txId: string,
  actorUid: string,
  voidReason?: string
): Promise<void> {
  const txRef = doc(db, "teams", teamId, CASH, txId);
  const summaryRef = doc(db, "teams", teamId, SUMMARY, "default");

  await runTransaction(db, async (t) => {
    const txSnap = await t.get(txRef);
    if (!txSnap.exists()) throw new Error("거래를 찾을 수 없습니다.");
    const d = txSnap.data() as Record<string, unknown>;
    if (d.isDeleted === true) return;

    const kind = d.kind === "income" || d.kind === "expense" ? d.kind : null;
    const amount = Math.floor(Number(d.amount));
    if (!kind || !Number.isFinite(amount) || amount <= 0) throw new Error("유효하지 않은 거래입니다.");

    const reversal = kind === "income" ? -amount : amount;

    t.update(txRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedByUid: actorUid,
      voidReason: voidReason?.trim() ? voidReason.trim().slice(0, 500) : null,
    });

    const sumSnap = await t.get(summaryRef);
    if (sumSnap.exists()) {
      t.update(summaryRef, {
        balance: increment(reversal),
        updatedAt: serverTimestamp(),
      });
    }
  });
}
