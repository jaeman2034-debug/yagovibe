/**
 * 🔥 커뮤니티 레이어 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 지역 모임, 사용 후기, 질문, 거래 인증
 * - 네트워크 효과 점화
 * - 평판 연결
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";
import { updateUserReputation } from "./reputation";

/**
 * 커뮤니티 게시글 타입
 */
export type CommunityPostType = "REVIEW" | "QUESTION" | "MEET" | "STORY";

/**
 * 커뮤니티 게시글 데이터
 */
export interface CommunityPost {
  id: string;
  type: CommunityPostType;
  authorId: string;
  title: string;
  content: string;
  images?: string[];
  location?: { lat: number; lng: number };
  relatedPostId?: string; // 관련 거래/매칭 게시글 ID
  tags?: string[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 리뷰 작성 시 평판 부스트
 */
export async function boostReputationFromReview(
  authorId: string,
  reviewType: "positive" | "neutral" | "negative" = "positive"
): Promise<void> {
  // 🔥 리뷰 타입에 따른 부스트 점수
  const boostScores = {
    positive: 0.2,
    neutral: 0.1,
    negative: -0.1,
  };

  const boostScore = boostScores[reviewType];

  // 🔥 평판 업데이트 (간접적 - 거래 완료로 간주)
  if (boostScore > 0) {
    await updateUserReputation(authorId, {
      tradeCompleted: true, // 리뷰 작성 = 거래 완료로 간주
    });
  }

  logger.info("[boostReputationFromReview] 평판 부스트:", {
    authorId,
    reviewType,
    boostScore,
  });
}

/**
 * 커뮤니티 게시글 생성
 */
export async function createCommunityPost(
  type: CommunityPostType,
  authorId: string,
  data: {
    title: string;
    content: string;
    images?: string[];
    location?: { lat: number; lng: number };
    relatedPostId?: string;
    tags?: string[];
  }
): Promise<string> {
  const postData = {
    type,
    authorId,
    title: data.title,
    content: data.content,
    images: data.images || [],
    location: data.location,
    relatedPostId: data.relatedPostId,
    tags: data.tags || [],
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const postRef = await db.collection("community").add(postData);
  const postId = postRef.id;

  // 🔥 리뷰 타입이면 평판 부스트
  if (type === "REVIEW") {
    await boostReputationFromReview(authorId, "positive");
  }

  logger.info("[createCommunityPost] 커뮤니티 게시글 생성:", {
    postId,
    type,
    authorId,
  });

  return postId;
}

/**
 * 커뮤니티 게시글 좋아요
 */
export async function likeCommunityPost(
  postId: string,
  userId: string
): Promise<void> {
  const postRef = db.collection("community").doc(postId);

  await db.runTransaction(async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      throw new Error(`Post ${postId} not found`);
    }

    const post = postSnap.data() as CommunityPost;
    const likedBy = (post as any).likedBy || [];

    if (likedBy.includes(userId)) {
      // 🔥 이미 좋아요한 경우 취소
      tx.update(postRef, {
        likeCount: FieldValue.increment(-1),
        likedBy: FieldValue.arrayRemove(userId),
      });
    } else {
      // 🔥 좋아요 추가
      tx.update(postRef, {
        likeCount: FieldValue.increment(1),
        likedBy: FieldValue.arrayUnion(userId),
      });
    }
  });

  logger.info("[likeCommunityPost] 좋아요 처리:", { postId, userId });
}

/**
 * 커뮤니티 게시글 조회수 증가
 */
export async function incrementViewCount(postId: string): Promise<void> {
  await db.collection("community").doc(postId).update({
    viewCount: FieldValue.increment(1),
  });
}
