/**
 * 영수증/LLM이 돌려준 한글·영문 표현 → 원장 category 키 정규화
 */

export const EXPENSE_CATEGORY_KEYS = [
  "referee",
  "equipment",
  "event_cost",
  "transport",
  "uniform",
  "marketing",
  "other",
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_KEYS)[number];

/** 키가 이미 오면 그대로 */
export function coerceExpenseCategoryKey(v: unknown): ExpenseCategoryKey | null {
  if (typeof v !== "string") return null;
  const k = v.trim().toLowerCase();
  return (EXPENSE_CATEGORY_KEYS as readonly string[]).includes(k) ? (k as ExpenseCategoryKey) : null;
}

/**
 * 한글/영문 라벨·잡문구 → 키 (긴 구문부터 매칭)
 */
const LABEL_RULES: { needle: string; key: ExpenseCategoryKey }[] = [
  { needle: "referee fee", key: "referee" },
  { needle: "referee", key: "referee" },
  { needle: "심판비", key: "referee" },
  { needle: "심판", key: "referee" },
  { needle: "judg", key: "referee" },
  { needle: "유니폼", key: "uniform" },
  { needle: "용품", key: "uniform" },
  { needle: "uniform", key: "uniform" },
  { needle: "장비구매", key: "equipment" },
  { needle: "장비", key: "equipment" },
  { needle: "시설", key: "equipment" },
  { needle: "equipment", key: "equipment" },
  { needle: "식대", key: "event_cost" },
  { needle: "식비", key: "event_cost" },
  { needle: "접대", key: "event_cost" },
  { needle: "행사", key: "event_cost" },
  { needle: "meal", key: "event_cost" },
  { needle: "catering", key: "event_cost" },
  { needle: "교통비", key: "transport" },
  { needle: "교통", key: "transport" },
  { needle: "운반", key: "transport" },
  { needle: "주차", key: "transport" },
  { needle: "transport", key: "transport" },
  { needle: "홍보", key: "marketing" },
  { needle: "인쇄", key: "marketing" },
  { needle: "marketing", key: "marketing" },
];

export function normalizeReceiptCategoryLabel(label: string | null | undefined): ExpenseCategoryKey {
  const raw = String(label || "").trim();
  if (!raw) return "other";
  const key = coerceExpenseCategoryKey(raw);
  if (key) return key;
  const lower = raw.toLowerCase();
  for (const { needle, key: k } of LABEL_RULES) {
    if (lower.includes(needle.toLowerCase())) return k;
  }
  return "other";
}
