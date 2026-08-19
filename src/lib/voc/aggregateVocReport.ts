import type { Timestamp } from "firebase/firestore";
import type { VocFeedbackListItem } from "@/lib/voc/vocFeedbackService";
import {
  aggregateVocDashboard,
  type VocDashboardStats,
} from "@/lib/voc/aggregateVocDashboard";
import type { PainCategoryId } from "@/lib/voc/painNormalization";
import type { RequestCategoryId } from "@/lib/voc/requestNormalization";
import { VOC_PERSONA_LABELS, type VocPersona } from "@/lib/voc/vocFeedbackTypes";

export const VOC_REPORT_MIN_INTERVIEWS = 9;

export type VocRatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export type VocRecommendNps = {
  promoters: number;
  passives: number;
  detractors: number;
  withRating: number;
  npsScore: number | null;
  promoterPct: number;
  passivePct: number;
  detractorPct: number;
};

export type VocPmRecommendation = {
  priority: number;
  title: string;
  rationale: string;
};

export type VocCollectionPeriod = {
  startLabel: string;
  endLabel: string;
};

export type VocReportStats = VocDashboardStats & {
  avgQ1: number;
  q1Distribution: VocRatingDistribution;
  personaAvgQ1: Record<VocPersona, number>;
  personaAvgQ2: Record<VocPersona, number>;
  collectionPeriod: VocCollectionPeriod | null;
  recommendNps: VocRecommendNps;
  pmRecommendations: VocPmRecommendation[];
  meetsGate: boolean;
  isEmpty: boolean;
};

const PERSONAS: VocPersona[] = ["coach", "operator", "parent"];

const PAIN_PM_TITLES: Record<PainCategoryId, string> = {
  terminology: "용어 설명 UX",
  ui_friction: "학부모 온보딩",
  feature_gap: "공유·기능 보강",
  operational_burden: "운영 부담 경감",
};

const REQUEST_PM_TITLES: Record<RequestCategoryId, string> = {
  parent_delivery: "알림 자동화",
  monthly_report: "월간 PDF",
  feature_other: "기능 확장",
};

const DEFAULT_PM_RECOMMENDATIONS: VocPmRecommendation[] = [
  { priority: 1, title: "학부모 온보딩", rationale: "VOC 파일럿 후속" },
  { priority: 2, title: "월간 PDF", rationale: "정기 리포트 요청" },
  { priority: 3, title: "알림 자동화", rationale: "Parent Delivery 연계" },
];

