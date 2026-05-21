/**
 * 🔥 마켓 리뷰 타입 정의
 */

export interface MarketReview {
  id: string;
  postId: string; // 게시글 ID
  sellerId: string; // 판매자 ID
  buyerId: string; // 구매자 ID
  rating: number; // 평점 (1~5)
  comment?: string; // 리뷰 내용
  createdAt: any; // Firestore Timestamp
  updatedAt?: any;
}

export interface ReviewStats {
  averageRating: number; // 평균 평점
  totalReviews: number; // 총 리뷰 수
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
