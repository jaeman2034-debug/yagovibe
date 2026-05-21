/**
 * 입금 문자·메모 텍스트 → 구조화 + 미수 수입 원장 매칭 제안 (OpenAI + 규칙)
 * MVP: 텍스트만. CSV/이미지는 향후 확장.
 */

import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getOpenAIClient, resolveOpenAIApiKey } from "../lib/openaiClient";

const SOURCE_TYPES = new Set([
  "membership_fee",
  "competition_fee",
  "subsidy",
  "sponsorship",
  "registration_fee",
  "donation",
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

function parseModelJson(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : t;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function coerceAmount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === "string") {
    const n = Math.floor(Number(String(v).replace(/,/g, "")));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function coerceDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function coercePayer(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 200);
  return s || null;
}

function coerceConfidence(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 1 && v <= 100) return Math.min(1, v / 100);
    return Math.min(1, Math.max(0, v));
  }
  return 0.5;
}

function coerceSourceType(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return SOURCE_TYPES.has(s) ? s : null;
}

function normalizePayerKey(s?: string): string {
  let t = String(s || "").trim().toLowerCase();
  t = t.replace(/\s+/g, "");
  t = t.replace(/\(주\)|㈜|주식회사|\(유\)|유한회사/g, "");
  t = t.replace(/-/g, "");
  return t;
}

function nameSimilarity(aiName: string, rowName?: string): number {
  const a = normalizePayerKey(aiName);
  const b = normalizePayerKey(rowName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return 0.88;
  return 0.35;
}

function withinDays(isoA: string, isoB: string, days: number): boolean {
  const ta = new Date(isoA);
  const tb = new Date(isoB);
  if (Number.isNaN(ta.getTime()) || Number.isNaN(tb.getTime())) return false;
  return Math.abs(ta.getTime() - tb.getTime()) / 86400000 <= days;
}

function dateProximity(bankYmd: string, refIso: string): number {
  const b = `${bankYmd}T12:00:00.000Z`;
  if (withinDays(b, refIso, 1)) return 1;
  if (withinDays(b, refIso, 3)) return 0.55;
  return 0.2;
}

function refDateForIncome(data: Record<string, unknown>): string {
  const o = typeof data.occurredAt === "string" ? data.occurredAt : "";
  const e = typeof data.expectedAt === "string" ? data.expectedAt : "";
  return o || e || "";
}

type ReceivableRow = {
  id: string;
  amount: number;
  payerName?: string;
  refIso: string;
};

async function loadReceivableSameAmount(
  db: Firestore,
  federationSlug: string,
  amount: number
): Promise<ReceivableRow[]> {
  const col = db.collection("federations").doc(federationSlug).collection("transactions");
  const snap = await col.orderBy("occurredAt", "desc").limit(320).get();
  const out: ReceivableRow[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.type !== "income" || data.manualIncome !== true) continue;
    const st = data.incomeStatus;
    if (st !== "expected" && st !== "pending") continue;
    const amt = typeof data.amount === "number" ? Math.floor(data.amount) : 0;
    if (amt !== amount) continue;
    const refIso = refDateForIncome(data);
    if (!refIso) continue;
    out.push({
      id: d.id,
      amount: amt,
      payerName: typeof data.payerName === "string" ? data.payerName : undefined,
      refIso,
    });
  }
  return out;
}

export type BankMatchCandidate = {
  id: string;
  score: number;
  amount: number;
  payerName?: string;
  refDate: string;
};

export type AnalyzeBankTransactionSuccess = {
  ok: true;
  amount: number | null;
  payerName: string | null;
  date: string | null;
  confidence: number;
  suggestion: "match_existing" | "create_new" | "ambiguous" | "needs_review";
  matchedTransactionId?: string;
  suggestedSourceType?: string;
  matchCandidates?: BankMatchCandidate[];
  suggestedPaymentMethod?: string;
  bankAccountIdGuess?: string | null;
  aiNotes?: string | null;
};

export type AnalyzeBankTransactionFail = { ok: false; error: string };

