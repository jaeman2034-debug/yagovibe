/**
 * 🔥 통합 거래 처리기 (실전 배포 패키지)
 * 
 * 역할:
 * - 거래 생성 시 에스크로 필요 여부 자동 판단
 * - 인증 상태 체크
 * - 거래 상태 관리
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";
import { checkEscrowRequired, EscrowCheckResult } from "./coreStabilityEngine";
import { checkChatPermission } from "./coreStabilityEngine";

/**
 * 거래 생성 시 통합 처리
 */
export const onTradeCreated = onDocumentCreated(
  {
    document: "trades/{tradeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const trade = event.data?.data();
    if (!trade) return;

    const tradeId = event.params.tradeId;
    const buyerId = trade.buyerId;
    const sellerId = trade.sellerId;
    const postId = trade.postId;
    const price = trade.amount || trade.price || 0;

    logger.info("[onTradeCreated] 거래 생성 통합 처리 시작:", {
      tradeId,
      buyerId,
      sellerId,
      postId,
      price,
    });

    try {
      // ============================================
      // 1. 구매자 채팅 권한 체크
      // ============================================
      const buyerPermission = await checkChatPermission(buyerId);
      
      if (!buyerPermission.canChat) {
        logger.warn("[onTradeCreated] 구매자 채팅 권한 없음:", {
          tradeId,
          buyerId,
          reason: buyerPermission.reason,
        });
        
        // 🔥 거래 취소 처리
        await db.collection("trades").doc(tradeId).update({
          status: "CANCELLED",
          cancelledBy: "system",
          cancelReason: `구매자 인증 미완료: ${buyerPermission.reason}`,
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        return;
      }

      // ============================================
      // 2. 판매자 채팅 권한 체크
      // ============================================
      const sellerPermission = await checkChatPermission(sellerId);
      
      if (!sellerPermission.canChat) {
        logger.warn("[onTradeCreated] 판매자 채팅 권한 없음:", {
          tradeId,
          sellerId,
          reason: sellerPermission.reason,
        });
        
        // 🔥 거래 취소 처리
        await db.collection("trades").doc(tradeId).update({
          status: "CANCELLED",
          cancelledBy: "system",
          cancelReason: `판매자 인증 미완료: ${sellerPermission.reason}`,
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        return;
      }

      // ============================================
      // 3. 에스크로 필요 여부 체크
      // ============================================
      const escrowCheck: EscrowCheckResult = await checkEscrowRequired({
        price,
        buyerId,
        sellerId,
        postId,
      });

      const updates: Record<string, any> = {
        escrowRequired: escrowCheck.required,
        escrowReason: escrowCheck.reason,
        escrowRiskScore: escrowCheck.riskScore,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 🔥 에스크로 필수인 경우 플래그 설정
      if (escrowCheck.required) {
        updates.escrowForced = true;
        updates.escrowForcedAt = FieldValue.serverTimestamp();
      }

      await db.collection("trades").doc(tradeId).update(updates);

      logger.info("[onTradeCreated] 거래 생성 통합 처리 완료:", {
        tradeId,
        escrowRequired: escrowCheck.required,
        escrowReason: escrowCheck.reason,
        escrowRiskScore: escrowCheck.riskScore,
      });
    } catch (error: any) {
      logger.error("[onTradeCreated] 거래 생성 통합 처리 실패:", {
        tradeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
