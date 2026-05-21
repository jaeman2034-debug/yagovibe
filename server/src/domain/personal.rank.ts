/**
 * 🔥 Personal Rank - 개인화 리랭커
 * 
 * Week4 핵심: 혼합D 결과 → 개인 프로필 → 최종 정렬
 */

import type { Story } from "./types";
import { prisma } from "../data/prisma";

/**
 * 기본 점수 계산
 */
function baseScore(s: Story): number {
  return (s.priority ?? 0) + (s.score ?? 0) * 0.2;
}

/**
 * 카테고리 가중치 적용
 */
function categoryWeight(s: Story, profile: {
  wLeague: number;
  wRecruit: number;
  wGround: number;
  wMarket: number;
}): number {
  switch (s.category) {
    case "대회":
      return profile.wLeague;
    case "모집":
      return profile.wRecruit;
    case "구장":
      return profile.wGround;
    case "마켓":
      return profile.wMarket;
    default:
      return 1.0;
  }
}

/**
 * 개인화 리랭킹
 * 
 * @param userId 사용자 ID (null이면 콜드스타트)
 * @param stories 원본 스토리 목록
 * @returns 리랭킹된 스토리 목록
 */
export async function rerankStories(
  userId: string | null,
  stories: Story[]
): Promise<Story[]> {
  // 콜드스타트: 개인화 없이 기본 정렬
  if (!userId) {
    return stories.sort((a, b) => {
      const scoreA = baseScore(a);
      const scoreB = baseScore(b);
      return scoreB - scoreA;
    });
  }

  // 프로필 조회
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  // 프로필 없으면 기본 정렬
  if (!profile) {
    return stories.sort((a, b) => {
      const scoreA = baseScore(a);
      const scoreB = baseScore(b);
      return scoreB - scoreA;
    });
  }

  // 개인화 점수 계산 및 정렬
  const ranked = stories
    .map((s) => {
      const base = baseScore(s);
      const category = categoryWeight(s, profile);
      const regionBonus = profile.region === s.region ? 15 : 0;

      const finalScore =
        base * 0.6 + // 기본 점수 60%
        category * 40 + // 카테고리 가중치 40%
        regionBonus; // 지역 보너스

      return {
        ...s,
        _personalScore: finalScore,
      };
    })
    .sort((a, b) => b._personalScore - a._personalScore)
    .map(({ _personalScore, ...s }) => s); // _personalScore 제거

  return ranked;
}
