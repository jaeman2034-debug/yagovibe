/**
 * 🔥 매칭 참여 알림 테스트 함수
 * 
 * 사용법:
 * ```bash
 * firebase functions:call testMarketJoinNotifications --data '{"userId":"test_user_123","postId":"test_post_456"}'
 * ```
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { admin as firebaseAdmin } from "../firebaseAdmin";
import { HttpsError } from "firebase-functions/v2/https";
import { notifyMarketJoin } from "./notifyMarketJoin";

const db = firebaseAdmin.firestore();

/**
 * 테스트: 승인 알림 발송
 */
export const testMarketJoinNotifications = onCall(
  {
    region: "asia-northeast3",
  },
  async (request) => {
    // 🔥 인증 체크 (선택사항)
    // if (!request.auth) {
    //   throw new HttpsError("unauthenticated", "인증 필요");
    // }

    const { userId, postId, testType = "approved" } = request.data;

    if (!userId || !postId) {
      throw new HttpsError(
        "invalid-argument",
        "userId와 postId가 필요합니다"
      );
    }

    try {
      // 🔥 게시글 정보 조회
      const postSnap = await db.doc(`market/${postId}`).get();
      if (!postSnap.exists) {
        throw new HttpsError(
          "not-found",
          "게시글을 찾을 수 없습니다"
        );
      }

      const post = postSnap.data()!;
      const postTitle = post.title || "테스트 매칭";

      // 🔥 테스트 타입별 알림 발송
      if (testType === "approved") {
        const chatRoomId = `${postId}_${userId}_${post.authorId}`;
        await notifyMarketJoin(userId, {
          type: "JOIN_APPROVED",
          title: "매칭 참여 승인 (테스트)",
          body: `"${postTitle}" 매칭 참여가 승인되었습니다. 채팅방이 열렸습니다.`,
          postId,
          chatRoomId,
        });
      } else if (testType === "rejected_full") {
        await notifyMarketJoin(userId, {
          type: "JOIN_REJECTED_FULL",
          title: "매칭 참여 자동 거절 (테스트)",
          body: `"${postTitle}" 매칭이 모집 인원이 마감되어 자동 거절되었습니다.`,
          postId,
        });
      } else if (testType === "rejected") {
        await notifyMarketJoin(userId, {
          type: "JOIN_REJECTED",
          title: "매칭 참여 거절 (테스트)",
          body: `"${postTitle}" 매칭 참여가 거절되었습니다.`,
          postId,
        });
      }

      return {
        success: true,
        message: `${testType} 알림 발송 완료`,
        userId,
        postId,
      };
    } catch (error: any) {
      logger.error("[testMarketJoinNotifications] 테스트 실패:", error);
      throw new HttpsError(
        "internal",
        `테스트 실패: ${error.message}`
      );
    }
  }
);
