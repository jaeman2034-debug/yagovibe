import type { VocFeedbackListItem } from "@/lib/voc/vocFeedbackService";

/** I-2.3 — Pain category normalization */

export type PainCategoryId =
  | "terminology"
  | "ui_friction"
  | "feature_gap"
  | "operational_burden";

export const PAIN_CATEGORY_LABELS: Record<PainCategoryId, string> = {
  terminology: "용어 이해 어려움",
  ui_friction: "UI 불편",
  feature_gap: "기능 부족",
  operational_burden: "운영 부담",
};

/** 카테고리별 매칭 키워드 (앞쪽 카테고리 우선) */
const PAIN_CATEGORY_RULES: { id: PainCategoryId; keywords: string[] }[] = [
  {
    id: "terminology",
    keywords: [
      "fii",
      "gev",
      "scan",
      "press",
      "전문 용어",
      "전문용어",
      "2v1",
      "축구 용어",
      "용어",
    ],
  },
  {
    id: "ui_friction",
    keywords: ["화면", "버튼", "이동", "찾기", "복잡", "불편", "ui"],
  },
  {
    id: "feature_gap",
    keywords: ["기능", "데이터", "부족", "없어", "없음"],
  },
  {
    id: "operational_burden",
    keywords: ["매주", "부담", "운영"],
  },
];

const GENERIC_PAIN_TAG = "사용자 Pain";

export type PainIntelligenceCategory = {
  id: PainCategoryId;
  label: string;
  count: number;
  pct: number;
  sampleQuotes: string[];
};

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

/** 태그·문장 → Pain 카테고리 (없으면 null) */
export function classifyPainCategory(input: string): PainCategoryId | null {
  const text = normalizeText(input);
  if (!text) return null;

  for (const rule of PAIN_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return rule.id;
    }
  }

  if (/어렵|이해.*(안|못|힘)/.test(text)) {
    return "terminology";
  }

  return null;
}

function addQuote(store: Map<PainCategoryId, Set<string>>, id: PainCategoryId, quote: string) {
  const trimmed = quote.trim();
  if (!trimmed) return;
  if (!store.has(id)) store.set(id, new Set());
  store.get(id)!.add(trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed);
}

function categoriesForItem(item: VocFeedbackListItem): Set<PainCategoryId> {
  const found = new Set<PainCategoryId>();

  for (const tag of item.painPoints ?? []) {
    if (!tag || tag === GENERIC_PAIN_TAG) continue;
    const cat = classifyPainCategory(tag);
    if (cat) found.add(cat);
  }

  const painText = item.painText?.trim() ?? "";
  if (painText) {
    const fromText = classifyPainCategory(painText);
    if (fromText) found.add(fromText);
  }

  if (found.size === 0 && painText) {
    const fallback = classifyPainCategory(painText);
    if (fallback) found.add(fallback);
  }

  return found;
}

/** I-2.3 — Pain Intelligence 집계 (≤100 rows) */
export function aggregatePainIntelligence(
  items: VocFeedbackListItem[]
): PainIntelligenceCategory[] {
  const counts = new Map<PainCategoryId, number>();
  const quotes = new Map<PainCategoryId, Set<string>>();

  for (const item of items) {
    const cats = categoriesForItem(item);
    for (const cat of cats) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
      addQuote(quotes, cat, item.painText);
    }
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: PAIN_CATEGORY_LABELS[id],
      count,
      pct: Math.round((count / total) * 1000) / 10,
      sampleQuotes: [...(quotes.get(id) ?? [])].slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}
