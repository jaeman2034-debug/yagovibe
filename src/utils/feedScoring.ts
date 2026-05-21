/**
 * 🔥 추천 피드 점수 계산 유틸 (v2)
 * 
 * feedScore = rankScore * 0.6 + authorTrustScore * 2 - riskScore * 1.5 + recencyBoost
 */

import type { MarketPost } from "@/types/market";
import type { User } from "@/types/user";

export interface FeedScoreResult {
  feedScore: number;
  rankScore: number;
  authorTrustScore: number;
  riskScore: number;
  recencyBoost: number;
}

/**
 * 🔥 최신성 부스트 계산
 */
export function calculateRecencyBoost(createdAt: any): number {
  if (!createdAt) return 0;
  
  try {
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    // 최근 24시간: +30
    if (diffHours <= 24) {
      return 30;
    }
    
    // 최근 7일: +10
    if (diffDays <= 7) {
      return 10;
    }
    
    // 그 외: 0
    return 0;
  } catch (err) {
    console.warn("⚠️ 최신성 부스트 계산 실패:", err);
    return 0;
  }
}

/**
 * 🔥 추천 피드 점수 계산
 */
export function calculateFeedScore(
  post: MarketPost,
  authorData?: User | null
): FeedScoreResult {
  // 기본값 설정
  const rankScore = post.rankScore || 0;
  const authorTrustScore = authorData?.trustScore || 0;
  const riskScore = post.riskScore || 0;
  const recencyBoost = calculateRecencyBoost(post.createdAt);
  
  // feedScore 계산
  const feedScore = 
    rankScore * 0.6 +
    authorTrustScore * 2 -
    riskScore * 1.5 +
    recencyBoost;
  
  return {
    feedScore: Math.max(0, feedScore), // 음수 방지
    rankScore,
    authorTrustScore,
    riskScore,
    recencyBoost,
  };
}

/**
 * 🔥 게시글 배열에 feedScore 추가 및 정렬
 */
export function calculateAndSortByFeedScore(
  posts: MarketPost[],
  authorDataMap: Map<string, User>
): Array<MarketPost & { feedScore: number }> {
  return posts
    .map(post => {
      const authorData = authorDataMap.get(post.authorId);
      const { feedScore } = calculateFeedScore(post, authorData);
      return {
        ...post,
        feedScore,
      };
    })
    .sort((a, b) => b.feedScore - a.feedScore); // 내림차순 정렬
}
