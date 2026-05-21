/**
 * 협회 이미지 → 구조화 콘텐츠 패키지 (Callable 응답 스키마)
 * 프론트 `src/types/imageContentPackage.ts` 와 동일하게 유지할 것.
 */

export type ContentTone = "official" | "community" | "marketing";

export type RecommendedUse =
  | "hero_banner"
  | "intro_section"
  | "activity_section"
  | "market_post"
  | "general_post";

export interface GeneratedContentVariant {
  tone: ContentTone;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  recommendedUse: RecommendedUse;
  /** 0~1 */
  confidence: number;
}

export interface AssociationContext {
  associationName?: string;
  sportType?: string;
  region?: string;
}

export interface ImageContentPackageWire {
  ok: true;
  imageId: string;
  federationSlug?: string;
  associationContext?: AssociationContext;
  variants: GeneratedContentVariant[];
  bestVariantIndex: number;
  createdAt: string;
  /** 서버 규칙 기반 또는 LLM 실패 후 보정 */
  usedFallback?: boolean;
  /** Rule 기반 추천 배치 한 줄 설명 (Explainability) */
  placementReason?: string;
}

const USE_SET: Set<RecommendedUse> = new Set([
  "hero_banner",
  "intro_section",
  "activity_section",
  "market_post",
  "general_post",
]);

const TONE_ORDER: ContentTone[] = ["official", "community", "marketing"];

export function isRecommendedUse(v: string): v is RecommendedUse {
  return USE_SET.has(v as RecommendedUse);
}

export function clampConfidence(n: unknown): number {
  const x = typeof n === "number" && Number.isFinite(n) ? n : 0.5;
  return Math.min(1, Math.max(0, x));
}

export function normalizeVariant(raw: Record<string, unknown>, expectedTone: ContentTone): GeneratedContentVariant {
  const title = String(raw.title || "").trim().slice(0, 80);
  const summary = String(raw.summary || "").trim().slice(0, 120);
  const content = String(raw.content || raw.body || "").trim().slice(0, 500);
  const tags = Array.isArray(raw.tags)
    ? (raw.tags as unknown[])
        .map((t) => String(t || "").trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const ru = String(raw.recommendedUse || "").trim();
  const recommendedUse: RecommendedUse = isRecommendedUse(ru) ? ru : "general_post";
  return {
    tone: expectedTone,
    title: title || `${expectedTone === "official" ? "공식" : expectedTone === "community" ? "함께하는" : "함께해요"} 소개`,
    summary: summary || content.slice(0, 80) || "협회 활동 소개",
    content: content || summary || "이미지를 바탕으로 한 협회 활동 소개입니다.",
    tags: tags.length >= 2 ? tags : [...tags, "스포츠", "협회"].filter((x, i, a) => a.indexOf(x) === i).slice(0, 5),
    recommendedUse,
    confidence: clampConfidence(raw.confidence),
  };
}

/** LLM이 variants[3]를 주지 않거나 톤이 뒤섞인 경우 정렬·보정 */
export function normalizeVariantsArray(arr: unknown): GeneratedContentVariant[] | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const list = arr.map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}));
  const byTone = new Map<ContentTone, Record<string, unknown>>();
  for (const row of list) {
    const t = String(row.tone || "").toLowerCase();
    if (t === "official" || t === "community" || t === "marketing") {
      byTone.set(t as ContentTone, row);
    }
  }
  const out: GeneratedContentVariant[] = [];
  for (const tone of TONE_ORDER) {
    const row = byTone.get(tone) || list[out.length] || {};
    out.push(normalizeVariant(row, tone));
  }
  return out.length === 3 ? out : null;
}

export function defaultRecommendedForTone(tone: ContentTone): RecommendedUse {
  if (tone === "official") return "intro_section";
  if (tone === "community") return "activity_section";
  return "general_post";
}

export function buildRuleBasedPackage(input: {
  imageId: string;
  federationSlug?: string;
  associationContext: AssociationContext;
}): ImageContentPackageWire {
  const name =
    String(input.associationContext.associationName || "").trim() || "스포츠 협회";
  const sport = String(input.associationContext.sportType || "").trim() || "스포츠";
  const region = String(input.associationContext.region || "").trim() || "지역";

  const variants: GeneratedContentVariant[] = [
    {
      tone: "official",
      title: `${name} 활동 현장`,
      summary: `${region} 지역 ${sport} 협회의 공식 활동을 소개합니다.`,
      content: `${name}은(는) ${region} 지역 ${sport} 문화 확산을 위해 회원 중심의 훈련·교류 활동을 이어가고 있습니다. 이미지에 담긴 현장은 협회의 일상적인 활동 모습을 보여 줍니다.`,
      tags: [sport, region, "협회활동"].slice(0, 5),
      recommendedUse: "intro_section",
      confidence: 0.42,
    },
    {
      tone: "community",
      title: `함께하는 ${sport} 이야기`,
      summary: `회원들이 함께하는 ${region} ${sport} 커뮤니티`,
      content: `${name} 회원들이 함께 땀 흘리며 즐기는 ${sport} 시간입니다. 동호인들이 서로 격려하며 건강한 지역 스포츠 문화를 만들어가고 있습니다.`,
      tags: ["커뮤니티", sport, region].slice(0, 5),
      recommendedUse: "activity_section",
      confidence: 0.4,
    },
    {
      tone: "marketing",
      title: `${region} ${sport}, 지금 함께하세요`,
      summary: `활동 중심 ${sport} 협회를 만나보세요`,
      content: `${name}의 생동감 있는 현장을 소개합니다. ${region}에서 ${sport}를 즐기고 싶다면 협회 활동에 관심을 가져보세요.`,
      tags: ["홍보", sport, "지역스포츠"].slice(0, 5),
      recommendedUse: "general_post",
      confidence: 0.38,
    },
  ];

  return {
    ok: true,
    imageId: input.imageId,
    federationSlug: input.federationSlug,
    associationContext: input.associationContext,
    variants,
    bestVariantIndex: 0,
    createdAt: new Date().toISOString(),
    usedFallback: true,
  };
}
