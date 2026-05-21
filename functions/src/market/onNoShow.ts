/**
 * 🔥 노쇼 발생 시 평판 업데이트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 노쇼 신고 시 평판 즉시 반영
 * - 노쇼율 계산
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { updateUserReputation } from "./reputation";

/**
 * 노쇼 신고 시 평판 업데이트
 * 
 * 트리거: noShows/{noShowId} 문서 생성
 */
export const onNoShow = onDocumentCreated(
  {
    document: "noShows/{noShowId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }

    const noShowId = event.params.noShowId;
    const { userId, postId, confirmed } = data;

    // 🔥 확인된 노쇼만 처리
    if (!confirmed) {
      logger.info("[onNoShow] 미확인 노쇼, 평판 업데이트 스킵:", { noShowId });
      return;
    }

    if (!userId) {
      logger.warn("[onNoShow] userId 없음:", { noShowId });
      return;
    }

    try {
      // 🔥 노쇼 평판 업데이트
      await updateUserReputation(userId, {
        noShow: true,
      });

      logger.info("[onNoShow] 노쇼 평판 업데이트 완료:", {
        noShowId,
        userId,
        postId,
      });
    } catch (error: any) {
      logger.error("[onNoShow] 평판 업데이트 실패:", {
        noShowId,
        userId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
