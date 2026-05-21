/**
 * 🔥 에스크로 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 구매자 결제 → 에스크로 보관
 * - 만남/수령 → 확정
 * - 정산 처리
 * - 노쇼 방지
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";
import { updateUserReputation } from "./reputation";
import { chargeTradeFee } from "../partner/billing";

/**
 * 거래 상태
 */
export type TradeStatus =
  | "CREATED" // 거래 생성
  | "PAID" // 결제 완료 (에스크로 보관)
  | "MEET" // 만남 완료
  | "CONFIRMED" // 확정 (정산)
  | "CANCELLED"; // 취소

/**
 * 거래 데이터 구조
 */
export interface TradeData {
  id: string;
  postId: string; // market/{postId}
  sellerId: string;
  buyerId: string;
  amount: number; // 거래 금액
  deposit: number; // 보증금 (금액의 10%)
  status: TradeStatus;
  createdAt: Date;
  paidAt?: Date;
  meetAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  noShow?: boolean; // 노쇼 여부
  refundAmount?: number; // 환불 금액
}

/**
 * 거래 생성
 */
export async function createTrade(
  postId: string,
  sellerId: string,
  buyerId: string,
  amount: number
): Promise<string> {
  const deposit = Math.round(amount * 0.1); // 보증금 10%

  const tradeData = {
    postId,
    sellerId,
    buyerId,
    amount,
    deposit,
    status: "CREATED" as TradeStatus,
    createdAt: FieldValue.serverTimestamp(),
  };

  const tradeRef = await db.collection("trades").add(tradeData);
  const tradeId = tradeRef.id;

  logger.info("[createTrade] 거래 생성:", {
    tradeId,
    postId,
    sellerId,
    buyerId,
    amount,
    deposit,
  });

  return tradeId;
}

/**
 * 결제 완료 처리 (에스크로 보관)
 */
export async function confirmPayment(
  tradeId: string,
  paymentId: string
): Promise<void> {
  const tradeRef = db.collection("trades").doc(tradeId);
  const tradeSnap = await tradeRef.get();

  if (!tradeSnap.exists) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  const trade = tradeSnap.data() as TradeData;

  if (trade.status !== "CREATED") {
    throw new Error(`Invalid trade status: ${trade.status}`);
  }

  await tradeRef.update({
    status: "PAID",
    paymentId,
    paidAt: FieldValue.serverTimestamp(),
  });

  logger.info("[confirmPayment] 결제 완료 (에스크로 보관):", {
    tradeId,
    amount: trade.amount,
    deposit: trade.deposit,
  });
}

/**
 * 만남 완료 처리
 */
export async function confirmMeet(tradeId: string): Promise<void> {
  const tradeRef = db.collection("trades").doc(tradeId);
  const tradeSnap = await tradeRef.get();

  if (!tradeSnap.exists) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  const trade = tradeSnap.data() as TradeData;

  if (trade.status !== "PAID") {
    throw new Error(`Invalid trade status: ${trade.status}`);
  }

  await tradeRef.update({
    status: "MEET",
    meetAt: FieldValue.serverTimestamp(),
  });

  logger.info("[confirmMeet] 만남 완료:", { tradeId });
}

/**
 * 거래 확정 처리 (정산)
 */
export async function confirmTrade(
  tradeId: string,
  confirmedBy: "seller" | "buyer"
): Promise<void> {
  const tradeRef = db.collection("trades").doc(tradeId);

  const result = await db.runTransaction(async (tx) => {
    const tradeSnap = await tx.get(tradeRef);
    if (!tradeSnap.exists) {
      throw new Error(`Trade ${tradeId} not found`);
    }

    const trade = tradeSnap.data() as TradeData;

    if (trade.status !== "MEET") {
      throw new Error(`Invalid trade status: ${trade.status}`);
    }

    // 🔥 거래 확정
    tx.update(tradeRef, {
      status: "CONFIRMED",
      confirmedAt: FieldValue.serverTimestamp(),
      confirmedBy,
    });

    // 🔥 판매자 잔액 증가 (수수료 차감)
    const sellerRef = db.collection("users").doc(trade.sellerId);
    const sellerSnap = await tx.get(sellerRef);
    const sellerData = sellerSnap.data();
    const currentBalance = sellerData?.balance || 0;

    // 🔥 파트너 거래인 경우 수수료 차감
    let finalAmount = trade.amount;
    const partnerId = (trade as any).partnerId;
    if (partnerId) {
      const feeRate = 0.02; // 2%
      const fee = Math.round(trade.amount * feeRate);
      finalAmount = trade.amount - fee;
      // 수수료는 트랜잭션 밖에서 처리
    }

    tx.update(sellerRef, {
      balance: currentBalance + finalAmount,
    });

    return {
      partnerId: partnerId,
      amount: trade.amount,
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
    };
  });

  // 🔥 평판 업데이트 (트랜잭션 밖에서)
  await updateUserReputation(result.buyerId, {
    tradeCompleted: true,
  });
  await updateUserReputation(result.sellerId, {
    tradeCompleted: true,
  });

  // 🔥 파트너 거래 수수료 과금 (트랜잭션 밖에서)
  if (result.partnerId) {
    await chargeTradeFee(tradeId, result.partnerId, result.amount);
  }

  logger.info("[confirmTrade] 거래 확정 (정산 완료):", {
    tradeId,
    confirmedBy,
    partnerId: result.partnerId,
  });
}

/**
 * 거래 취소 처리
 */
export async function cancelTrade(
  tradeId: string,
  cancelledBy: "seller" | "buyer" | "system",
  reason?: string
): Promise<void> {
  const tradeRef = db.collection("trades").doc(tradeId);

  await db.runTransaction(async (tx) => {
    const tradeSnap = await tx.get(tradeRef);
    if (!tradeSnap.exists) {
      throw new Error(`Trade ${tradeId} not found`);
    }

    const trade = tradeSnap.data() as TradeData;

    if (trade.status === "CONFIRMED" || trade.status === "CANCELLED") {
      throw new Error(`Cannot cancel trade in status: ${trade.status}`);
    }

    // 🔥 거래 취소
    tx.update(tradeRef, {
      status: "CANCELLED",
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy,
      cancelReason: reason,
    });

    // 🔥 환불 처리 (결제 완료 상태였다면)
    if (trade.status === "PAID" || trade.status === "MEET") {
      const refundAmount = trade.amount;
      tx.update(tradeRef, {
        refundAmount,
      });

      // 🔥 구매자 잔액 증가 (환불)
      const buyerRef = db.collection("users").doc(trade.buyerId);
      const buyerSnap = await tx.get(buyerRef);
      const buyerData = buyerSnap.data();
      const currentBalance = buyerData?.balance || 0;

      tx.update(buyerRef, {
        balance: currentBalance + refundAmount,
      });
    }
  });

  logger.info("[cancelTrade] 거래 취소:", {
    tradeId,
    cancelledBy,
    reason,
  });
}
