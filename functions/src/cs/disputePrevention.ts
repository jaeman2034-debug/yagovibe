/**
 * 🔥 분쟁 사전 차단 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 분쟁 예측 규칙 적용
 * - 에스크로 강제 조건 체크
 * - 거래 전 경고 배너 표시
 * - 분쟁 확률 40%↓ 목표
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";
import { predictDisputeRisk, processCSWorkflow } from "./disputePredictionModel";

// 🔥 분쟁 예측 임계값
const DISPUTE_RISK_THRESHOLD = 0.4; // 분쟁 확률 40% 이상
const ESCROW_FORCE_THRESHOLD = 0.6; // 에스크로 강제 확률 60% 이상
const WARNING_THRESHOLD = 0.3; // 경고 배너 표시 확률 30% 이상

/**
 * 분쟁 예측 규칙
 */
interface DisputeRiskFactors {
  priceAnomaly: boolean; // 가격 이상
  lowReputation: boolean; // 저평판
  noShowHistory: boolean; // 노쇼 이력
  disputeHistory: boolean; // 분쟁 이력
  repeatedDisputeHistory: boolean; // 반복 분쟁 이력 (전면 강제)
  unverifiedUser: boolean; // 미인증 사용자
  highPrice: boolean; // 고가 거래
  newUser: boolean; // 신규 사용자
}

/**
 * 분쟁 확률 계산
 */
async function calculateDisputeRisk(
  postId: string,
  buyerId: string,
  sellerId: string,
  price: number
): Promise<{ riskScore: number; factors: DisputeRiskFactors }> {
  const factors: DisputeRiskFactors = {
    priceAnomaly: false,
    lowReputation: false,
    noShowHistory: false,
    disputeHistory: false,
    unverifiedUser: false,
    highPrice: false,
    newUser: false,
  };

  let riskScore = 0;

  // 🔥 1. 가격 이상 체크
  const postSnap = await db.collection("market").doc(postId).get();
  const post = postSnap.data();
  if (post?.priceAnomaly === true) {
    factors.priceAnomaly = true;
    riskScore += 0.15; // 15% 증가
  }

  // 🔥 2. 저평판 체크
  const buyerSnap = await db.collection("users").doc(buyerId).get();
  const sellerSnap = await db.collection("users").doc(sellerId).get();
  
  const buyerReputation = buyerSnap.data()?.reputation || 0;
  const sellerReputation = sellerSnap.data()?.reputation || 0;

  if (buyerReputation < 3.0 || sellerReputation < 3.0) {
    factors.lowReputation = true;
    riskScore += 0.20; // 20% 증가
  }

  // 🔥 3. 노쇼 이력 체크
  const buyerNoShowCount = await db
    .collection("trades")
    .where("buyerId", "==", buyerId)
    .where("status", "==", "NO_SHOW")
    .get();

  const sellerNoShowCount = await db
    .collection("trades")
    .where("sellerId", "==", sellerId)
    .where("status", "==", "NO_SHOW")
    .get();

  if (buyerNoShowCount.size > 0 || sellerNoShowCount.size > 0) {
    factors.noShowHistory = true;
    riskScore += 0.25; // 25% 증가
  }

  // 🔥 4. 분쟁 이력 체크
  const buyerDisputeCount = await db
    .collection("disputes")
    .where("userId", "==", buyerId)
    .where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    .get();

  const sellerDisputeCount = await db
    .collection("disputes")
    .where("userId", "==", sellerId)
    .where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    .get();

  if (buyerDisputeCount.size > 0 || sellerDisputeCount.size > 0) {
    factors.disputeHistory = true;
    riskScore += 0.20; // 20% 증가
  }

  // 🔥 반복 분쟁 이력 체크 (전면 강제 조건) - 1회 이상으로 강화
  const buyerRepeatedDisputes = buyerDisputeCount.size >= 1;
  const sellerRepeatedDisputes = sellerDisputeCount.size >= 1;
  
  if (buyerRepeatedDisputes || sellerRepeatedDisputes) {
    factors.repeatedDisputeHistory = true;
    riskScore += 0.30; // 30% 추가 증가 (반복 분쟁 이력)
  }

  // 🔥 5. 미인증 사용자 체크
  const buyerVerified = buyerSnap.data()?.faceToFaceVerified === true || 
                        buyerSnap.data()?.realNameVerified === true;
  const sellerVerified = sellerSnap.data()?.faceToFaceVerified === true || 
                         sellerSnap.data()?.realNameVerified === true;

  if (!buyerVerified || !sellerVerified) {
    factors.unverifiedUser = true;
    riskScore += 0.15; // 15% 증가
  }

  // 🔥 6. 고가 거래 체크
  if (price >= 500000) {
    factors.highPrice = true;
    riskScore += 0.10; // 10% 증가
  }

  // 🔥 7. 신규 사용자 체크
  const buyerCreatedAt = buyerSnap.data()?.createdAt?.toDate();
  const sellerCreatedAt = sellerSnap.data()?.createdAt?.toDate();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if ((buyerCreatedAt && buyerCreatedAt > thirtyDaysAgo) || 
      (sellerCreatedAt && sellerCreatedAt > thirtyDaysAgo)) {
    factors.newUser = true;
    riskScore += 0.10; // 10% 증가
  }

  return { riskScore: Math.min(riskScore, 1.0), factors };
}

/**
 * 에스크로 강제 조건 체크
 */
