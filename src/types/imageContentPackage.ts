/**
 * 이미지 → 구조화 콘텐츠 패키지 (프론트·제품 스키마)
 * Functions `functions/src/types/imageContentPackage.ts` 와 필드 동일 유지.
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
  confidence: number;
}

export interface AssociationContext {
  associationName?: string;
  sportType?: string;
  region?: string;
}

export interface ImageContentPackage {
  imageId: string;
  federationSlug?: string;
  associationContext?: AssociationContext;
  variants: GeneratedContentVariant[];
  bestVariantIndex: number;
  createdAt: string;
  /** Callable 미배포·오류 시 OCR 파이프라인 등 */
  usedFallback?: boolean;
  /** 서버 휴리스틱 기준 추천 배치 설명 */
  placementReason?: string;
}
