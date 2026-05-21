/**
 * 협회 지출 영수증 이미지 → 구조화 JSON (고정 스키마, 카테고리 정규화)
 */

import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { getOpenAIClient, resolveOpenAIApiKey } from "../lib/openaiClient";
import {
  coerceExpenseCategoryKey,
  normalizeReceiptCategoryLabel,
  type ExpenseCategoryKey,
} from "./receiptCategoryNormalize";

const CATEGORY_LABEL_KO: Record<ExpenseCategoryKey, string> = {
  referee: "심판비",
  equipment: "장비·시설",
  event_cost: "행사·접대",
  transport: "교통·운반",
  uniform: "유니폼·용품",
  marketing: "홍보·인쇄",
  other: "기타",
};

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

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function normalizeMime(m: string | undefined): string {
  const t = String(m || "").trim().toLowerCase();
  if (t === "image/jpg") return "image/jpeg";
  if (ALLOWED_MIME.has(t)) return t;
  return "image/jpeg";
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type RequestData = {
  federationSlug?: string;
  storagePath?: string;
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
};

export type AnalyzeReceiptSuccess = {
  success: true;
  amount: number | null;
  date: string | null;
  merchant: string | null;
  /** 표시용 한글 라벨 (정규화된 카테고리명) */
  category: string;
  categoryKey: ExpenseCategoryKey;
  paymentMethod: "card" | "cash" | "bank_transfer" | "other";
  description: string | null;
  confidence: number;
  rawText: string;
};

export type AnalyzeReceiptFail = {
  success: false;
  error: string;
};

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

function coerceMerchant(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 200);
  return s || null;
}

function coercePaymentMethod(v: unknown): "card" | "cash" | "bank_transfer" | "other" {
  if (v === "card" || v === "cash" || v === "bank_transfer" || v === "other") return v;
  return "other";
}

function coerceConfidence01(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 1 && v <= 100) return Math.min(1, v / 100);
    return Math.min(1, Math.max(0, v));
  }
  return 0.5;
}

function coerceRawText(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, 1000);
}

function resolveCategoryKey(obj: Record<string, unknown>): ExpenseCategoryKey {
  const direct = coerceExpenseCategoryKey(obj.categoryKey);
  if (direct) return direct;
  const label =
    typeof obj.categoryLabel === "string"
      ? obj.categoryLabel
      : typeof obj.category === "string"
        ? obj.category
        : "";
  return normalizeReceiptCategoryLabel(label);
}

