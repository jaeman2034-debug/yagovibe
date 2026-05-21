/**
 * 협회 매니저 전용 — 수동 수입 원장 생성 + 서버단 중복 검사
 */

import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const SOURCE_TYPES = new Set([
  "membership_fee",
  "competition_fee",
  "subsidy",
  "sponsorship",
  "registration_fee",
  "donation",
  "other",
]);

const INCOME_STATUS = new Set(["expected", "pending", "paid"]);
const PAYER_TYPES = new Set(["team", "individual", "sponsor", "organization"]);
const PAYMENT_METHODS = new Set(["card", "cash", "bank_transfer", "other"]);

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

function refDateForIncomeDup(data: Record<string, unknown>): string {
  const o = typeof data.occurredAt === "string" ? data.occurredAt : "";
  const e = typeof data.expectedAt === "string" ? data.expectedAt : "";
  return o || e || "";
}

async function findPotentialDuplicateIncomesServer(
  db: Firestore,
  federationSlug: string,
  params: { refIso: string; amount: number; payerName?: string }
): Promise<IncomeDupMatch[]> {
  const col = db.collection("federations").doc(federationSlug).collection("transactions");
  const snap = await col.orderBy("occurredAt", "desc").limit(220).get();
  const targetP = normalizePayerKey(params.payerName);
  const out: IncomeDupMatch[] = [];

  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.type !== "income" || data.manualIncome !== true) continue;
    const amount = typeof data.amount === "number" ? Math.floor(data.amount) : 0;
    if (amount !== params.amount) continue;

    const exRef = refDateForIncomeDup(data);
    if (!exRef || !params.refIso) continue;

    const exP = normalizePayerKey(typeof data.payerName === "string" ? data.payerName : "");
    const bothBlank = !targetP && !exP;
    if (bothBlank) {
      if (!sameCalendarDay(exRef, params.refIso)) continue;
    } else {
      if (!withinDays(exRef, params.refIso, 1)) continue;
      if (!payersLikelySame(targetP, exP)) continue;
    }

    const occurredAt = typeof data.occurredAt === "string" ? data.occurredAt : exRef;
    out.push({
      id: d.id,
      occurredAt,
      amount,
      payerName: typeof data.payerName === "string" ? data.payerName : undefined,
    });
  }

  return out;
}

export async function handleCreateFederationIncome(req: {
  data: {
    federationSlug?: string;
    skipDuplicateCheck?: boolean;
    income?: Record<string, unknown>;
  };
  auth?: { uid?: string };
}): Promise<
  | { ok: true; id: string }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: IncomeDupMatch[] }
  | { ok: false; code: "ERROR"; message: string }
> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String(req.data?.federationSlug || "").trim();
  if (!federationSlug) throw new HttpsError("invalid-argument", "federationSlug가 필요합니다.");

  const inc = req.data?.income;
  if (!inc || typeof inc !== "object") {
    return { ok: false, code: "ERROR", message: "income 데이터가 필요합니다." };
  }

  const amount = typeof inc.amount === "number" ? Math.floor(inc.amount) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: "ERROR", message: "금액이 올바르지 않습니다." };
  }

  const sourceType = String(inc.sourceType || "").trim();
  if (!SOURCE_TYPES.has(sourceType)) {
    return { ok: false, code: "ERROR", message: "지원하지 않는 수입 유형입니다." };
  }

  const status = String(inc.status || "").trim();
  if (!INCOME_STATUS.has(status)) {
    return { ok: false, code: "ERROR", message: "상태가 올바르지 않습니다." };
  }

  const occurredAtRaw = typeof inc.occurredAt === "string" ? inc.occurredAt.trim() : "";
  const expectedAtRaw = typeof inc.expectedAt === "string" ? inc.expectedAt.trim() : "";

  if (status === "paid" && !occurredAtRaw) {
    return { ok: false, code: "ERROR", message: "입금 완료 시 입금일(occurredAt)이 필요합니다." };
  }

  if (sourceType === "competition_fee") {
    const compId = typeof inc.competitionId === "string" ? inc.competitionId.trim() : "";
    if (!compId) {
      return { ok: false, code: "ERROR", message: "대회 참가비는 대회(competitionId) 연결이 필요합니다." };
    }
    const pt = String(inc.payerType || "").trim();
    if (pt !== "team") {
      return { ok: false, code: "ERROR", message: "대회 참가비는 납부자 유형이 팀(team)이어야 합니다." };
    }
  }

  const pmRaw = String(inc.paymentMethod || "").trim();
  if (!PAYMENT_METHODS.has(pmRaw)) {
    return { ok: false, code: "ERROR", message: "입금 경로(paymentMethod)가 필요합니다." };
  }

  const bankAccountIdRaw =
    typeof inc.bankAccountId === "string" && inc.bankAccountId.trim() ? inc.bankAccountId.trim().slice(0, 120) : "";

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    throw new HttpsError("permission-denied", "협회 매니저만 수입을 등록할 수 있습니다.");
  }

  const refIso = occurredAtRaw || expectedAtRaw;
  if (!refIso) {
    return { ok: false, code: "ERROR", message: "입금일 또는 예정일 중 하나는 필요합니다." };
  }

  const skipDuplicateCheck = req.data?.skipDuplicateCheck === true;
  if (!skipDuplicateCheck) {
    try {
      const dups = await findPotentialDuplicateIncomesServer(db, federationSlug, {
        refIso,
        amount,
        payerName: typeof inc.payerName === "string" ? inc.payerName : undefined,
      });
      if (dups.length > 0) {
        logger.info("[createFederationIncome] potential duplicate blocked", { federationSlug, count: dups.length });
        return { ok: false, code: "POTENTIAL_DUPLICATE", matches: dups };
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("[createFederationIncome] duplicate scan failed", { msg });
      throw new HttpsError("internal", "중복 검사 중 오류가 발생했습니다.");
    }
  }

  const occurredAtForDoc =
    status === "paid" ? occurredAtRaw : occurredAtRaw || expectedAtRaw || new Date().toISOString();

  const payload: Record<string, unknown> = {
    type: "income",
    domain: "program",
    ledgerDomain: sourceType === "subsidy" ? "restricted_fund" : "general",
    category: sourceType,
    amount,
    occurredAt: occurredAtForDoc,
    manualIncome: true,
    incomeSourceType: sourceType,
    incomeStatus: status,
    paymentMethod: pmRaw,
    createdByUid: uid,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (bankAccountIdRaw) payload.bankAccountId = bankAccountIdRaw;

  if (sourceType === "subsidy") {
    payload.isRestrictedFund = true;
    const fs = typeof inc.fundSource === "string" && inc.fundSource.trim() ? inc.fundSource.trim().slice(0, 400) : null;
    const fp = typeof inc.fundPurpose === "string" && inc.fundPurpose.trim() ? inc.fundPurpose.trim().slice(0, 400) : null;
    if (fs) payload.fundSource = fs;
    if (fp) payload.fundPurpose = fp;
    payload.reportRequired = inc.reportRequired === false ? false : true;
  }

  if (expectedAtRaw) payload.expectedAt = expectedAtRaw;

  const memo = typeof inc.description === "string" && inc.description.trim() ? inc.description.trim().slice(0, 2000) : null;
  payload.memo = memo;

  const pn = typeof inc.payerName === "string" && inc.payerName.trim() ? inc.payerName.trim().slice(0, 400) : null;
  if (pn) payload.payerName = pn;

  const pt = inc.payerType;
  if (typeof pt === "string" && PAYER_TYPES.has(pt)) payload.payerType = pt;

  const compId = typeof inc.competitionId === "string" && inc.competitionId.trim() ? inc.competitionId.trim() : null;
  if (compId) payload.competitionId = compId;

  try {
    const ref = await db.collection("federations").doc(federationSlug).collection("transactions").add(payload);
    logger.info("[createFederationIncome] created", { federationSlug, id: ref.id });
    return { ok: true, id: ref.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[createFederationIncome] add failed", { msg });
    return { ok: false, code: "ERROR", message: msg || "저장에 실패했습니다." };
  }
}
