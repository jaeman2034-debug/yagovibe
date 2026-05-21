/**
 * 협회 매니저 전용 — 수동 지출 원장 생성 + 서버단 중복 1차 방어
 * (클라이언트 직접 addDoc 차단 시 Admin SDK만 쓰기)
 */

import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const EXPENSE_CATEGORIES = new Set([
  "referee",
  "equipment",
  "event_cost",
  "transport",
  "uniform",
  "marketing",
  "other",
]);

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

function normalizeMerchantKey(s?: string): string {
  let t = String(s || "").trim().toLowerCase();
  t = t.replace(/\s+/g, "");
  t = t.replace(/\(주\)|㈜|주식회사|\(유\)|유한회사/g, "");
  t = t.replace(/점|지점/g, "");
  t = t.replace(/-/g, "");
  return t;
}

function merchantsLikelySame(a: string, b: string): boolean {
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

type DupMatch = { id: string; occurredAt: string; amount: number; merchantName?: string };

async function findPotentialDuplicateExpensesServer(
  db: Firestore,
  federationSlug: string,
  params: { occurredAtIso: string; amount: number; merchantName?: string }
): Promise<DupMatch[]> {
  const col = db.collection("federations").doc(federationSlug).collection("transactions");
  const snap = await col.orderBy("occurredAt", "desc").limit(220).get();
  const targetMerchant = normalizeMerchantKey(params.merchantName);
  const out: DupMatch[] = [];

  for (const d of snap.docs) {
    const data = d.data();
    if (data.type !== "expense") continue;
    const amount = typeof data.amount === "number" ? Math.floor(data.amount) : 0;
    if (amount !== params.amount) continue;
    const occurredAt = typeof data.occurredAt === "string" ? data.occurredAt : "";
    if (!occurredAt) continue;

    const exM = normalizeMerchantKey(typeof data.merchantName === "string" ? data.merchantName : "");
    const bothBlank = !targetMerchant && !exM;
    if (bothBlank) {
      if (!sameCalendarDay(occurredAt, params.occurredAtIso)) continue;
    } else {
      if (!withinDays(occurredAt, params.occurredAtIso, 1)) continue;
      if (!merchantsLikelySame(targetMerchant, exM)) continue;
    }

    out.push({
      id: d.id,
      occurredAt,
      amount,
      merchantName: typeof data.merchantName === "string" ? data.merchantName : undefined,
    });
  }

  return out;
}

function normalizeOperatingDomain(d: unknown): "program" | "event" | "league" {
  if (d === "event" || d === "league") return d;
  return "program";
}

export async function handleCreateFederationExpense(req: {
  data: {
    federationSlug?: string;
    skipDuplicateCheck?: boolean;
    expense?: Record<string, unknown>;
  };
  auth?: { uid?: string };
}): Promise<
  | { ok: true; id: string }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: DupMatch[] }
  | { ok: false; error: string }
> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String(req.data?.federationSlug || "").trim();
  if (!federationSlug) throw new HttpsError("invalid-argument", "federationSlug가 필요합니다.");

  const exp = req.data?.expense;
  if (!exp || typeof exp !== "object") throw new HttpsError("invalid-argument", "expense 데이터가 필요합니다.");

  const amount = typeof exp.amount === "number" ? Math.floor(exp.amount) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError("invalid-argument", "금액이 올바르지 않습니다.");
  }

  const occurredAt = String(exp.occurredAt || "").trim();
  if (!occurredAt) throw new HttpsError("invalid-argument", "occurredAt가 필요합니다.");

  const category = String(exp.category || "").trim();
  if (!EXPENSE_CATEGORIES.has(category)) {
    throw new HttpsError("invalid-argument", "지원하지 않는 지출 카테고리입니다.");
  }

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    throw new HttpsError("permission-denied", "협회 매니저만 지출을 등록할 수 있습니다.");
  }

  const compId = typeof exp.competitionId === "string" ? exp.competitionId.trim() : "";
  const domain = compId ? "competition" : normalizeOperatingDomain(exp.operatingDomain);

  const skipDuplicateCheck = req.data?.skipDuplicateCheck === true;
  if (!skipDuplicateCheck) {
    try {
      const dups = await findPotentialDuplicateExpensesServer(db, federationSlug, {
        occurredAtIso: occurredAt,
        amount,
        merchantName: typeof exp.merchantName === "string" ? exp.merchantName : undefined,
      });
      if (dups.length > 0) {
        logger.info("[createFederationExpense] potential duplicate blocked", {
          federationSlug,
          count: dups.length,
        });
        return { ok: false, code: "POTENTIAL_DUPLICATE", matches: dups };
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("[createFederationExpense] duplicate scan failed", { msg });
      throw new HttpsError("internal", "중복 검사 중 오류가 발생했습니다.");
    }
  }

  const restrictedTrack =
    exp.restrictedFund === true || exp.ledgerDomain === "restricted_fund";

  const linkIncomeIdRaw =
    typeof exp.relatedFundIncomeId === "string" ? exp.relatedFundIncomeId.trim().slice(0, 120) : "";
  if (linkIncomeIdRaw && !restrictedTrack) {
    throw new HttpsError(
      "invalid-argument",
      "지원금 수입 연결(relatedFundIncomeId)은 관 지원금(한정) 집행으로 표시된 지출에만 사용할 수 있습니다."
    );
  }

  if (linkIncomeIdRaw) {
    const incRef = db.doc(`federations/${federationSlug}/transactions/${linkIncomeIdRaw}`);
    const incSnap = await incRef.get();
    if (!incSnap.exists) {
      throw new HttpsError("invalid-argument", "연결할 지원금 수입 원장을 찾을 수 없습니다.");
    }
    const inc = incSnap.data() as Record<string, unknown>;
    if (inc.type !== "income" || inc.manualIncome !== true) {
      throw new HttpsError("invalid-argument", "연결 대상은 수동 수입 원장만 가능합니다.");
    }
    if (String(inc.incomeSourceType || "") !== "subsidy") {
      throw new HttpsError("invalid-argument", "연결 대상은 관 지원금(subsidy) 수입이어야 합니다.");
    }
    if (String(inc.incomeStatus || "") !== "paid") {
      throw new HttpsError("invalid-argument", "연결할 지원금 수입은 입금 완료(paid) 상태여야 합니다.");
    }
    if (String(inc.ledgerDomain || "") !== "restricted_fund") {
      throw new HttpsError("invalid-argument", "연결 대상 수입의 회계 트랙이 지원금(restricted_fund)이 아닙니다.");
    }
  }

  const payload: Record<string, unknown> = {
    type: "expense",
    domain,
    ledgerDomain: restrictedTrack ? "restricted_fund" : "general",
    category,
    amount,
    occurredAt,
    memo: typeof exp.memo === "string" && exp.memo.trim() ? exp.memo.trim() : null,
    createdByUid: uid,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (compId) payload.competitionId = compId;

  const pm = exp.paymentMethod;
  if (typeof pm === "string" && PAYMENT_METHODS.has(pm)) payload.paymentMethod = pm;

  if (typeof exp.merchantName === "string" && exp.merchantName.trim()) {
    payload.merchantName = exp.merchantName.trim().slice(0, 400);
  }
  if (typeof exp.receiptImageUrl === "string" && exp.receiptImageUrl.trim()) {
    payload.receiptImageUrl = exp.receiptImageUrl.trim().slice(0, 2048);
  }
  if (typeof exp.receiptRawText === "string" && exp.receiptRawText.trim()) {
    payload.receiptRawText = exp.receiptRawText.trim().slice(0, 25000);
  }
  if (typeof exp.receiptConfidence === "number" && Number.isFinite(exp.receiptConfidence)) {
    payload.receiptConfidence = Math.min(1, Math.max(0, exp.receiptConfidence));
  }
  if (typeof exp.receiptAnalyzed === "boolean") payload.receiptAnalyzed = exp.receiptAnalyzed;
  const src = exp.source;
  if (src === "manual" || src === "receipt_ai") payload.source = src;

  if (restrictedTrack) {
    payload.restrictedFund = true;
    const rfs =
      typeof exp.relatedFundSource === "string" && exp.relatedFundSource.trim()
        ? exp.relatedFundSource.trim().slice(0, 400)
        : "";
    if (rfs) payload.relatedFundSource = rfs;
    const fp =
      typeof exp.fundPurpose === "string" && exp.fundPurpose.trim()
        ? exp.fundPurpose.trim().slice(0, 400)
        : "";
    if (fp) payload.fundPurpose = fp;
    if (linkIncomeIdRaw) payload.relatedFundIncomeId = linkIncomeIdRaw;
  }

  try {
    const ref = await db.collection("federations").doc(federationSlug).collection("transactions").add(payload);
    logger.info("[createFederationExpense] created", { federationSlug, id: ref.id });
    return { ok: true, id: ref.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[createFederationExpense] add failed", { msg });
    return { ok: false, error: msg || "저장에 실패했습니다." };
  }
}
