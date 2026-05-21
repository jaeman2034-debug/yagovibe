/**
 * 🔥 분쟁 예측 모델 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 위험 조합 규칙 적용
 * - 에스크로 강제 조건 체크
 * - CS 워크플로 자동화
 * - 사용자 문구 생성
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";

// 🔥 위험 조합 임계값
const HIGH_RISK_COMBINATION_THRESHOLD = 0.5; // 위험 조합 확률 50% 이상
const ESCROW_FORCE_THRESHOLD = 0.6; // 에스크로 강제 확률 60% 이상
const CS_PRIORITY_THRESHOLD = 0.7; // CS 우선 큐 확률 70% 이상

/**
 * 위험 조합 규칙
 */
interface RiskCombination {
  name: string;
  factors: string[];
  weight: number;
  escrowRequired: boolean;
  csPriority: boolean;
}

const RISK_COMBINATIONS: RiskCombination[] = [
  {
    name: "저평판 + 고가 + 미인증",
    factors: ["lowReputation", "highPrice", "unverifiedUser"],
    weight: 0.8,
    escrowRequired: true,
    csPriority: true,
  },
  {
    name: "가격 이상 + 노쇼 이력",
    factors: ["priceAnomaly", "noShowHistory"],
    weight: 0.7,
    escrowRequired: true,
    csPriority: false,
  },
  {
    name: "분쟁 이력 + 신규 사용자",
    factors: ["disputeHistory", "newUser"],
    weight: 0.65,
    escrowRequired: true,
    csPriority: false,
  },
  {
    name: "저평판 + 미인증 + 신규 사용자",
    factors: ["lowReputation", "unverifiedUser", "newUser"],
    weight: 0.75,
    escrowRequired: true,
    csPriority: true,
  },
  {
    name: "고가 + 미인증 + 신규 사용자",
    factors: ["highPrice", "unverifiedUser", "newUser"],
    weight: 0.7,
    escrowRequired: true,
    csPriority: false,
  },
  {
    name: "가격 이상 + 저평판 + 분쟁 이력",
    factors: ["priceAnomaly", "lowReputation", "disputeHistory"],
    weight: 0.85,
    escrowRequired: true,
    csPriority: true,
  },
];

/**
 * 위험 조합 매칭
 */
function matchRiskCombinations(factors: Record<string, boolean>): {
  matchedCombinations: RiskCombination[];
  totalRiskScore: number;
} {
  const matchedCombinations: RiskCombination[] = [];
  let totalRiskScore = 0;

  for (const combination of RISK_COMBINATIONS) {
    const allFactorsMatch = combination.factors.every(
      (factor) => factors[factor] === true
    );

    if (allFactorsMatch) {
      matchedCombinations.push(combination);
      totalRiskScore += combination.weight;
    }
  }

  return {
    matchedCombinations,
    totalRiskScore: Math.min(totalRiskScore, 1.0),
  };
}

/**
 * 분쟁 예측 모델
 */
