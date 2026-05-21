/**
 * 🔥 Story Quality - 품질 스코어 계산
 * 
 * CTR 기반, 출처 가중치 적용
 */

import type { StorySource } from "./story.types";

/**
 * 품질 스코어 계산
 * 
 * @param impression - 노출 수
 * @param click - 클릭 수
 * @param source - 출처
 * @returns 0-100 스코어
 */
export function calcQualityScore(
  impression: number,
  click: number,
  source: StorySource
): number {
  // CTR 계산
  const ctr = click / Math.max(impression, 1);

  // 출처별 가중치
  const weight =
    source === "운영" ? 1.0 :
    source === "협회" ? 0.9 :
    0.7; // 사용자

  // 스코어 = CTR * 100 * 가중치
  return Math.min(ctr * 100 * weight, 100);
}

/**
 * 스토리 품질 등급
 */
export type QualityGrade = "excellent" | "good" | "fair" | "poor";

/**
 * 스코어를 등급으로 변환
 */
export function getQualityGrade(score: number): QualityGrade {
  if (score >= 5) return "excellent"; // CTR 5% 이상
  if (score >= 2) return "good";     // CTR 2% 이상
  if (score >= 0.5) return "fair";    // CTR 0.5% 이상
  return "poor";                      // CTR 0.5% 미만
}

/**
 * 품질 기반 우선순위 조정
 */
export function adjustPriorityByQuality(
  basePriority: number,
  qualityScore: number
): number {
  // 품질 스코어가 높으면 우선순위 보정
  const adjustment = qualityScore / 10; // 최대 10점 보정
  return Math.min(basePriority + adjustment, 100);
}
