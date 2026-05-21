/**
 * 🔥 마켓 리뷰 서비스
 * 
 * 리뷰 작성, 조회, 통계 계산
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  runTransaction 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketReview, ReviewStats } from "@/types/review";

/**
 * 🔥 리뷰 작성
 * 
 * 조건:
 * - post.status == "completed"
 * - buyerId 또는 sellerId 일치
 * - 동일 post에 중복 리뷰 방지
 */
export async function createMarketReview({
  postId,
  sellerId,
  buyerId,
  rating,
  comment,
  userId,
}: {
  postId: string;
  sellerId: string;
  buyerId: string;
  rating: number;
  comment?: string;
  userId: string;
}): Promise<string> {
  // 🔥 검증: rating 범위
  if (rating < 1 || rating > 5) {
    throw new Error("평점은 1~5 사이여야 합니다.");
  }

  // 🔥 검증: buyerId 또는 sellerId 일치
  if (userId !== buyerId && userId !== sellerId) {
    throw new Error("구매자 또는 판매자만 리뷰를 작성할 수 있습니다.");
  }

  // 🔥 검증: 게시글 상태 확인
  const postRef = doc(db, "market", postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    throw new Error("게시글을 찾을 수 없습니다.");
  }

  const postData = postSnap.data();
  if (postData.status !== "completed" && postData.status !== "done") {
    throw new Error("거래가 완료된 상품에만 리뷰를 작성할 수 있습니다.");
  }

  // 🔥 중복 리뷰 방지: 동일 postId + userId 조합 확인
  const existingReviewQuery = query(
    collection(db, "marketReviews"),
    where("postId", "==", postId),
    where(userId === buyerId ? "buyerId" : "sellerId", "==", userId)
  );
  const existingReviews = await getDocs(existingReviewQuery);
  
  if (!existingReviews.empty) {
    throw new Error("이미 리뷰를 작성하셨습니다.");
  }

  // 🔥 리뷰 작성
  const reviewData = {
    postId,
    sellerId,
    buyerId,
    rating,
    comment: comment?.trim() || undefined,
    createdAt: serverTimestamp(),
  };

  const reviewRef = await addDoc(collection(db, "marketReviews"), reviewData);
  
  console.log("✅ 리뷰 작성 완료:", { reviewId: reviewRef.id, postId, rating });

  return reviewRef.id;
}

/**
 * 🔥 판매자 리뷰 통계 조회
 */
export async function getSellerReviewStats(sellerId: string): Promise<ReviewStats> {
  const reviewsQuery = query(
    collection(db, "marketReviews"),
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc")
  );
  
  const reviewsSnap = await getDocs(reviewsQuery);
  const reviews = reviewsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as MarketReview[];

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  return {
    averageRating: Math.round(averageRating * 10) / 10, // 소수점 1자리
    totalReviews: reviews.length,
    ratingDistribution,
  };
}

/**
 * 🔥 판매자 최근 리뷰 조회
 */
export async function getSellerRecentReviews(
  sellerId: string,
  limitCount: number = 3
): Promise<MarketReview[]> {
  const reviewsQuery = query(
    collection(db, "marketReviews"),
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const reviewsSnap = await getDocs(reviewsQuery);
  return reviewsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as MarketReview[];
}

/**
 * 🔥 게시글 리뷰 조회
 */
export async function getPostReviews(postId: string): Promise<MarketReview[]> {
  const reviewsQuery = query(
    collection(db, "marketReviews"),
    where("postId", "==", postId),
    orderBy("createdAt", "desc")
  );
  
  const reviewsSnap = await getDocs(reviewsQuery);
  return reviewsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as MarketReview[];
}

/**
 * 🔥 사용자가 리뷰 작성 가능한지 확인
 */
export async function canUserWriteReview(
  postId: string,
  userId: string
): Promise<{ canWrite: boolean; reason?: string }> {
  try {
    // 게시글 조회
    const postRef = doc(db, "market", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return { canWrite: false, reason: "게시글을 찾을 수 없습니다." };
    }

    const postData = postSnap.data();
    
    // 상태 확인
    if (postData.status !== "completed" && postData.status !== "done") {
      return { canWrite: false, reason: "거래가 완료된 상품에만 리뷰를 작성할 수 있습니다." };
    }

    // 권한 확인
    const sellerId = postData.authorId || postData.sellerId;
    const buyerId = userId; // 채팅방에서 buyerId 확인 필요
    
    if (userId !== sellerId && userId !== buyerId) {
      return { canWrite: false, reason: "구매자 또는 판매자만 리뷰를 작성할 수 있습니다." };
    }

    // 중복 확인
    const existingReviewQuery = query(
      collection(db, "marketReviews"),
      where("postId", "==", postId),
      where(userId === buyerId ? "buyerId" : "sellerId", "==", userId)
    );
    const existingReviews = await getDocs(existingReviewQuery);
    
    if (!existingReviews.empty) {
      return { canWrite: false, reason: "이미 리뷰를 작성하셨습니다." };
    }

    return { canWrite: true };
  } catch (error: any) {
    console.error("❌ 리뷰 작성 가능 여부 확인 실패:", error);
    return { canWrite: false, reason: "확인 중 오류가 발생했습니다." };
  }
}