export async function predictDisputeRisk(
  postId: string,
  buyerId: string,
  sellerId: string,
  price: number
): Promise<{
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  matchedCombinations: RiskCombination[];
  escrowRequired: boolean;
  csPriority: boolean;
  userMessage: string;
}> {
  const factors: Record<string, boolean> = {
    priceAnomaly: false,
    lowReputation: false,
    noShowHistory: false,
    disputeHistory: false,
    unverifiedUser: false,
    highPrice: false,
    newUser: false,
  };

  // 🔥 1. 가격 이상 체크
  const postSnap = await db.collection("market").doc(postId).get();
  const post = postSnap.data();
  if (post?.priceAnomaly === true) {
    factors.priceAnomaly = true;
  }

  // 🔥 2. 저평판 체크
  const buyerSnap = await db.collection("users").doc(buyerId).get();
  const sellerSnap = await db.collection("users").doc(sellerId).get();

  const buyerReputation = buyerSnap.data()?.reputation || 0;
  const sellerReputation = sellerSnap.data()?.reputation || 0;

  if (buyerReputation < 3.0 || sellerReputation < 3.0) {
    factors.lowReputation = true;
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
  }

  // 🔥 5. 미인증 사용자 체크
  const buyerVerified = buyerSnap.data()?.faceToFaceVerified === true ||
    buyerSnap.data()?.realNameVerified === true;
  const sellerVerified = sellerSnap.data()?.faceToFaceVerified === true ||
    sellerSnap.data()?.realNameVerified === true;

  if (!buyerVerified || !sellerVerified) {
    factors.unverifiedUser = true;
  }

  // 🔥 6. 고가 거래 체크
  if (price >= 500000) {
    factors.highPrice = true;
  }

  // 🔥 7. 신규 사용자 체크
  const buyerCreatedAt = buyerSnap.data()?.createdAt?.toDate();
  const sellerCreatedAt = sellerSnap.data()?.createdAt?.toDate();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if ((buyerCreatedAt && buyerCreatedAt > thirtyDaysAgo) ||
    (sellerCreatedAt && sellerCreatedAt > thirtyDaysAgo)) {
    factors.newUser = true;
  }

  // 🔥 위험 조합 매칭
  const { matchedCombinations, totalRiskScore } = matchRiskCombinations(factors);

  // 🔥 위험도 레벨 결정
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (totalRiskScore >= 0.8) {
    riskLevel = "CRITICAL";
  } else if (totalRiskScore >= 0.6) {
    riskLevel = "HIGH";
  } else if (totalRiskScore >= 0.4) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  // 🔥 에스크로 강제 여부
  const escrowRequired = matchedCombinations.some((c) => c.escrowRequired) ||
    totalRiskScore >= ESCROW_FORCE_THRESHOLD;

  // 🔥 CS 우선 큐 여부
  const csPriority = matchedCombinations.some((c) => c.csPriority) ||
    totalRiskScore >= CS_PRIORITY_THRESHOLD;

  // 🔥 사용자 문구 생성
  const userMessage = generateUserMessage(
    riskLevel,
    matchedCombinations,
    escrowRequired,
    csPriority
  );

  return {
    riskScore: totalRiskScore,
    riskLevel,
    matchedCombinations,
    escrowRequired,
    csPriority,
    userMessage,
  };
}

/**
 * 사용자 문구 생성
 */
function generateUserMessage(
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  matchedCombinations: RiskCombination[],
  escrowRequired: boolean,
  csPriority: boolean
): string {
  if (riskLevel === "CRITICAL") {
    return `⚠️ 이 거래는 매우 높은 분쟁 위험도(${(matchedCombinations[0]?.weight || 0) * 100}%)를 가지고 있습니다. 에스크로 거래가 필수이며, CS 우선 처리됩니다.`;
  }

  if (riskLevel === "HIGH") {
    if (escrowRequired) {
      return `⚠️ 이 거래는 높은 분쟁 위험도(${(matchedCombinations[0]?.weight || 0) * 100}%)를 가지고 있습니다. 에스크로 거래를 강력히 권장합니다.`;
    }
    return `⚠️ 이 거래는 높은 분쟁 위험도(${(matchedCombinations[0]?.weight || 0) * 100}%)를 가지고 있습니다. 주의하여 거래하시기 바랍니다.`;
  }

  if (riskLevel === "MEDIUM") {
    if (escrowRequired) {
      return `이 거래는 중간 분쟁 위험도를 가지고 있습니다. 에스크로 거래를 권장합니다.`;
    }
    return `이 거래는 중간 분쟁 위험도를 가지고 있습니다. 안전한 거래를 위해 에스크로를 고려해보세요.`;
  }

  return `이 거래는 낮은 분쟁 위험도를 가지고 있습니다. 안전한 거래를 위해 에스크로를 고려해보세요.`;
}

/**
 * CS 워크플로 자동화
 */
export async function processCSWorkflow(
  tradeId: string,
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  csPriority: boolean
): Promise<void> {
  // 🔥 CS 우선 큐 등록
  if (csPriority) {
    await db.collection("csQueue").add({
      tradeId,
      priority: riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
      riskLevel,
      createdAt: FieldValue.serverTimestamp(),
      status: "PENDING",
    });

    logger.info("[processCSWorkflow] CS 우선 큐 등록:", {
      tradeId,
      riskLevel,
      priority: riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
    });
  }

  // 🔥 위험도에 따른 자동 조치
  if (riskLevel === "CRITICAL") {
    // 🔥 즉시 관리자 알림
    // (관리자 알림 시스템 연동 필요)
    logger.warn("[processCSWorkflow] CRITICAL 위험도 감지:", { tradeId });
  } else if (riskLevel === "HIGH") {
    // 🔥 CS 담당자에게 알림
    // (CS 알림 시스템 연동 필요)
    logger.info("[processCSWorkflow] HIGH 위험도 감지:", { tradeId });
  }
}
