/**
 * 🔥 추천 피드 엔진 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 개인화 추천 점수 계산
 * - 관심유사도 + 거리 + 평판 + 최신성 + 전환율
 * - 성장 플라이휠 구축
 */

import { logger } from "firebase-functions/v2";
import { db, Timestamp } from "../firebase";
import { getUserReputation } from "./reputation";

/**
 * 추천 점수 계산 가중치
 */
const SCORE_WEIGHTS = {
  interestSimilarity: 0.4, // 관심유사도
  distance: 0.2, // 거리
  reputation: 0.2, // 평판
  recency: 0.1, // 최신성
  conversionRate: 0.1, // 전환율
};

/**
 * 사용자 프로필 데이터
 */
interface UserProfile {
  uid: string;
  interests?: string[]; // 관심 키워드
  location?: { lat: number; lng: number }; // 위치
  reputation?: { score: number }; // 평판 점수
  clickHistory?: string[]; // 클릭한 게시글 ID
  chatHistory?: string[]; // 채팅한 게시글 ID
  favoriteHistory?: string[]; // 찜한 게시글 ID
  tradeHistory?: string[]; // 거래한 게시글 ID
}

/**
 * 게시글 데이터
 */
interface PostData {
  id: string;
  title: string;
  category: string;
  location?: { lat: number; lng: number };
  createdAt: Date;
  viewCount: number;
  chatCount: number;
  favoriteCount: number;
  tradeCount: number;
  embedding?: number[]; // 임베딩 벡터
  authorReputation?: number; // 작성자 평판 점수
}

/**
 * 관심유사도 계산 (임베딩 기반)
 */
