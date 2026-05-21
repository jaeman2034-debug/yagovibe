/**
 * 🔥 판매자 신뢰 점수 서비스
 * 
 * 점수 계산, 갱신, 등급 결정
 */

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TrustScoreConfig, TrustTier } from "@/types/user";

const DEFAULT_CONFIG: TrustScoreConfig = {
  ratingWeight: 20,
  salesWeight: 5,
  salesMax: 50,
  postsWeight: 2,
  postsMax: 20,
};

/**
 * 🔥 신뢰 점수 계산
 * 
 * 공식:
 * trustScore = ratingAvg*20 + min(completedSales*5,50) + min(recentPosts*2,20)
 */
export function calculateTrustScore({
  ratingAvg = 0,
  completedSales = 0,
  recentPosts = 0,
  config = DEFAULT_CONFIG,
}: {
  ratingAvg?: number;
  completedSales?: number;
  recentPosts?: number;
  config?: TrustScoreConfig;
}): number {
  const ratingScore = ratingAvg * config.ratingWeight;
  const salesScore = Math.min(completedSales * config.salesWeight, config.salesMax);
  const postsScore = Math.min(recentPosts * config.postsWeight, config.postsMax);
  
  const totalScore = ratingScore + salesScore + postsScore;
  
  // 최대 100점 제한
  return Math.min(Math.round(totalScore * 10) / 10, 100);
}

/**
 * 🔥 신뢰 등급 결정
 */
export function getTrustTier(trustScore: number): TrustTier {
  if (trustScore >= 80) return "top";
  if (trustScore >= 60) return "trusted";
  if (trustScore >= 40) return "verified";
  if (trustScore >= 20) return "basic";
  return "guest";
}

/**
 * 🔥 최근 게시글 수 계산 (30일 이내)
 */
export async function calculateRecentPosts(userId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const postsQuery = query(
      collection(db, "market"),
      where("authorId", "==", userId),
      where("status", "in", ["active", "open", "reserved", "completed"])
    );
    
    const postsSnap = await getDocs(postsQuery);
    const posts = postsSnap.docs.map(doc => doc.data());
    
    // 30일 이내 게시글만 필터링
    const recentPosts = posts.filter(post => {
      if (!post.createdAt) return false;
      const createdAt = post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
      return createdAt >= thirtyDaysAgo;
    });
    
    return recentPosts.length;
  } catch (err) {
    console.error("❌ 최근 게시글 수 계산 실패:", err);
    return 0;
  }
}

/**
 * 판매자 신뢰 스냅샷 갱신 — 서버 전용
 * (Firestore `market` / `marketReviews` 트리거가 Admin으로 처리. 클라 직접 쓰기는 rules 차단.)
 */
export async function updateSellerTrustScore(_sellerId: string): Promise<void> {
  return;
}

/**
 * 🔥 리뷰 작성 시 판매자 점수 갱신
 */
export async function updateTrustScoreOnReview(sellerId: string): Promise<void> {
  await updateSellerTrustScore(sellerId);
}

/**
 * 🔥 거래 완료 시 판매자 점수 갱신
 */
export async function updateTrustScoreOnTransactionComplete(sellerId: string): Promise<void> {
  await updateSellerTrustScore(sellerId);
}

/**
 * 🔥 게시글 생성 시 판매자 점수 갱신
 */
export async function updateTrustScoreOnPostCreate(sellerId: string): Promise<void> {
  await updateSellerTrustScore(sellerId);
}
