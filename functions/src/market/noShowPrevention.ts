/**
 * 🔥 노쇼 방지 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 보증금 10% 자동 차감
 * - 30분 대기 규칙
 * - 자동 환불 처리
 * - 노쇼 패널티 적용
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { updateUserReputation } from "./reputation";
import { cancelTrade } from "./escrow";

/**
 * 노쇼 감지 및 패널티 처리
 */
export async function handleNoShow(
  tradeId: string,
  noShowUserId: string
): Promise<void> {
  const tradeRef = db.collection("trades").doc(tradeId);

  await db.runTransaction(async (tx) => {
    const tradeSnap = await tx.get(tradeRef);
    if (!tradeSnap.exists) {
      throw new Error(`Trade ${tradeId} not found`);
    }

    const trade = tradeSnap.data() as any;

    if (trade.status === "CONFIRMED" || trade.status === "CANCELLED") {
      throw new Error(`Cannot handle no-show for trade in status: ${trade.status}`);
    }

    // 🔥 노쇼 표시
    tx.update(tradeRef, {
      noShow: true,
      noShowUserId,
      noShowAt: FieldValue.serverTimestamp(),
    });

    // 🔥 보증금 차감 (10%)
    const penaltyAmount = trade.deposit; // 이미 금액의 10%
    const refundAmount = trade.amount - penaltyAmount;

    // 🔥 구매자에게 부분 환불 (보증금 제외)
    if (noShowUserId === trade.buyerId) {
      const buyerRef = db.collection("users").doc(trade.buyerId);
      const buyerSnap = await tx.get(buyerRef);
      const buyerData = buyerSnap.data();
      const currentBalance = buyerData?.balance || 0;

      tx.update(buyerRef, {
        balance: currentBalance + refundAmount,
      });

      // 🔥 판매자에게 보증금 지급
      const sellerRef = db.collection("users").doc(trade.sellerId);
      const sellerSnap = await tx.get(sellerRef);
      const sellerData = sellerSnap.data();
      const sellerBalance = sellerData?.balance || 0;

      tx.update(sellerRef, {
        balance: sellerBalance + penaltyAmount,
      });
    } else if (noShowUserId === trade.sellerId) {
      // 🔥 판매자 노쇼 시 전체 환불
      const buyerRef = db.collection("users").doc(trade.buyerId);
      const buyerSnap = await tx.get(buyerRef);
      const buyerData = buyerSnap.data();
      const currentBalance = buyerData?.balance || 0;

      tx.update(buyerRef, {
        balance: currentBalance + trade.amount,
      });
    }

    // 🔥 노쇼 평판 업데이트 (트랜잭션 밖에서 처리)
    // await updateUserReputation(noShowUserId, { noShow: true });
  });

  // 🔥 노쇼 평판 업데이트 (트랜잭션 밖에서)
  await updateUserReputation(noShowUserId, {
    noShow: true,
  });

  // 🔥 거래 취소 처리 (트랜잭션 밖에서)
  await cancelTrade(tradeId, "system", "노쇼로 인한 자동 취소");

  // 🔥 노쇼 기록 저장
  const tradeSnap = await tradeRef.get();
  const tradeData = tradeSnap.data() as any;
  await db.collection("noShows").add({
    tradeId,
    userId: noShowUserId,
    postId: tradeData?.postId || "",
    confirmed: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 🔥 로깅용 trade 데이터 조회
  const tradeSnapForLog = await tradeRef.get();
  const tradeDataForLog = tradeSnapForLog.data() as any;

  logger.info("[handleNoShow] 노쇼 처리 완료:", {
    tradeId,
    noShowUserId,
    penaltyAmount: tradeDataForLog?.deposit || 0,
  });
}

/**
 * 30분 대기 규칙 체크 (스케줄러에서 호출)
 */
export async function checkWaitingTime(): Promise<void> {
  const thirtyMinutesAgo = Timestamp.fromDate(
    new Date(Date.now() - 30 * 60 * 1000)
  );

  // 🔥 PAID 상태이고 30분 이상 지난 거래 조회
  const waitingTrades = await db
    .collection("trades")
    .where("status", "==", "PAID")
    .where("paidAt", "<=", thirtyMinutesAgo)
    .get();

  for (const tradeDoc of waitingTrades.docs) {
    const trade = tradeDoc.data() as any;

    // 🔥 만남 확인이 없으면 노쇼 처리
    if (!trade.meetAt) {
      // 🔥 구매자 노쇼로 간주 (판매자는 대기 중)
      await handleNoShow(tradeDoc.id, trade.buyerId);
      logger.info("[checkWaitingTime] 구매자 노쇼 처리:", {
        tradeId: tradeDoc.id,
        buyerId: trade.buyerId,
      });
    }
  }

  logger.info("[checkWaitingTime] 대기 시간 체크 완료:", {
    checkedCount: waitingTrades.size,
  });
}