export async function shouldForceEscrow(
  postId: string,
  buyerId: string,
  sellerId: string,
  price: number
): Promise<{ forceEscrow: boolean; reason: string }> {
  // 🔥 분쟁 반복 계정 → 에스크로 상시 체크
  const buyerSnap = await db.collection("users").doc(buyerId).get();
  const sellerSnap = await db.collection("users").doc(sellerId).get();
  
  const buyerEscrowAlways = buyerSnap.data()?.escrowAlwaysRequired === true;
  const sellerEscrowAlways = sellerSnap.data()?.escrowAlwaysRequired === true;

  if (buyerEscrowAlways || sellerEscrowAlways) {
    return {
      forceEscrow: true,
      reason: "분쟁 반복 계정으로 인해 에스크로 거래가 항상 필수입니다.",
    };
  }

  const { riskScore, factors } = await calculateDisputeRisk(postId, buyerId, sellerId, price);

  // 🔥 에스크로 강제 조건
  if (riskScore >= ESCROW_FORCE_THRESHOLD) {
    return {
      forceEscrow: true,
      reason: `분쟁 위험도 ${(riskScore * 100).toFixed(0)}%로 에스크로 거래가 필수입니다.`,
    };
  }

  // 🔥 특정 조건 조합 시 강제
  if (factors.priceAnomaly && factors.lowReputation) {
    return {
      forceEscrow: true,
      reason: "가격 이상 및 저평판 조합으로 에스크로 거래가 필수입니다.",
    };
  }

  if (factors.noShowHistory && factors.unverifiedUser) {
    return {
      forceEscrow: true,
      reason: "노쇼 이력 및 미인증 사용자 조합으로 에스크로 거래가 필수입니다.",
    };
  }

  if (factors.highPrice && factors.newUser) {
    return {
      forceEscrow: true,
      reason: "고가 거래 및 신규 사용자 조합으로 에스크로 거래가 필수입니다.",
    };
  }

  return { forceEscrow: false, reason: "" };
}

/**
 * 거래 생성 시 분쟁 예측 및 에스크로 강제
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
    const postId = trade.postId;
    const buyerId = trade.buyerId;
    const sellerId = trade.sellerId;
    const price = trade.price || 0;

    logger.info("[onTradeCreated] 거래 생성 감지, 분쟁 예측 시작:", {
      tradeId,
      postId,
      buyerId,
      sellerId,
    });

    try {
      // 🔥 분쟁 예측 모델 적용
      const prediction = await predictDisputeRisk(
        postId,
        buyerId,
        sellerId,
        price
      );

      // 🔥 기존 분쟁 확률 계산 (하위 호환)
      const { riskScore, factors } = await calculateDisputeRisk(
        postId,
        buyerId,
        sellerId,
        price
      );

      // 🔥 에스크로 강제 조건 체크
      const escrowCheck = await shouldForceEscrow(postId, buyerId, sellerId, price);
      
      // 🔥 예측 모델 결과 우선 적용
      const finalEscrowRequired = prediction.escrowRequired || escrowCheck.forceEscrow;

      // 🔥 거래에 분쟁 예측 정보 저장
      await db.collection("trades").doc(tradeId).update({
        disputeRiskScore: prediction.riskScore,
        disputeRiskLevel: prediction.riskLevel,
        disputeRiskFactors: factors,
        matchedRiskCombinations: prediction.matchedCombinations.map((c) => c.name),
        forceEscrow: finalEscrowRequired,
        escrowReason: finalEscrowRequired ? prediction.userMessage : escrowCheck.reason,
        csPriority: prediction.csPriority,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 🔥 CS 워크플로 처리
      await processCSWorkflow(tradeId, prediction.riskLevel, prediction.csPriority);

      // 🔥 경고 배너 표시 조건 (30% 이상 또는 MEDIUM 이상)
      if (prediction.riskScore >= WARNING_THRESHOLD || prediction.riskLevel !== "LOW") {
        // 🔥 구매자에게 경고 알림
        await notify(buyerId, {
          type: "JOIN_APPROVED", // 임시 타입
          title: prediction.riskLevel === "CRITICAL" ? "⚠️ 거래 위험 경고" : "거래 주의 안내",
          body: prediction.userMessage,
          postId,
        });

        // 🔥 판매자에게 경고 알림
        await notify(sellerId, {
          type: "JOIN_APPROVED", // 임시 타입
          title: prediction.riskLevel === "CRITICAL" ? "⚠️ 거래 위험 경고" : "거래 주의 안내",
          body: prediction.userMessage,
          postId,
        });
      }

      // 🔥 에스크로 강제 시 거래 상태 변경
      if (finalEscrowRequired) {
        await db.collection("trades").doc(tradeId).update({
          status: "ESCROW_REQUIRED",
          escrowRequired: true,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 구매자에게 에스크로 강제 알림
        await notify(buyerId, {
          type: "JOIN_APPROVED", // 임시 타입
          title: "에스크로 거래 필수",
          body: prediction.userMessage,
          postId,
        });

        // 🔥 판매자에게 에스크로 강제 알림
        await notify(sellerId, {
          type: "JOIN_APPROVED", // 임시 타입
          title: "에스크로 거래 필수",
          body: prediction.userMessage,
          postId,
        });
      }

      logger.info("[onTradeCreated] 분쟁 예측 완료:", {
        tradeId,
        riskScore: prediction.riskScore,
        riskLevel: prediction.riskLevel,
        matchedCombinations: prediction.matchedCombinations.map((c) => c.name),
        forceEscrow: finalEscrowRequired,
        csPriority: prediction.csPriority,
      });
    } catch (error: any) {
      logger.error("[onTradeCreated] 분쟁 예측 실패:", {
        tradeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
