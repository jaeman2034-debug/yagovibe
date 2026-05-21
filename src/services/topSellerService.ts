/**
 * 🔥 상위 판매자 서비스
 * 
 * 신뢰 점수 높은 판매자 조회 및 필터링
 */

import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost } from "@/types/market";

/**
 * 🔥 상위 판매자 기준
 */
export interface TopSellerCriteria {
  minTrustScore: number; // 최소 신뢰 점수 (기본: 60)
  minCompletedSales: number; // 최소 완료 거래 수 (기본: 3)
  activeDays: number; // 최근 활동 일수 (기본: 30)
}

const DEFAULT_CRITERIA: TopSellerCriteria = {
  minTrustScore: 60,
  minCompletedSales: 3,
  activeDays: 30,
};

/**
 * 🔥 상위 판매자 ID 목록 조회
 */
export async function getTopSellerIds(criteria: TopSellerCriteria = DEFAULT_CRITERIA): Promise<string[]> {
  try {
    const usersQuery = query(
      collection(db, "users"),
      where("trustScore", ">=", criteria.minTrustScore),
      where("completedSales", ">=", criteria.minCompletedSales),
      orderBy("trustScore", "desc"),
      limit(50) // 상위 50명까지 조회
    );
    
    const usersSnap = await getDocs(usersQuery);
    const userIds: string[] = [];
    
    // 🔥 최근 활동 필터링 (30일 이내 게시글 작성)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - criteria.activeDays);
    
    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // 최근 게시글 확인
      const recentPostsQuery = query(
        collection(db, "market"),
        where("authorId", "==", userId),
        where("status", "in", ["active", "open", "reserved", "completed"]),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      
      const recentPostsSnap = await getDocs(recentPostsQuery);
      
      if (!recentPostsSnap.empty) {
        const latestPost = recentPostsSnap.docs[0].data();
        if (latestPost.createdAt) {
          const createdAt = latestPost.createdAt.toDate ? latestPost.createdAt.toDate() : new Date(latestPost.createdAt);
          if (createdAt >= thirtyDaysAgo) {
            userIds.push(userId);
          }
        } else {
          // createdAt이 없으면 일단 포함 (레거시 데이터)
          userIds.push(userId);
        }
      }
    }
    
    return userIds;
  } catch (err) {
    console.error("❌ 상위 판매자 ID 조회 실패:", err);
    return [];
  }
}

/**
 * 🔥 상위 판매자 게시글 조회
 */
export async function getTopSellerPosts({
  limitCount = 5,
  sport,
  category,
  criteria = DEFAULT_CRITERIA,
}: {
  limitCount?: number;
  sport?: string;
  category?: string;
  criteria?: TopSellerCriteria;
}): Promise<MarketPost[]> {
  try {
    // 🔥 1. 상위 판매자 ID 목록 조회
    const topSellerIds = await getTopSellerIds(criteria);
    
    if (topSellerIds.length === 0) {
      return [];
    }
    
    // 🔥 2. 상위 판매자들의 게시글 조회
    // Firestore의 `in` 쿼리는 최대 10개까지만 지원하므로 배치 처리
    const allPosts: MarketPost[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < topSellerIds.length; i += batchSize) {
      const batch = topSellerIds.slice(i, i + batchSize);
      
      let postsQuery = query(
        collection(db, "marketPosts"),
        where("authorId", "in", batch),
        where("status", "in", ["active", "open"]),
        orderBy("createdAt", "desc"),
        limit(limitCount * 2) // 여유있게 가져와서 필터링
      );
      
      // Sport 필터
      if (sport && sport !== "all") {
        postsQuery = query(postsQuery, where("sport", "==", sport));
      }
      
      // Category 필터
      if (category && category !== "all") {
        postsQuery = query(postsQuery, where("category", "==", category));
      }
      
      const postsSnap = await getDocs(postsQuery);
      const posts = postsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as MarketPost))
        .filter((post: MarketPost) => !post.isShadowBanned); // Shadow Ban 제외
      
      allPosts.push(...posts);
    }
    
    // 🔥 3. 판매자 신뢰 점수로 정렬 및 trustTier 추가
    // 각 게시글의 authorId에 해당하는 사용자 신뢰 점수 조회
    const postsWithTrustScore = await Promise.all(
      allPosts.map(async (post) => {
        try {
          const userRef = doc(db, "users", post.authorId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const trustScore = userData.trustScore || 0;
            const trustTier = userData.trustTier || "guest";
            // 게시글에 trustTier 정보 추가
            return { 
              post: { ...post, authorTrustTier: trustTier } as MarketPost, 
              trustScore 
            };
          }
          return { post, trustScore: 0 };
        } catch {
          return { post, trustScore: 0 };
        }
      })
    );
    
    // 신뢰 점수 내림차순 정렬
    postsWithTrustScore.sort((a, b) => b.trustScore - a.trustScore);
    
    // limit만큼 반환
    return postsWithTrustScore.slice(0, limitCount).map(item => item.post);
  } catch (err) {
    console.error("❌ 상위 판매자 게시글 조회 실패:", err);
    return [];
  }
}

/**
 * 🔥 게시글이 상위 판매자 글인지 확인
 */
export async function isTopSellerPost(postId: string): Promise<boolean> {
  try {
    const postRef = doc(db, "marketPosts", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return false;
    }
    
    const postData = postSnap.data();
    const authorId = postData.authorId;
    
    if (!authorId) {
      return false;
    }
    
    const userRef = doc(db, "users", authorId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    const trustScore = userData.trustScore || 0;
    const completedSales = userData.completedSales || 0;
    
    return trustScore >= DEFAULT_CRITERIA.minTrustScore && 
           completedSales >= DEFAULT_CRITERIA.minCompletedSales;
  } catch (err) {
    console.error("❌ 상위 판매자 확인 실패:", err);
    return false;
  }
}
