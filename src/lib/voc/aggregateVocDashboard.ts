import type { Timestamp } from "firebase/firestore";
import type { VocFeedbackListItem } from "@/lib/voc/vocFeedbackService";
import {
  aggregatePainIntelligence,
  type PainIntelligenceCategory,
} from "@/lib/voc/painNormalization";
import {
  aggregateRequestIntelligence,
  type RequestIntelligenceCategory,
} from "@/lib/voc/requestNormalization";
import { VOC_PERSONA_LABELS, type VocPersona } from "@/lib/voc/vocFeedbackTypes";

export type { PainIntelligenceCategory, RequestIntelligenceCategory };

export type VocRankedItem = { label: string; count: number };

export type VocDailyTrendPoint = {
  date: string;
  label: string;
  count: number;
  avgQ2: number;
};

export type VocDashboardStats = {
  totalCount: number;
  avgQ2: number;
  personaCounts: Record<VocPersona, number>;
  personaPct: Record<VocPersona, number>;
  topPain: VocRankedItem[];
  topRequest: VocRankedItem[];
  painIntelligence: PainIntelligenceCategory[];
  requestIntelligence: RequestIntelligenceCategory[];
  dailyTrend: VocDailyTrendPoint[];
};

const PERSONAS: VocPersona[] = ["coach", "operator", "parent"];

const GENERIC_PAIN = new Set(["사용자 Pain"]);
const GENERIC_REQUEST = new Set(["Feature Request"]);

const PAIN_DISPLAY: Record<string, string> = {
  "전문 용어": "전문 용어 이해 어려움",
  어렵: "이해 어려움",
  불편: "사용 불편",
  복잡: "화면·흐름 복잡",
  찾기: "화면 이동·찾기 불편",
  fii: "FII 용어 이해 어려움",
  gev: "GEV 용어 이해 어려움",
  "2v1": "2v1 등 전술 용어 어려움",
  매주: "주기적 발송 부담",
  부담: "운영 부담",
};

const REQUEST_DISPLAY: Record<string, string> = {
  카카오: "카카오톡 자동 발송",
  자동: "자동 발송",
  발송: "자동 발송",
  월: "월간 리포트",
  dashboard: "팀 Dashboard",
  추가: "기능 추가",
  원해: "기능 요청",
  원함: "기능 요청",
  쉬운: "더 쉬운 UI",
};

function toDate(capturedAt: unknown): Date | null {
  if (!capturedAt) return null;
  const ts = capturedAt as Timestamp;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (capturedAt instanceof Date) return capturedAt;
  return null;
}

function emptyPersonaCounts(): Record<VocPersona, number> {
  return { coach: 0, operator: 0, parent: 0 };
}

function rankCounts(
  counts: Map<string, number>,
  displayMap: Record<string, string>,
  max = 5
): VocRankedItem[] {
  const merged = new Map<string, number>();
  for (const [key, count] of counts) {
    const label = displayMap[key] ?? key;
    merged.set(label, (merged.get(label) ?? 0) + count);
  }
  return [...merged.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"))
    .slice(0, max);
}

function rankTextSnippets(texts: string[], max = 5): VocRankedItem[] {
  const counts = new Map<string, number>();
  for (const raw of texts) {
    const text = raw.trim();
    if (!text) continue;
    const label = text.length > 48 ? `${text.slice(0, 48)}…` : text;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

function collectTagCounts(
  items: VocFeedbackListItem[],
  field: "painPoints" | "featureRequests",
  generic: Set<string>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item[field] ?? []) {
      if (!tag || generic.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

function buildDailyTrend(items: VocFeedbackListItem[], days = 30): VocDailyTrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { count: number; q2Sum: number }>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { count: 0, q2Sum: 0 });
  }

  for (const item of items) {
    const date = toDate(item.capturedAt);
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.q2Sum += item.ratingUsage ?? 0;
  }

  return [...buckets.entries()].map(([date, { count, q2Sum }]) => {
    const d = new Date(`${date}T00:00:00`);
    return {
      date,
      label: d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
      count,
      avgQ2: count > 0 ? Math.round((q2Sum / count) * 10) / 10 : 0,
    };
  });
}

/** I-2.2 — client-side VOC dashboard aggregation (≤100 rows) */
export function aggregateVocDashboard(items: VocFeedbackListItem[]): VocDashboardStats {
  const personaCounts = emptyPersonaCounts();
  let q2Sum = 0;

  for (const item of items) {
    if (item.persona in personaCounts) {
      personaCounts[item.persona as VocPersona] += 1;
    }
    q2Sum += item.ratingUsage ?? 0;
  }

  const totalCount = items.length;
  const avgQ2 = totalCount > 0 ? Math.round((q2Sum / totalCount) * 10) / 10 : 0;

  const personaPct = emptyPersonaCounts();
  for (const p of PERSONAS) {
    personaPct[p] =
      totalCount > 0 ? Math.round((personaCounts[p] / totalCount) * 1000) / 10 : 0;
  }

  const painTagCounts = collectTagCounts(items, "painPoints", GENERIC_PAIN);
  let topPain = rankCounts(painTagCounts, PAIN_DISPLAY);
  if (topPain.length === 0) {
    topPain = rankTextSnippets(items.map((i) => i.painText).filter(Boolean));
  }

  const requestTagCounts = collectTagCounts(items, "featureRequests", GENERIC_REQUEST);
  let topRequest = rankCounts(requestTagCounts, REQUEST_DISPLAY);
  if (topRequest.length === 0) {
    topRequest = rankTextSnippets(items.map((i) => i.requestText).filter(Boolean));
  }

  return {
    totalCount,
    avgQ2,
    personaCounts,
    personaPct,
    topPain,
    topRequest,
    painIntelligence: aggregatePainIntelligence(items),
    requestIntelligence: aggregateRequestIntelligence(items),
    dailyTrend: buildDailyTrend(items),
  };
}

export function formatPersonaBreakdown(counts: Record<VocPersona, number>): string {
  return PERSONAS.map((p) => `${VOC_PERSONA_LABELS[p]} ${counts[p]}`).join(" · ");
}
