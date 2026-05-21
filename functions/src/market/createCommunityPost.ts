/**
 * 🔥 커뮤니티 게시글 생성 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 리뷰, 질문, 모임, 스토리 게시글 생성
 * - 평판 부스트 처리
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { createCommunityPost, type CommunityPostType } from "./community";

/**
 * 커뮤니티 게시글 생성 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const createPost = httpsCallable(functions, 'createCommunityPost');
 * const result = await createPost({
 *   type: 'REVIEW',
 *   title: '좋은 거래였습니다',
 *   content: '...',
 * });
 * ```
 */
export const createCommunityPostCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { type, title, content, images, location, relatedPostId, tags } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!type || !title || !content) {
      throw new HttpsError(
        "invalid-argument",
        "type, title, content가 필요합니다."
      );
    }

    const validTypes: CommunityPostType[] = ["REVIEW", "QUESTION", "MEET", "STORY"];
    if (!validTypes.includes(type)) {
      throw new HttpsError(
        "invalid-argument",
        `유효하지 않은 게시글 타입: ${type}`
      );
    }

    try {
      logger.info("[createCommunityPost] 게시글 생성 시작:", {
        userId,
        type,
        title,
      });

      const postId = await createCommunityPost(
        type as CommunityPostType,
        userId,
        {
          title: title.trim(),
          content: content.trim(),
          images: images || [],
          location,
          relatedPostId,
          tags: tags || [],
        }
      );

      logger.info("[createCommunityPost] 게시글 생성 완료:", {
        postId,
        userId,
        type,
      });

      return {
        success: true,
        postId,
      };
    } catch (error: any) {
      logger.error("[createCommunityPost] 게시글 생성 실패:", {
        userId,
        type,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "게시글 생성 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