export async function handleAnalyzeBankTransaction(req: {
  data: { federationSlug?: string; rawText?: string };
  auth?: { uid?: string };
}): Promise<AnalyzeBankTransactionSuccess | AnalyzeBankTransactionFail> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String(req.data?.federationSlug || "").trim();
  if (!federationSlug) return { ok: false, error: "federationSlug가 필요합니다." };

  const rawText = String(req.data?.rawText || "").trim().slice(0, 8000);
  if (!rawText) return { ok: false, error: "입금 내역 텍스트를 입력해 주세요." };

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    throw new HttpsError("permission-denied", "협회 매니저만 사용할 수 있습니다.");
  }

  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    return { ok: false, error: "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다." };
  }

  const system = `You extract bank deposit / transfer info from Korean SMS or pasted bank lines for an amateur sports federation.
Output ONLY valid JSON (no markdown), keys:
- amount: integer KRW deposited (입금액), or null
- payerName: remitter name or sender label (보낸이/입금자) or null if truly missing
- date: YYYY-MM-DD best guess of deposit date or null
- suggestedSourceType: one of membership_fee,competition_fee,subsidy,sponsorship,registration_fee,donation,other — best guess from wording
- suggestedPaymentMethod: one of bank_transfer,cash,card,other — bank SMS → usually bank_transfer
- bankAccountIdGuess: short internal label for account if text hints (e.g. "main","국민") or null
- confidence: 0..1 overall
- notes: short Korean audit note, max 300 chars

Rules:
- If amount unclear, set amount null and confidence low.
- Never invent a payerName; null if not in text.`;

  let obj: Record<string, unknown>;
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: rawText },
      ],
    });
    const txt = completion.choices[0]?.message?.content || "";
    const parsed = parseModelJson(txt);
    if (!parsed) {
      logger.warn("[analyzeBankTransaction] json parse fail", { federationSlug });
      return { ok: false, error: "AI 응답을 해석하지 못했습니다." };
    }
    obj = parsed;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[analyzeBankTransaction] openai error", { msg });
    return { ok: false, error: msg || "AI 분석에 실패했습니다." };
  }

  const amount = coerceAmount(obj.amount);
  const payerName = coercePayer(obj.payerName);
  const date = coerceDate(obj.date);
  const confidence = coerceConfidence(obj.confidence);
  const suggestedSourceType = coerceSourceType(obj.suggestedSourceType) || "other";
  let suggestedPaymentMethod = String(obj.suggestedPaymentMethod || "").trim();
  if (!PAYMENT_METHODS.has(suggestedPaymentMethod)) suggestedPaymentMethod = "bank_transfer";
  const bankAccountIdGuess =
    typeof obj.bankAccountIdGuess === "string" && obj.bankAccountIdGuess.trim()
      ? obj.bankAccountIdGuess.trim().slice(0, 120)
      : null;
  const aiNotes = typeof obj.notes === "string" ? obj.notes.trim().slice(0, 300) : null;

  if (!amount || confidence < 0.35) {
    return {
      ok: true,
      amount,
      payerName,
      date,
      confidence,
      suggestion: "needs_review",
      suggestedSourceType,
      suggestedPaymentMethod,
      bankAccountIdGuess,
      aiNotes,
    };
  }

  if (!payerName) {
    return {
      ok: true,
      amount,
      payerName: null,
      date,
      confidence,
      suggestion: "needs_review",
      suggestedSourceType,
      suggestedPaymentMethod,
      bankAccountIdGuess,
      aiNotes,
    };
  }

  const bankYmd = date || new Date().toISOString().slice(0, 10);
  const rows = await loadReceivableSameAmount(db, federationSlug, amount);
  if (rows.length === 0) {
    return {
      ok: true,
      amount,
      payerName,
      date,
      confidence,
      suggestion: "create_new",
      suggestedSourceType,
      suggestedPaymentMethod,
      bankAccountIdGuess,
      aiNotes,
    };
  }

  const scored: BankMatchCandidate[] = rows.map((r) => {
    const ns = nameSimilarity(payerName, r.payerName);
    const ds = dateProximity(bankYmd, r.refIso);
    const score = 0.75 * ns + 0.25 * ds;
    return {
      id: r.id,
      score,
      amount: r.amount,
      payerName: r.payerName,
      refDate: r.refIso.slice(0, 10),
    };
  });
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];

  if (!top || top.score < 0.52) {
    return {
      ok: true,
      amount,
      payerName,
      date,
      confidence,
      suggestion: "create_new",
      suggestedSourceType,
      suggestedPaymentMethod,
      bankAccountIdGuess,
      aiNotes,
    };
  }

  if (second && second.score >= 0.52 && top.score - second.score < 0.1) {
    return {
      ok: true,
      amount,
      payerName,
      date,
      confidence,
      suggestion: "ambiguous",
      matchCandidates: scored.slice(0, 5),
      suggestedSourceType,
      suggestedPaymentMethod,
      bankAccountIdGuess,
      aiNotes,
    };
  }

  if (top.score >= 0.72 && confidence >= 0.45) {
    return {
      ok: true,
      amount,
      payerName,
      date,
      confidence,
      suggestion: "match_existing",
      matchedTransactionId: top.id,
      suggestedSourceType,
      suggestedPaymentMethod,
      bankAccountIdGuess,
      aiNotes,
    };
  }

  return {
    ok: true,
    amount,
    payerName,
    date,
    confidence,
    suggestion: "ambiguous",
    matchCandidates: scored.slice(0, 5),
    suggestedSourceType,
    suggestedPaymentMethod,
    bankAccountIdGuess,
    aiNotes,
  };
}