export async function handleAnalyzeFederationExpenseReceipt(req: {
  data: RequestData;
  auth?: { uid?: string };
}): Promise<AnalyzeReceiptSuccess | AnalyzeReceiptFail> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const federationSlug = String(req.data?.federationSlug || "").trim();
  if (!federationSlug) throw new HttpsError("invalid-argument", "federationSlug가 필요합니다.");

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationSlug}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  if (!isFederationManagerDoc(fedSnap.data() as Record<string, unknown> | undefined, uid)) {
    throw new HttpsError("permission-denied", "협회 매니저만 사용할 수 있습니다.");
  }

  const storagePath = String(req.data?.storagePath || "").trim();
  const imageUrl = String(req.data?.imageUrl || "").trim();
  const imageBase64 = String(req.data?.imageBase64 || "").trim();

  let mime = normalizeMime(req.data?.mimeType);
  let imageBase64ForModel = imageBase64;

  if (storagePath) {
    if (!storagePath.startsWith(`federations/${federationSlug}/expenseReceipts/`)) {
      throw new HttpsError("permission-denied", "허용되지 않은 영수증 경로입니다.");
    }
    try {
      const file = getStorage().bucket().file(storagePath);
      const [meta] = await file.getMetadata();
      mime = normalizeMime(meta.contentType || mime);
      const [buf] = await file.download();
      if (!buf || buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
        throw new HttpsError(
          "invalid-argument",
          `이미지는 1장당 최대 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB까지 업로드할 수 있습니다.`
        );
      }
      imageBase64ForModel = buf.toString("base64");
    } catch (e) {
      logger.error("[analyzeFederationExpenseReceipt] storagePath read failed", {
        federationSlug,
        storagePath,
        message: e instanceof Error ? e.message : String(e),
      });
      throw new HttpsError("failed-precondition", "Storage에서 영수증 이미지를 읽지 못했습니다.");
    }
  } else if (imageBase64ForModel) {
    let buf: Buffer;
    try {
      buf = Buffer.from(imageBase64ForModel, "base64");
    } catch {
      throw new HttpsError("invalid-argument", "이미지 데이터 형식이 올바르지 않습니다.");
    }
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
      throw new HttpsError(
        "invalid-argument",
        `이미지는 1장당 최대 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB까지 업로드할 수 있습니다.`
      );
    }
  } else if (imageUrl) {
    try {
      const resp = await fetch(imageUrl);
      if (!resp.ok) {
        throw new Error(`image fetch failed: ${resp.status}`);
      }
      const arr = await resp.arrayBuffer();
      const buf = Buffer.from(arr);
      if (!buf || buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
        throw new HttpsError(
          "invalid-argument",
          `이미지는 1장당 최대 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB까지 업로드할 수 있습니다.`
        );
      }
      imageBase64ForModel = buf.toString("base64");
    } catch (e) {
      logger.warn("[analyzeFederationExpenseReceipt] imageUrl fetch failed", {
        federationSlug,
        message: e instanceof Error ? e.message : String(e),
      });
      throw new HttpsError("invalid-argument", "영수증 이미지 URL을 읽지 못했습니다.");
    }
  } else {
    throw new HttpsError("invalid-argument", "영수증 이미지가 없습니다.");
  }

  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    return { success: false, error: "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다." };
  }

  const dataUrl = `data:${mime};base64,${imageBase64ForModel}`;

  const system = `You analyze receipt photos for a Korean amateur sports federation expense entry.
Output ONLY valid JSON (no markdown), with exactly these keys:
- isReceipt: boolean — true only if this clearly looks like a payment receipt, tax invoice, or card slip (not random photos).
- amount: integer KRW final paid total (결제금액/합계/카드승인), or null if unreadable
- date: single best payment/purchase date as YYYY-MM-DD, or null (pick ONE most likely transaction date)
- merchant: string payee/store name or null, max 120 chars
- categoryLabel: short Korean expense type guess (e.g. 심판비, 식비, 교통비, 장비, 행사비) — free text OK
- categoryKey: optional, one of referee,equipment,event_cost,transport,uniform,marketing,other — only if confident
- paymentMethod: one of card, cash, bank_transfer, other — guess from wording (카드/현금/계좌이체 등)
- description: one-line memo for accounting or null
- confidence: number from 0 to 1 (overall extraction confidence)
- rawText: string, key lines you read from the receipt (Korean), max ~2000 chars, for audit

Rules:
- Prefer 총액/결제금액/합계 over 공급가/부가세 단독 값.
- If not a receipt, set isReceipt false and use nulls/empty strings where needed.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 이미지가 영수증이면 필드를 채우고, 아니면 isReceipt만 false로 JSON을 반환해 주세요.",
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    if (!raw) {
      return { success: false, error: "영수증 텍스트를 충분히 인식하지 못했습니다." };
    }

    const obj = parseModelJson(raw);
    if (!obj) {
      logger.warn("[analyzeFederationExpenseReceipt] JSON parse failed", { preview: raw.slice(0, 200) });
      return { success: false, error: "영수증 형식의 이미지를 인식하지 못했습니다." };
    }

    if (obj.isReceipt === false) {
      return { success: false, error: "영수증 형식의 이미지를 인식하지 못했습니다." };
    }

    const categoryKey = resolveCategoryKey(obj);
    const category = CATEGORY_LABEL_KO[categoryKey];
    const amount = coerceAmount(obj.amount);
    const date = coerceDate(obj.date);
    const merchant = coerceMerchant(obj.merchant);
    const paymentMethod = coercePaymentMethod(obj.paymentMethod);
    let description: string | null =
      typeof obj.description === "string" && obj.description.trim() ? obj.description.trim().slice(0, 300) : null;
    if (!description && merchant) description = merchant.slice(0, 300);

    const rawText = coerceRawText(obj.rawText);
    let confidence = coerceConfidence01(obj.confidence);
    if (amount == null && date == null && !merchant) {
      confidence = Math.min(confidence, 0.35);
    }

    logger.info("[analyzeFederationExpenseReceipt] success", {
      federationSlug,
      categoryKey,
      hasAmount: amount != null,
      hasDate: date != null,
      confidence,
    });

    const out: AnalyzeReceiptSuccess = {
      success: true,
      amount,
      date,
      merchant,
      category,
      categoryKey,
      paymentMethod,
      description,
      confidence,
      rawText: rawText || "(추출 본문 없음)",
    };
    return out;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[analyzeFederationExpenseReceipt] openai error", { msg });
    return { success: false, error: msg || "영수증 분석에 실패했습니다." };
  }
}
