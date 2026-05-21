/**
 * 🔥 검색 랭킹 점수 계산 유틸 (v1)
 * 
 * searchScore = textMatchScore * 3 + rankScore * 0.4 + authorTrustScore * 1.5 - riskScore * 2 + recencyBoost
 */

import type { MarketPost } from "@/types/market";
import type { User } from "@/types/user";
import { calculateRecencyBoost } from "./feedScoring";

export interface SearchScoreResult {
  searchScore: number;
  textMatchScore: number;
  rankScore: number;
  authorTrustScore: number;
  riskScore: number;
  recencyBoost: number;
}

/**
 * 🔥 텍스트 매칭 점수 계산
 * 
 * 검색어와 게시글 제목/설명의 유사도 계산
 */
export function calculateTextMatchScore(
  post: MarketPost,
  searchQuery: string
): number {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return 0;
  }
  
  const query = searchQuery.trim().toLowerCase();
  const title = (post.title || "").toLowerCase();
  const description = (post.description || "").toLowerCase();
  const category = (post.category || "").toLowerCase();
  const sport = (post.sport || "").toLowerCase();
  
  let score = 0;
  
  // 제목 완전 일치: 100점
  if (title === query) {
    score += 100;
  }
  // 제목 시작 일치: 80점
  else if (title.startsWith(query)) {
    score += 80;
  }
  // 제목 포함: 60점
  else if (title.includes(query)) {
    score += 60;
  }
  // 제목 단어 일치: 40점
  else {
    const titleWords = title.split(/\s+/);
    const queryWords = query.split(/\s+/);
    const matchedWords = queryWords.filter(qw => 
      titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
    );
    if (matchedWords.length > 0) {
      score += 40 * (matchedWords.length / queryWords.length);
    }
  }
  
  // 설명 포함: 30점
  if (description.includes(query)) {
    score += 30;
  }
  
  // 카테고리 일치: 20점
  if (category.includes(query) || query.includes(category)) {
    score += 20;
  }
  
  // 종목 일치: 15점
  if (sport.includes(query) || query.includes(sport)) {
    score += 15;
  }
  
  return Math.min(100, score); // 최대 100점
}

/**
 * 🔥 검색 랭킹 점수 계산
 */
export function calculateSearchScore(
  post: MarketPost,
  searchQuery: string,
  authorData?: User | null
): SearchScoreResult {
  // 기본값 설정
  const textMatchScore = calculateTextMatchScore(post, searchQuery);
  const rankScore = post.rankScore || 0;
  const authorTrustScore = authorData?.trustScore || 0;
  const riskScore = post.riskScore || 0;
  const recencyBoost = calculateRecencyBoost(post.createdAt);
  
  // searchScore 계산
  const searchScore = 
    textMatchScore * 3 +
    rankScore * 0.4 +
    authorTrustScore * 1.5 -
    riskScore * 2 +
    recencyBoost;
  
  return {
    searchScore: Math.max(0, searchScore), // 음수 방지
    textMatchScore,
    rankScore,
    authorTrustScore,
    riskScore,
    recencyBoost,
  };
}

/**
 * 🔥 게시글 배열에 searchScore 추가 및 정렬
 */
export function calculateAndSortBySearchScore(
  posts: MarketPost[],
  searchQuery: string,
  authorDataMap: Map<string, User>
): Array<MarketPost & { searchScore: number }> {
  return posts
    .map(post => {
      const authorData = authorDataMap.get(post.authorId);
      const { searchScore } = calculateSearchScore(post, searchQuery, authorData);
      return {
        ...post,
        searchScore,
      };
    })
    .sort((a, b) => b.searchScore - a.searchScore); // 내림차순 정렬
}
