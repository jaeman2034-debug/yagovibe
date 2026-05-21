/**
 * 🔥 혼합 피드 엔진 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 추천상품 60% + 커뮤니티 30% + 광고 10%
 * - 네트워크 효과 극대화
 */

import { logger } from "firebase-functions/v2";
import { db, Timestamp } from "../firebase";
import { generateFeed } from "./feedEngine";
import { getTargetedAds } from "./ads";
import { mergeRankings } from "./adRanking";

/**
 * 피드 아이템 타입
 */
export type FeedItemType = "market" | "community" | "ad";

/**
 * 혼합 피드 아이템
 */
export interface MixedFeedItem {
  type: FeedItemType;
  id: string;
  data: any;
  score: number;
}

/**
 * 커뮤니티 게시글 조회
 */
async function getCommunityPosts(limit: number = 10): Promise<MixedFeedItem[]> {
  const sevenDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  const postsSnap = await db
    .collection("community")
    .where("createdAt", ">=", sevenDaysAgo)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const items: MixedFeedItem[] = [];

  for (const postDoc of postsSnap.docs) {
    const postData = postDoc.data();

    // 🔥 점수 계산 (좋아요 + 조회수 + 댓글)
    const engagementScore =
      (postData.likeCount || 0) * 2 +
      (postData.viewCount || 0) * 0.1 +
      (postData.commentCount || 0) * 3;

    items.push({
      type: "community",
      id: postDoc.id,
      data: {
        ...postData,
        id: postDoc.id,
      },
      score: engagementScore,
    });
  }

  return items;
}

/**
 * 광고 아이템 조회
 */
async function getAdItems(
  userLocation?: { lat: number; lng: number },
  category?: string,
  limit: number = 2
): Promise<MixedFeedItem[]> {
  const ads = await getTargetedAds(userLocation, category, limit);

  return ads.map((ad) => ({
    type: "ad" as FeedItemType,
    id: ad.id,
    data: ad,
    score: ad.cpc, // CPC 기반 점수
  }));
}

/**
 * 혼합 피드 생성
 */
export async function generateMixedFeed(
  userId: string,
  limit: number = 20,
  userLocation?: { lat: number; lng: number },
  category?: string
): Promise<MixedFeedItem[]> {
  // 🔥 각 타입별 비율 계산
  const marketCount = Math.floor(limit * 0.6); // 60%
  const communityCount = Math.floor(limit * 0.3); // 30%
  const adCount = Math.floor(limit * 0.1); // 10%

  // 🔥 추천상품 피드
  const marketFeed = await generateFeed(userId, marketCount);
  const marketItems: MixedFeedItem[] = marketFeed.map((item) => ({
    type: "market",
    id: item.post.id,
    data: item.post,
    score: item.score,
  }));

  // 🔥 커뮤니티 게시글
  const communityItems = await getCommunityPosts(communityCount);

  // 🔥 광고 아이템 (지역 타겟팅)
  const adItems = await getAdItems(userLocation, category, adCount);

  // 🔥 랭킹 결합 (organic 0.7 + adBid 0.3)
  const rankedItems = mergeRankings(
    [...marketItems, ...communityItems],
    adItems.map((item) => item.data)
  );

  // 🔥 셔플 (다양성 확보)
  const shuffled = rankedItems.slice(0, limit);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  logger.info("[generateMixedFeed] 혼합 피드 생성 완료:", {
    userId,
    marketCount: marketItems.length,
    communityCount: communityItems.length,
    adCount: adItems.length,
    totalCount: shuffled.length,
  });

  return shuffled;
}
