/**
 * LLM 출력 텍스트 기반 이미지 장면 휴리스틱 → recommendedUse·confidence 보정 (Rule + AI hybrid)
 */

import type { GeneratedContentVariant, RecommendedUse } from "../types/imageContentPackage";
import { clampConfidence } from "../types/imageContentPackage";
import {
  pickTopPlacement,
  scoreRecommendedUse,
  type PlacementHeuristicAdjustment,
} from "./aiPlacementScoring";

export type ImageFeatures = {
  hasPeople: boolean;
  /** 휴리스틱 구간 (정확한 인원 수 아님) */
  peopleCountBand: "none" | "single" | "few" | "many";
  isGroup: boolean;
  isAction: boolean;
  isProduct: boolean;
};

export function extractImageFeaturesFromText(desc: string): ImageFeatures {
  const d = String(desc || "");
  const hasPeople =
    /사람|인물|회원|선수|아이|어린이|학생|코치|관중|팀원|동호인|참가자|모습|함께|여럿|인원/.test(d);
  const isGroup =
    /단체|여러\s*명|다수|많은\s*사람|모여|함께\s*모여|그룹|집단|팀\s*전체|단체\s*사진/.test(d);
  const many = /여러|다수|많은|단체|모두|다\s*함께|다함께/.test(d);
  let peopleCountBand: ImageFeatures["peopleCountBand"] = "none";
  if (hasPeople) {
    peopleCountBand = many || isGroup ? "many" : "few";
  }
  const isAction =
    /훈련|연습|경기|활동|뛰|달리|공을|슛|경기장|운동|레슨|스크림|대회|시합/.test(d);
  const isProduct =
    /상품|제품|판매|유니폼|축구화|장비|용품|새\s*제품|중고|가격|\d+\s*원|구매|배송|할인/.test(d);
  return {
    hasPeople,
    peopleCountBand,
    isGroup,
    isAction,
    isProduct,
  };
}

/** 레거시·테스트용: 점수 엔진과 동일한 기본 규칙 결과 */
export function resolveRecommendedUseFromFeatures(f: ImageFeatures): RecommendedUse {
  const scores = scoreRecommendedUse(f);
  return pickTopPlacement(scores) as RecommendedUse;
}

function buildPlacementReasonForSelectedUse(use: RecommendedUse, f: ImageFeatures): string {
  if (use === "market_post" && f.isProduct) {
    return "상품·판매·장비 등이 묘사된 텍스트로 보아 마켓/상품 게시에 맞게 배치했습니다.";
  }
  if (use === "activity_section" && f.isGroup && f.isAction) {
    return "단체 활동·훈련·경기 장면으로 보아 활동 섹션에 맞게 배치했습니다.";
  }
  if (use === "intro_section" && (f.isGroup || f.hasPeople)) {
    return "단체 또는 인물 중심 장면으로 보아 협회 소개 영역에 맞게 배치했습니다.";
  }
  switch (use) {
    case "market_post":
      return "마켓·상품 게시에 맞게 배치했습니다.";
    case "activity_section":
      return "활동·훈련 섹션에 맞게 배치했습니다.";
    case "intro_section":
      return "협회 소개 영역에 맞게 배치했습니다.";
    case "hero_banner":
      return "대표 비주얼·히어로 배너에 맞게 배치했습니다.";
    case "general_post":
    default:
      return "일반 콘텐츠로 분류되어 범용 게시에 맞게 배치했습니다.";
  }
}

/** 사용자·관리자용 한 줄 근거 (선택된 슬롯 기준) */
export function buildPlacementReason(f: ImageFeatures): string {
  const use = pickTopPlacement(scoreRecommendedUse(f)) as RecommendedUse;
  return buildPlacementReasonForSelectedUse(use, f);
}

function adjustConfidenceForFeatures(
  v: GeneratedContentVariant,
  features: ImageFeatures
): number {
  let score = clampConfidence(v.confidence);
  if (v.recommendedUse === "activity_section" && features.isAction) score += 0.05;
  if (v.tone === "marketing" && features.isProduct) score += 0.05;
  if (v.recommendedUse === "intro_section" && (features.isGroup || features.hasPeople)) {
    score += 0.03;
  }
  if (v.recommendedUse === "market_post" && features.isProduct) score += 0.04;
  return Math.min(1, score);
}

/**
 * variants 텍스트를 합쳐 특징 추출 후 recommendedUse 통일 + confidence 보정 (제자리 수정).
 * `adj`: 최근 aiStats 기반 bias (협회 슬러그가 있을 때 로더에서 전달).
 */
export function applyPlacementHeuristicToVariants(
  variants: GeneratedContentVariant[],
  adj?: PlacementHeuristicAdjustment
): string {
  if (!variants || variants.length === 0) return "";
  const desc = variants
    .map((v) =>
      [v.title, v.summary, v.content, ...(Array.isArray(v.tags) ? v.tags : [])].join(" ")
    )
    .join(" ");
  const features = extractImageFeaturesFromText(desc);
  const scores = scoreRecommendedUse(features, adj);
  const use = pickTopPlacement(scores) as RecommendedUse;
  const reason = buildPlacementReasonForSelectedUse(use, features);
  for (const v of variants) {
    v.recommendedUse = use;
    v.confidence = adjustConfidenceForFeatures({ ...v, recommendedUse: use }, features);
  }
  return reason;
}