function toDate(capturedAt: unknown): Date | null {
  if (!capturedAt) return null;
  const ts = capturedAt as Timestamp;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (capturedAt instanceof Date) return capturedAt;
  return null;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function emptyRatingDistribution(): VocRatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function emptyPersonaAvg(): Record<VocPersona, number> {
  return { coach: 0, operator: 0, parent: 0 };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function avgForPersona(
  items: VocFeedbackListItem[],
  persona: VocPersona,
  field: "ratingUnderstanding" | "ratingUsage"
): number {
  const rows = items.filter((item) => item.persona === persona);
  if (rows.length === 0) return 0;
  const sum = rows.reduce((acc, item) => acc + (item[field] ?? 0), 0);
  return round1(sum / rows.length);
}

function buildCollectionPeriod(items: VocFeedbackListItem[]): VocCollectionPeriod | null {
  const dates = items
    .map((item) => toDate(item.capturedAt))
    .filter((date): date is Date => date !== null);
  if (dates.length === 0) return null;

  const start = new Date(Math.min(...dates.map((d) => d.getTime())));
  const end = new Date(Math.max(...dates.map((d) => d.getTime())));
  return {
    startLabel: formatDateLabel(start),
    endLabel: formatDateLabel(end),
  };
}

function buildRecommendNps(items: VocFeedbackListItem[]): VocRecommendNps {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let withRating = 0;

  for (const item of items) {
    const rating = item.ratingRecommend;
    if (rating == null || rating < 1 || rating > 5) continue;
    withRating += 1;
    if (rating >= 4) promoters += 1;
    else if (rating === 3) passives += 1;
    else detractors += 1;
  }

  const npsScore =
    withRating > 0
      ? Math.round(((promoters - detractors) / withRating) * 100)
      : null;

  return {
    promoters,
    passives,
    detractors,
    withRating,
    npsScore,
    promoterPct: withRating > 0 ? round1((promoters / withRating) * 100) : 0,
    passivePct: withRating > 0 ? round1((passives / withRating) * 100) : 0,
    detractorPct: withRating > 0 ? round1((detractors / withRating) * 100) : 0,
  };
}

function buildPmRecommendations(stats: VocDashboardStats): VocPmRecommendation[] {
  const recs: VocPmRecommendation[] = [];
  const usedTitles = new Set<string>();

  const topPain = stats.painIntelligence[0];
  if (topPain) {
    const title = PAIN_PM_TITLES[topPain.id];
    recs.push({
      priority: 1,
      title,
      rationale: `${topPain.label} ${topPain.pct}% (${topPain.count}건)`,
    });
    usedTitles.add(title);
  }

  const topRequest = stats.requestIntelligence[0];
  if (topRequest) {
    const title = REQUEST_PM_TITLES[topRequest.id];
    if (!usedTitles.has(title)) {
      recs.push({
        priority: recs.length + 1,
        title,
        rationale: `${topRequest.label} · ${topRequest.hint}`,
      });
      usedTitles.add(title);
    }
  }

  if (stats.topRequest[0] && recs.length < 3) {
    const title = stats.topRequest[0].label.slice(0, 24);
    if (!usedTitles.has(title)) {
      recs.push({
        priority: recs.length + 1,
        title,
        rationale: `Request VOC ${stats.topRequest[0].count}건`,
      });
      usedTitles.add(title);
    }
  }

  for (const fallback of DEFAULT_PM_RECOMMENDATIONS) {
    if (recs.length >= 3) break;
    if (usedTitles.has(fallback.title)) continue;
    recs.push({
      priority: recs.length + 1,
      title: fallback.title,
      rationale: fallback.rationale,
    });
    usedTitles.add(fallback.title);
  }

  return recs.slice(0, 3);
}

/** I-2.5 — VOC report stats (Dashboard + PDF 공통 SoT) */
export function aggregateVocReport(items: VocFeedbackListItem[]): VocReportStats {
  const dashboard = aggregateVocDashboard(items);
  const q1Distribution = emptyRatingDistribution();
  let q1Sum = 0;

  for (const item of items) {
    const rating = item.ratingUnderstanding ?? 0;
    if (rating >= 1 && rating <= 5) {
      q1Distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
      q1Sum += rating;
    }
  }

  const totalCount = items.length;
  const avgQ1 = totalCount > 0 ? round1(q1Sum / totalCount) : 0;

  const personaAvgQ1 = emptyPersonaAvg();
  const personaAvgQ2 = emptyPersonaAvg();
  for (const persona of PERSONAS) {
    personaAvgQ1[persona] = avgForPersona(items, persona, "ratingUnderstanding");
    personaAvgQ2[persona] = avgForPersona(items, persona, "ratingUsage");
  }

  return {
    ...dashboard,
    avgQ1,
    q1Distribution,
    personaAvgQ1,
    personaAvgQ2,
    collectionPeriod: buildCollectionPeriod(items),
    recommendNps: buildRecommendNps(items),
    pmRecommendations: buildPmRecommendations(dashboard),
    meetsGate: totalCount >= VOC_REPORT_MIN_INTERVIEWS,
    isEmpty: totalCount === 0,
  };
}

export function formatPersonaAvgRows(
  personaAvg: Record<VocPersona, number>
): { persona: VocPersona; label: string; avg: number }[] {
  return PERSONAS.map((persona) => ({
    persona,
    label: VOC_PERSONA_LABELS[persona],
    avg: personaAvg[persona],
  }));
}
