import type { VenuePaymentOcrResult } from "@/lib/federation/venuePaymentReceiptTypes";

const BANK_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /국민(?:은행)?/i, name: "국민은행" },
  { re: /신한(?:은행)?/i, name: "신한은행" },
  { re: /우리(?:은행)?/i, name: "우리은행" },
  { re: /하나(?:은행)?/i, name: "하나은행" },
  { re: /농협|NH/i, name: "농협" },
  { re: /기업(?:은행)?|IBK/i, name: "기업은행" },
  { re: /카카오뱅크/i, name: "카카오뱅크" },
  { re: /토스뱅크/i, name: "토스뱅크" },
  { re: /케이뱅크|K뱅크/i, name: "케이뱅크" },
  { re: /SC제일|제일은행/i, name: "SC제일은행" },
  { re: /우체국/i, name: "우체국" },
];

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,，\s원]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function extractAmount(text: string): number | null {
  const labeled = [
    /(?:입금(?:금액)?|이체금액|거래금액|송금금액|금액)\s*[:：]?\s*([0-9,，]+)\s*원?/i,
    /([0-9,，]+)\s*원/,
  ];
  for (const re of labeled) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const n = parseAmount(m[1]);
    if (n != null && n >= 1000) return n;
  }
  return null;
}

function extractDepositedAt(text: string): string | null {
  const patterns = [
    /(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})일?(?:\s*[(\uFF08][가-힣A-Za-z]+[)\uFF09])?\s+(\d{1,2})[:：](\d{2})(?:[:：](\d{2}))?/,
    /(\d{4})(\d{2})(\d{2})\s+(\d{2})[:：](\d{2})(?:[:：](\d{2}))?/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const y = m[1];
    const mo = m[2].padStart(2, "0");
    const d = m[3].padStart(2, "0");
    const hh = m[4].padStart(2, "0");
    const mm = m[5].padStart(2, "0");
    const ss = (m[6] || "00").padStart(2, "0");
    return `${y}-${mo}-${d}T${hh}:${mm}:${ss}`;
  }
  return null;
}

function extractSender(text: string): string | null {
  const patterns = [
    /(?:송금인|입금자|이체한\s*분|보낸\s*분|출금계좌명|예금주)\s*[:：]?\s*([가-힣A-Za-z0-9*]{2,20})/,
    /(?:입금자명)\s*[:：]?\s*([가-힣A-Za-z0-9*]{2,20})/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractTransactionId(text: string): string | null {
  const patterns = [
    /(?:거래번호|승인번호|전표번호|거래\s*ID|참조번호)\s*[:：]?\s*([A-Za-z0-9-]{6,32})/i,
    /(?:No\.?|번호)\s*[:：]?\s*([0-9]{8,20})/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractBank(text: string): string | null {
  for (const { re, name } of BANK_PATTERNS) {
    if (re.test(text)) return name;
  }
  return null;
}

function extractReservationCodeHint(text: string): string | null {
  const m = text.match(/\b(NW-[0-9A-Z]{2,4}-[0-9A-Z]{3,8}|YG-\d{8}-\d{3,})\b/i);
  return m?.[1] ? m[1].toUpperCase() : null;
}

/** Parse bank-slip OCR text into structured fields (best-effort MVP). */
export function parseVenuePaymentOcrText(rawText: string): VenuePaymentOcrResult {
  const text = String(rawText || "").trim();
  return {
    bankName: extractBank(text),
    amount: extractAmount(text),
    depositedAt: extractDepositedAt(text),
    senderName: extractSender(text),
    transactionId: extractTransactionId(text),
    rawText: text,
    reservationCodeHint: extractReservationCodeHint(text),
  };
}
