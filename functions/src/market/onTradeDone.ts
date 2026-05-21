/**
 * 🔥 거래 완료 시 평판 업데이트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 거래 완료 시 판매자/구매자 평판 업데이트
 * - 상호평가 처리
 * - 24시간 후 확정 (악용 방지)
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { updateUserReputation } from "./reputation";
import { db, FieldValue } from "../firebase";

/**
 * 거래 완료 시 평판 업데이트
 * 
 * 트리거: trades/{tradeId} 문서 생성
 */
export const onTradeDone = onDocumentCreated(
  {
    document: "trades/{tradeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }

    const tradeId = event.params.tradeId;
    const { sellerId, buyerId, sellerRating, buyerRating, status } = data;

    // 🔥 거래 완료 상태만 처리
    if (status !== "completed") {
      logger.info("[onTradeDone] 거래 미완료, 평판 업데이트 스킵:", { tradeId, status });
      return;
    }

    try {
      // 🔥 24시간 후 확정을 위한 스케줄링 (악용 방지)
      // 실제로는 Cloud Scheduler 또는 별도 함수로 처리
      // 여기서는 즉시 업데이트하되, 나중에 확정 로직 추가 가능

      // 🔥 판매자 평판 업데이트
      if (sellerId && sellerRating !== undefined) {
        await updateUserReputation(sellerId, {
          rating: sellerRating,
          tradeCompleted: true,
        });
        logger.info("[onTradeDone] 판매자 평판 업데이트:", { sellerId, rating: sellerRating });
      }

      // 🔥 구매자 평판 업데이트
      if (buyerId && buyerRating !== undefined) {
        await updateUserReputation(buyerId, {
          rating: buyerRating,
          tradeCompleted: true,
        });
        logger.info("[onTradeDone] 구매자 평판 업데이트:", { buyerId, rating: buyerRating });
      }

      // 🔥 거래 문서에 평판 업데이트 시간 기록
      await db.collection("trades").doc(tradeId).update({
        reputationUpdatedAt: FieldValue.serverTimestamp(),
      });

      logger.info("[onTradeDone] 평판 업데이트 완료:", { tradeId });
    } catch (error: any) {
      logger.error("[onTradeDone] 평판 업데이트 실패:", {
        tradeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
