/**
 * 🔥 사기 의심 패턴 탐지 및 점수 계산
 */

import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_RISK_RULES, EXTERNAL_CONTACT_PATTERNS, type RiskRuleConfig } from "@/config/riskRules";
import type { MarketPost } from "@/types/market";

export type RiskTier = "low" | "medium" | "high";
export type RiskFlag = 
  | "new_account_high_price_external_contact"
  | "duplicate_posts"
  | "excessive_posts_no_sales"
  | "no_history_high_price_external_contact"
  | "external_contact_detected";

/**
 * 🔥 외부 연락처 탐지
 */
export function detectExternalContact(text: string): boolean {
  if (!text) return false;
  return EXTERNAL_CONTACT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * 🔥 플래그 탐지 (게시글)
 */
export function detectPostFlags(
  post: MarketPost,
  config: RiskRuleConfig = DEFAULT_RISK_RULES
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const text = `${post.title} ${post.description || ""}`.toLowerCase();
  
  // 외부 연락처 탐지
  if (detectExternalContact(text)) {
    flags.push("external_contact_detected");
  }
  
  return flags;
}

/**
 * 🔥 게시글 위험 점수 계산
 */
export async function calcPostRiskScore(
  post: MarketPost,
  authorId: string,
  config: RiskRuleConfig = DEFAULT_RISK_RULES
): Promise<{ score: number; flags: RiskFlag[] }> {
  let score = 0;
  const flags: RiskFlag[] = [];
  
  // 플래그 탐지
  const postFlags = detectPostFlags(post, config);
  flags.push(...postFlags);
  
  // 외부 연락처 포함
  if (postFlags.includes("external_contact_detected")) {
    score += config.externalContactScore;
  }
  
  // 작성자 정보 조회
  try {
    const userRef = doc(db, "users", authorId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt || 0);
      const accountAgeDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      // 신규 계정 + 고가 + 외부 연락처
      if (
        accountAgeDays <= config.newAccountDays &&
        post.price && post.price >= config.highPriceThreshold &&
        postFlags.includes("external_contact_detected")
      ) {
        score += config.externalContactScore;
        flags.push("new_account_high_price_external_contact");
      }
      
      // 리뷰/거래 이력 0인데 고가 + 외부연락처
      const completedSales = userData.completedSales || 0;
      const reviewCount = userData.reviewCount || 0;
      
      if (
        completedSales === 0 &&
        reviewCount === 0 &&
        post.price && post.price >= config.highPriceThreshold &&
        postFlags.includes("external_contact_detected")
      ) {
        score += config.noHistoryHighPriceScore;
        flags.push("no_history_high_price_external_contact");
      }
    }
  } catch (err) {
    console.warn("⚠️ 작성자 정보 조회 실패 (risk 계산):", err);
  }
  
  // 동일 이미지/유사 제목 다수 업로드 확인
  try {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - config.duplicatePostWindowHours);
    
    const recentPostsQuery = query(
      collection(db, "marketPosts"),
      where("authorId", "==", authorId),
      where("status", "in", ["active", "open"]),
      orderBy("createdAt", "desc"),
      limit(config.duplicatePostThreshold + 1)
    );
    
    const recentPostsSnap = await getDocs(recentPostsQuery);
    const recentPosts = recentPostsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as MarketPost))
      .filter(p => {
        if (!p.createdAt) return false;
        const createdAt = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return createdAt >= windowStart;
      });
    
    // 동일 이미지 또는 유사 제목 확인
    if (recentPosts.length >= config.duplicatePostThreshold) {
      const sameImageCount = recentPosts.filter(p => 
        p.images && post.images && 
        p.images.length > 0 && post.images.length > 0 &&
        p.images[0] === post.images[0]
      ).length;
      
      const similarTitleCount = recentPosts.filter(p => {
        const similarity = calculateTitleSimilarity(p.title, post.title);
        return similarity > 0.8; // 80% 이상 유사
      }).length;
      
      if (sameImageCount >= config.duplicatePostThreshold || 
          similarTitleCount >= config.duplicatePostThreshold) {
        score += config.duplicatePostScore;
        flags.push("duplicate_posts");
      }
    }
  } catch (err) {
    console.warn("⚠️ 중복 게시글 확인 실패 (risk 계산):", err);
  }
  
  return { score: Math.min(score, 100), flags: [...new Set(flags)] };
}

/**
 * 🔥 제목 유사도 계산 (간단한 Jaccard 유사도)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * 🔥 사용자 위험 점수 계산
 */
export async function calcUserRiskScore(
  userId: string,
  config: RiskRuleConfig = DEFAULT_RISK_RULES
): Promise<{ score: number; flags: RiskFlag[]; tier: RiskTier }> {
  let score = 0;
  const flags: RiskFlag[] = [];
  
  try {
    // 사용자 정보 조회
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { score: 0, flags: [], tier: "low" };
    }
    
    const userData = userSnap.data();
    const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt || 0);
    const accountAgeDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // 최근 게시글 조회
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - config.excessivePostWindowDays);
    
    const recentPostsQuery = query(
      collection(db, "marketPosts"),
      where("authorId", "==", userId),
      where("status", "in", ["active", "open", "reserved", "completed"]),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const recentPostsSnap = await getDocs(recentPostsQuery);
    const recentPosts = recentPostsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as MarketPost))
      .filter(p => {
        if (!p.createdAt) return false;
        const createdAt = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return createdAt >= windowStart;
      });
    
    // 거래완료 없이 게시글 과다 생성
    const completedSales = userData.completedSales || 0;
    if (recentPosts.length >= config.excessivePostThreshold && completedSales === 0) {
      score += config.excessivePostScore;
      flags.push("excessive_posts_no_sales");
    }
    
    // 게시글들의 평균 위험 점수
    const postScores = await Promise.all(
      recentPosts.slice(0, 5).map(post => calcPostRiskScore(post, userId, config))
    );
    
    const avgPostScore = postScores.length > 0
      ? postScores.reduce((sum, p) => sum + p.score, 0) / postScores.length
      : 0;
    
    score += Math.round(avgPostScore * 0.3); // 게시글 점수의 30% 반영
    
    // 플래그 수집
    postScores.forEach(p => flags.push(...p.flags));
    
  } catch (err) {
    console.error("❌ 사용자 위험 점수 계산 실패:", err);
  }
  
  // Risk Tier 결정
  let tier: RiskTier = "low";
  if (score >= config.highRiskThreshold) {
    tier = "high";
  } else if (score >= config.mediumRiskThreshold) {
    tier = "medium";
  }
  
  return { 
    score: Math.min(score, 100), 
    flags: [...new Set(flags)],
    tier 
  };
}

/**
 * 🔥 Risk Tier 결정
 */
export function getRiskTier(score: number, config: RiskRuleConfig = DEFAULT_RISK_RULES): RiskTier {
  if (score >= config.highRiskThreshold) return "high";
  if (score >= config.mediumRiskThreshold) return "medium";
  return "low";
}
