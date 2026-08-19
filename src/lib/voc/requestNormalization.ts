import type { VocFeedbackListItem } from "@/lib/voc/vocFeedbackService";

/** I-2.4 — Request category normalization */

export type RequestCategoryId = "parent_delivery" | "monthly_report" | "feature_other";

export const REQUEST_CATEGORY_LABELS: Record<RequestCategoryId, string> = {
  parent_delivery: "Parent Delivery",
  monthly_report: "Monthly Report",
  feature_other: "Feature / Other",
};

export const REQUEST_CATEGORY_HINTS: Record<RequestCategoryId, string> = {
  parent_delivery: "자동 발송 · 카카오톡 · 알림 발송",
  monthly_report: "월간 리포트 · 정기 리포트",
  feature_other: "기능 추가 · 기타 요청",
};

/** 카테고리별 매칭 키워드 (앞쪽 카테고리 우선) */
const REQUEST_CATEGORY_RULES: { id: RequestCategoryId; keywords: string[] }[] = [
  {
    id: "parent_delivery",
    keywords: [
      "카카오톡",
      "카카오",
      "kakao",
      "알림톡",
      "알림 발송",
      "자동 발송",
      "자동발송",
      "parent delivery",
      "자동",
      "발송",
    ],
  },
  {
    id: "monthly_report",
    keywords: ["월간 리포트", "정기 리포트", "monthly report", "월간", "정기", "월별"],
  },
  {
    id: "feature_other",
    keywords: [
      "기능 추가",
      "dashboard",
      "팀 dashboard",
      "기능",
      "추가",
      "원해",
      "원함",
      "쉬운",
      "분석",
    ],
  },
];

const GENERIC_REQUEST_TAG = "Feature Request";

export type RequestIntelligenceCategory = {
  id: RequestCategoryId;
  label: string;
  hint: string;
  count: number;
  pct: number;
  sampleQuotes: string[];
};

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

/** 태그·문장 → Request 카테고리 (없으면 null) */
export function classifyRequestCategory(input: string): RequestCategoryId | null {
  const text = normalizeText(input);
  if (!text) return null;

  for (const rule of REQUEST_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return rule.id;
    }
  }

  if (/카카오|발송|알림/.test(text)) {
    return "parent_delivery";
  }
  if (/월.*리포트|리포트.*월/.test(text)) {
    return "monthly_report";
  }
  if (/기능|추가|원하/.test(text)) {
    return "feature_other";
  }

  return null;
}

function addQuote(
  store: Map<RequestCategoryId, Set<string>>,
  id: RequestCategoryId,
  quote: string
) {
  const trimmed = quote.trim();
  if (!trimmed) return;
  if (!store.has(id)) store.set(id, new Set());
  store.get(id)!.add(trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed);
}

function categoriesForItem(item: VocFeedbackListItem): Set<RequestCategoryId> {
  const found = new Set<RequestCategoryId>();

  for (const tag of item.featureRequests ?? []) {
    if (!tag || tag === GENERIC_REQUEST_TAG) continue;
    const cat = classifyRequestCategory(tag);
    if (cat) found.add(cat);
  }

  const requestText = item.requestText?.trim() ?? "";
  if (requestText) {
    const fromText = classifyRequestCategory(requestText);
    if (fromText) found.add(fromText);
  }

  if (found.size === 0 && requestText) {
    const fallback = classifyRequestCategory(requestText);
    if (fallback) found.add(fallback);
  }

  return found;
}

/** I-2.4 — Request Intelligence 집계 (≤100 rows) */
export function aggregateRequestIntelligence(
  items: VocFeedbackListItem[]
): RequestIntelligenceCategory[] {
  const counts = new Map<RequestCategoryId, number>();
  const quotes = new Map<RequestCategoryId, Set<string>>();

  for (const item of items) {
    const cats = categoriesForItem(item);
    for (const cat of cats) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
      addQuote(quotes, cat, item.requestText);
    }
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: REQUEST_CATEGORY_LABELS[id],
      hint: REQUEST_CATEGORY_HINTS[id],
      count,
      pct: Math.round((count / total) * 1000) / 10,
      sampleQuotes: [...(quotes.get(id) ?? [])].slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}
