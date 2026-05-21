/**
 * 🔥 매칭 종료 시 평판 업데이트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 매칭 완료/취소 시 참여자 평판 업데이트
 * - 노쇼 감지 및 평판 반영
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { updateUserReputation } from "./reputation";
import { db } from "../firebase";

/**
 * 매칭 종료 시 평판 업데이트
 * 
 * 트리거: market/{postId} 문서의 status 변경 (completed/cancelled)
 */
export const onMatchEnd = onDocumentUpdated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const postId = event.params.postId;

    // 🔥 매칭 완료/취소 상태 변경만 처리
    const statusChanged = before.status !== after.status;
    const isCompleted = after.status === "completed" || after.status === "cancelled";

    if (!statusChanged || !isCompleted) {
      return;
    }

    try {
      // 🔥 참여자 목록 조회
      const joinsSnap = await db
        .collection("market")
        .doc(postId)
        .collection("joins")
        .where("status", "==", "approved")
        .get();

      const participants = joinsSnap.docs.map((doc) => ({
        userId: doc.id,
        status: doc.data().status,
        noShow: doc.data().noShow || false,
      }));

      // 🔥 각 참여자 평판 업데이트
      for (const participant of participants) {
        try {
          if (participant.noShow) {
            // 🔥 노쇼 처리
            await updateUserReputation(participant.userId, {
              noShow: true,
            });
            logger.info("[onMatchEnd] 노쇼 평판 업데이트:", {
              postId,
              userId: participant.userId,
            });
          } else {
            // 🔥 정상 참여 (거래 완료로 간주)
            await updateUserReputation(participant.userId, {
              tradeCompleted: true,
            });
            logger.info("[onMatchEnd] 정상 참여 평판 업데이트:", {
              postId,
              userId: participant.userId,
            });
          }
        } catch (error: any) {
          logger.error("[onMatchEnd] 참여자 평판 업데이트 실패:", {
            postId,
            userId: participant.userId,
            error: error.message,
          });
        }
      }

      logger.info("[onMatchEnd] 매칭 종료 평판 업데이트 완료:", {
        postId,
        participantsCount: participants.length,
      });
    } catch (error: any) {
      logger.error("[onMatchEnd] 평판 업데이트 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
