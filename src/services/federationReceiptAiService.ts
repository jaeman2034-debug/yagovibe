/**
 * 협회 지출 영수증 분석 — Callable analyzeFederationExpenseReceipt (고정 JSON 스키마)
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { FederationExpenseCategory, FederationExpensePaymentMethod } from "@/types/federationOperating";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type AnalyzeExpenseReceiptSuccess = {
  success: true;
  amount: number | null;
  date: string | null;
  merchant: string | null;
  category: string;
  categoryKey: FederationExpenseCategory;
  paymentMethod: FederationExpensePaymentMethod;
  description: string | null;
  confidence: number;
  rawText: string;
};

export type AnalyzeExpenseReceiptResult = AnalyzeExpenseReceiptSuccess | { success: false; error: string };

function readFileAsBase64Parts(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error(`이미지는 ${MAX_FILE_BYTES / (1024 * 1024)}MB 이하로 선택해 주세요.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("파일을 읽지 못했습니다."));
        return;
      }
      const m = r.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        reject(new Error("이미지 형식을 인식하지 못했습니다."));
        return;
      }
      resolve({ mimeType: m[1], base64: m[2] });
    };
    reader.onerror = () => reject(new Error("파일 읽기에 실패했습니다."));
    reader.readAsDataURL(file);
  });
}

const CATEGORY_KEYS = new Set<string>([
  "referee",
  "equipment",
  "event_cost",
  "transport",
  "uniform",
  "marketing",
  "other",
]);

function coerceCategoryKey(v: unknown): FederationExpenseCategory {
  if (typeof v === "string" && CATEGORY_KEYS.has(v)) return v as FederationExpenseCategory;
  return "other";
}

export async function analyzeFederationExpenseReceiptImage(
  params: {
    federationSlug: string;
    storagePath?: string;
    imageUrl?: string;
    /** storagePath 업로드 실패 시 레거시 fallback */
    file?: File;
  }
): Promise<AnalyzeExpenseReceiptResult> {
  let base64: string | undefined;
  let mimeType: string | undefined;
  if (!params.storagePath && params.file) {
    const legacy = await readFileAsBase64Parts(params.file);
    base64 = legacy.base64;
    mimeType = legacy.mimeType;
  }

  const fn = httpsCallable<
    { federationSlug: string; storagePath?: string; imageUrl?: string; imageBase64?: string; mimeType?: string },
    Record<string, unknown>
  >(functions, "analyzeFederationExpenseReceipt");

  const res = await fn({
    federationSlug: params.federationSlug,
    storagePath: params.storagePath,
    imageUrl: params.imageUrl,
    imageBase64: base64,
    mimeType,
  });
  const d = res.data;

  if (d?.success === false) {
    return { success: false, error: String(d.error || "영수증 분석에 실패했습니다.") };
  }

  if (d?.success !== true) {
    return { success: false, error: String(d.error || "영수증 분석에 실패했습니다.") };
  }

  const confidence =
    typeof d.confidence === "number" && Number.isFinite(d.confidence)
      ? Math.min(1, Math.max(0, d.confidence))
      : 0.5;

  const paymentMethod: FederationExpensePaymentMethod =
    d.paymentMethod === "card" ||
    d.paymentMethod === "cash" ||
    d.paymentMethod === "bank_transfer" ||
    d.paymentMethod === "other"
      ? d.paymentMethod
      : "other";

  return {
    success: true,
    amount: typeof d.amount === "number" && Number.isFinite(d.amount) ? Math.floor(d.amount) : null,
    date: typeof d.date === "string" ? d.date : null,
    merchant: typeof d.merchant === "string" ? d.merchant : null,
    category: typeof d.category === "string" ? d.category : "기타",
    categoryKey: coerceCategoryKey(d.categoryKey),
    paymentMethod,
    description: typeof d.description === "string" ? d.description : null,
    confidence,
    rawText: typeof d.rawText === "string" ? d.rawText.slice(0, 1000) : "",
  };
}