function calculateInterestSimilarity(
  userInterests: string[],
  postEmbedding: number[] | undefined,
  userEmbedding: number[] | undefined
): number {
  if (!postEmbedding || !userEmbedding) {
    return 0.5; // 기본값
  }

  // 🔥 코사인 유사도 계산
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < postEmbedding.length; i++) {
    dotProduct += postEmbedding[i] * userEmbedding[i];
    normA += postEmbedding[i] * postEmbedding[i];
    normB += userEmbedding[i] * userEmbedding[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * 거리 점수 계산 (가까울수록 높음)
 */
function calculateDistanceScore(
  userLocation: { lat: number; lng: number } | undefined,
  postLocation: { lat: number; lng: number } | undefined,
  maxDistance: number = 50 // 최대 50km
): number {
  if (!userLocation || !postLocation) {
    return 0.5; // 위치 정보 없으면 중간 점수
  }

  // 🔥 하버사인 공식으로 거리 계산 (km)
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((postLocation.lat - userLocation.lat) * Math.PI) / 180;
  const dLon = ((postLocation.lng - userLocation.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLocation.lat * Math.PI) / 180) *
      Math.cos((postLocation.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // 🔥 거리 점수 (가까울수록 높음, 최대 50km)
  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * 최신성 점수 계산
 */
function calculateRecencyScore(createdAt: Date): number {
  const now = new Date();
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // 🔥 7일 이내면 1.0, 30일 이상이면 0.0
  if (daysSinceCreation <= 7) {
    return 1.0;
  } else if (daysSinceCreation >= 30) {
    return 0.0;
  } else {
    return 1.0 - (daysSinceCreation - 7) / 23;
  }
}

/**
 * 전환율 점수 계산
 */
function calculateConversionRateScore(post: PostData): number {
  const totalInteractions = post.viewCount + post.chatCount + post.favoriteCount;
  if (totalInteractions === 0) {
    return 0.5; // 기본값
  }

  // 🔥 채팅/찜/거래 비율이 높을수록 높은 점수
  const conversionRate =
    (post.chatCount * 2 + post.favoriteCount * 1.5 + post.tradeCount * 3) /
    totalInteractions;

  return Math.min(1.0, conversionRate);
}

/**
 * 종합 추천 점수 계산
 */
export function calculateFeedScore(
  user: UserProfile,
  post: PostData,
  userEmbedding?: number[]
): number {
  // 🔥 관심유사도
  const interestScore = calculateInterestSimilarity(
    user.interests || [],
    post.embedding,
    userEmbedding
  );

  // 🔥 거리 점수
  const distanceScore = calculateDistanceScore(user.location, post.location);

  // 🔥 평판 점수
  const reputationScore = (post.authorReputation || 0) / 100; // 0 ~ 1

  // 🔥 최신성 점수
  const recencyScore = calculateRecencyScore(post.createdAt);

  // 🔥 전환율 점수
  const conversionScore = calculateConversionRateScore(post);

  // 🔥 종합 점수 계산
  let totalScore =
    interestScore * SCORE_WEIGHTS.interestSimilarity +
    distanceScore * SCORE_WEIGHTS.distance +
    reputationScore * SCORE_WEIGHTS.reputation +
    recencyScore * SCORE_WEIGHTS.recency +
    conversionScore * SCORE_WEIGHTS.conversionRate;

  // 🔥 30분 부스트 적용
  const now = new Date();
  const boostEndTime = (post as any).boostEndTime?.toDate?.() || 
    ((post as any).boostEndTime?.seconds ? 
      new Date((post as any).boostEndTime.seconds * 1000) : null);

  if ((post as any).boostActive && boostEndTime && now < boostEndTime) {
    const boostMultiplier = 1 + ((post as any).boostWeight || 0.8); // 1.8배 (강화)
    const originalScore = totalScore;
    totalScore = totalScore * boostMultiplier;
    
    logger.info("[calculateFeedScore] 부스트 적용:", {
      postId: post.id,
      originalScore,
      boostedScore: totalScore,
      boostWeight: (post as any).boostWeight,
    });
  }

  // 🔥 가격 이상 탐지 페널티 적용 (-30%)
  if ((post as any).priceAnomaly === true && (post as any).exposurePenalty) {
    const penalty = (post as any).exposurePenalty || 0.3; // 기본 -30%
    const originalScore = totalScore;
    totalScore = totalScore * (1 - penalty); // -30% 감소
    
    logger.info("[calculateFeedScore] 가격 이상 페널티 적용:", {
      postId: post.id,
      originalScore,
      penalizedScore: totalScore,
      penalty,
    });
  }

  // 🔥 인증 완료 시 재노출 +30% (대면/실명 인증) - 25% → 30%로 상향
  if ((post as any).authorFaceToFaceVerified === true || 
      (post as any).authorRealNameVerified === true ||
      ((post as any).authorTrustTier && 
       ((post as any).authorTrustTier === "verified" || (post as any).authorTrustTier === "host"))) {
    const verificationBoost = 0.30; // +30% (25% → 30%로 상향)
    const originalScore = totalScore;
    totalScore = totalScore * (1 + verificationBoost); // +30% 증가
    
    logger.info("[calculateFeedScore] 인증 완료 부스트 적용:", {
      postId: post.id,
      originalScore,
      boostedScore: totalScore,
      verificationBoost,
    });
  }

  return totalScore;
}

/**
 * 사용자 추천 피드 생성
 */
export async function generateFeed(
  userId: string,
  limit: number = 20
): Promise<Array<{ post: PostData; score: number }>> {
  // 🔥 사용자 프로필 조회
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    throw new Error(`User ${userId} not found`);
  }

  const userData = userSnap.data();
  const userProfile: UserProfile = {
    uid: userId,
    interests: userData?.interests || [],
    location: userData?.location,
    reputation: userData?.reputation,
    clickHistory: userData?.clickHistory || [],
    chatHistory: userData?.chatHistory || [],
    favoriteHistory: userData?.favoriteHistory || [],
    tradeHistory: userData?.tradeHistory || [],
  };

  // 🔥 사용자 임베딩 조회 (관심사 기반)
  const userEmbedding = userData?.embedding as number[] | undefined;

  // 🔥 최근 게시글 조회 (최근 7일)
  const sevenDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  const postsSnap = await db
    .collection("market")
    .where("status", "==", "open")
    .where("createdAt", ">=", sevenDaysAgo)
    .limit(100) // 성능을 위해 제한
    .get();

  const scoredPosts: Array<{ post: PostData; score: number }> = [];

  for (const postDoc of postsSnap.docs) {
    const postData = postDoc.data();

    // 🔥 작성자 평판 조회
    const authorReputation = await getUserReputation(postData.authorId);
    const authorReputationScore = authorReputation?.score || 0;

    const post: PostData = {
      id: postDoc.id,
      title: postData.title || "",
      category: postData.category || "",
      location: postData.location,
      createdAt: postData.createdAt?.toDate() || new Date(),
      viewCount: postData.viewCount || 0,
      chatCount: postData.chatCount || 0,
      favoriteCount: postData.favoriteCount || 0,
      tradeCount: postData.tradeCount || 0,
      embedding: postData.embedding as number[] | undefined,
      authorReputation: authorReputationScore,
    };

    // 🔥 추천 점수 계산
    const score = calculateFeedScore(userProfile, post, userEmbedding);

    scoredPosts.push({ post, score });
  }

  // 🔥 점수 순으로 정렬
  scoredPosts.sort((a, b) => b.score - a.score);

  logger.info("[generateFeed] 피드 생성 완료:", {
    userId,
    totalPosts: scoredPosts.length,
    returnedPosts: Math.min(scoredPosts.length, limit),
  });

  return scoredPosts.slice(0, limit);
}
