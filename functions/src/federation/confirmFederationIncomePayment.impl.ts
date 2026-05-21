/**
 * 협회 매니저 전용 — 수동 수입 expected/pending → paid 전환 + 입금일 설정 (서버만 update)
 */

import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

function isFederationManagerDoc(doc: Record<string, unknown> | undefined, uid: string): boolean {
  if (!doc || !uid) return false;
  const ownerUid = String(doc.ownerUid || doc.ownerId || "");
  if (ownerUid && ownerUid === uid) return true;
  const adminIds = Array.isArray(doc.adminIds) ? doc.adminIds : [];
  const adminUids = Array.isArray(doc.adminUids) ? doc.adminUids : [];
  const roles = doc.roles as Record<string, unknown> | undefined;
  const roleAdmins = Array.isArray(roles?.admins) ? (roles.admins as unknown[]) : [];
  const roleEditors = Array.isArray(roles?.editors) ? (roles.editors as unknown[]) : [];
  return [...adminIds, ...adminUids, ...roleAdmins, ...roleEditors].includes(uid);
}

function normalizePayerKey(s?: string): string {
  let t = String(s || "").trim().toLowerCase();
  t = t.replace(/\s+/g, "");
  t = t.replace(/\(주\)|㈜|주식회사|\(유\)|유한회사/g, "");
  t = t.replace(/-/g, "");
  return t;
}

function payersLikelySame(a: string, b: string): boolean {
  if (!a && !b) return true;
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

function sameCalendarDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

function withinDays(isoTx: string, isoTarget: string, days: number): boolean {
  const tx = new Date(isoTx);
  const t = new Date(isoTarget);
  if (Number.isNaN(tx.getTime()) || Number.isNaN(t.getTime())) return false;
  const diff = Math.abs(tx.getTime() - t.getTime()) / 86400000;
  return diff <= days;
}

type IncomeDupMatch = { id: string; occurredAt: string; amount: number; payerName?: string };

async function findPaidManualIncomeDuplicates(
  db: Firestore,
  federationSlug: string,
  params: { excludeId: string; refIso: string; amount: number; payerName?: string }
): Promise<IncomeDupMatch[]> {
  const col = db.collection("federations").doc(federationSlug).collection("transactions");
  const snap = await col.orderBy("occurredAt", "desc").limit(220).get();
  const targetP = normalizePayerKey(params.payerName);
  const out: IncomeDupMatch[] = [];

  for (const d of snap.docs) {
    if (d.id === params.excludeId) continue;
    const data = d.data() as Record<string, unknown>;
    if (data.type !== "income" || data.manualIncome !== true) continue;
    if (data.incomeStatus !== "paid") continue;

    const amount = typeof data.amount === "number" ? Math.floor(data.amount) : 0;
    if (amount !== params.amount) continue;

    const occurredAt = typeof data.occurredAt === "string" ? data.occurredAt : "";
    if (!occurredAt || !params.refIso) continue;

    const exP = normalizePayerKey(typeof data.payerName === "string" ? data.payerName : "");
    const bothBlank = !targetP && !exP;
    if (bothBlank) {
      if (!sameCalendarDay(occurredAt, params.refIso)) continue;
    } else {
      if (!withinDays(occurredAt, params.refIso, 1)) continue;
      if (!payersLikelySame(targetP, exP)) continue;
    }

    out.push({
      id: d.id,
      occurredAt,
      amount,
      payerName: typeof data.payerName === "string" ? data.payerName : undefined,
    });
  }

  return out;
}

const PAYMENT_METHODS = new Set(["card", "cash", "bank_transfer", "other"]);

export async function handleConfirmFederationIncomePayment(req: {
  data: {
    federationSlug?: string;
    transactionId?: string;
    occurredAt?: string;
    skipDuplicateCheck?: boolean;
    paymentMethod?: string;
    bankAccountId?: string;
  };
  auth?: { uid?: string };
}): Promise<
  | { ok: true }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: IncomeDupMatch[] }
  | { ok: false; code: "ERROR"; message: string }
> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String(req.data?.federationSlug || "").trim();
  const transactionId = String(req.data?.transactionId || "").trim();
  const occurredAt = String(req.data?.occurredAt || "").trim();

  if (!federationSlug) return { ok: false, code: "ERROR", message: "federationSlug가 필요합니다." };
  if (!transactionId) return { ok: false, code: "ERROR", message: "transactionId가 필요합니다." };
  if (!occurredAt) return { ok: false, code: "ERROR", message: "입금일(occurredAt)이 필요합니다." };

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    throw new HttpsError("permission-denied", "협회 매니저만 입금 확인할 수 있습니다.");
  }

  const txRef = db.collection("federations").doc(federationSlug).collection("transactions").doc(transactionId);
  const txSnap = await txRef.get();
  if (!txSnap.exists) return { ok: false, code: "ERROR", message: "원장을 찾을 수 없습니다." };

  const data = txSnap.data() as Record<string, unknown>;
  if (data.type !== "income" || data.manualIncome !== true) {
    return { ok: false, code: "ERROR", message: "수동 수입 원장만 입금 확인할 수 있습니다." };
  }
  const st = data.incomeStatus;
  if (st !== "expected" && st !== "pending") {
    return { ok: false, code: "ERROR", message: "예정·입금 대기 상태만 입금 확인할 수 있습니다." };
  }

  const amount = typeof data.amount === "number" ? Math.floor(data.amount) : 0;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: "ERROR", message: "원장 금액이 올바르지 않습니다." };
  }

  const skipDuplicateCheck = req.data?.skipDuplicateCheck === true;
  if (!skipDuplicateCheck) {
    try {
      const dups = await findPaidManualIncomeDuplicates(db, federationSlug, {
        excludeId: transactionId,
        refIso: occurredAt,
        amount,
        payerName: typeof data.payerName === "string" ? data.payerName : undefined,
      });
      if (dups.length > 0) {
        logger.info("[confirmFederationIncomePayment] potential duplicate blocked", {
          federationSlug,
          transactionId,
          count: dups.length,
        });
        return { ok: false, code: "POTENTIAL_DUPLICATE", matches: dups };
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("[confirmFederationIncomePayment] duplicate scan failed", { msg });
      throw new HttpsError("internal", "중복 검사 중 오류가 발생했습니다.");
    }
  }

  const pmIn = String(req.data?.paymentMethod || "").trim();
  const bankIn =
    typeof req.data?.bankAccountId === "string" && req.data.bankAccountId.trim()
      ? req.data.bankAccountId.trim().slice(0, 120)
      : "";

  try {
    const updatePayload: Record<string, unknown> = {
      incomeStatus: "paid",
      occurredAt,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (pmIn && PAYMENT_METHODS.has(pmIn)) updatePayload.paymentMethod = pmIn;
    if (bankIn) updatePayload.bankAccountId = bankIn;

    await txRef.update(updatePayload);
    logger.info("[confirmFederationIncomePayment] updated", { federationSlug, transactionId });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[confirmFederationIncomePayment] update failed", { msg });
    return { ok: false, code: "ERROR", message: msg || "저장에 실패했습니다." };
  }
}
