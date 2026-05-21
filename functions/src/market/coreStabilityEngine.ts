/**
 * 🔥 코어 안정 레이어 통합 엔진 (실전 배포 패키지)
 * 
 * 역할:
 * 1. 부스트 로직 통합
 * 2. 가격 규율 통합
 * 3. 인증 제한 통합
 * 4. 에스크로 통합
 * 5. CS 자동화 최소 통합
 */

import { db, FieldValue, Timestamp } from "../firebase";
import { logger } from "firebase-functions/v2";

// ============================================
// 1. 부스트 엔진
// ============================================

const BOOST_WEIGHT = 0.8; // +80%
const MIN_IMAGE_QUALITY = 95;
const BOOST_DURATION_MS = 30 * 60 * 1000; // 30분
const MAX_BOOSTS_PER_24H = 2; // 24시간당 2회

export interface BoostResult {
  boostWeight: number;
  reason: string;
  expiresAt: Date | null;
}

/**
 * 부스트 가중치 계산
 */
export async function calculateBoost(
  postId: string,
  post: any,
  userId: string
): Promise<BoostResult> {
  // 🔥 이미지 품질 체크
  const imageQuality = post.imageQuality || 0;
  if (imageQuality < MIN_IMAGE_QUALITY) {
    return {
      boostWeight: 0,
      reason: "IMAGE_QUALITY_LOW",
      expiresAt: null,
    };
  }

  // 🔥 24시간 내 부스트 횟수 체크
  const twentyFourHoursAgo = Timestamp.fromDate(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const recentBoosts = await db
    .collection("market")
    .where("authorId", "==", userId)
    .where("boostApplied", "==", true)
    .where("createdAt", ">=", twentyFourHoursAgo)
    .get();

  if (recentBoosts.size >= MAX_BOOSTS_PER_24H) {
    return {
      boostWeight: 0,
      reason: "BOOST_LIMIT_EXCEEDED",
      expiresAt: null,
    };
  }

  // 🔥 게시물 생성 시간 체크
  const createdAt = post.createdAt?.toDate() || new Date();
  const ageMin = (Date.now() - createdAt.getTime()) / (1000 * 60);

  if (ageMin > 30) {
    return {
      boostWeight: 0,
      reason: "BOOST_EXPIRED",
      expiresAt: null,
    };
  }

  // 🔥 첫 채팅 발생 여부 체크
  const chatRooms = await db
    .collection("chatRooms")
    .where("postId", "==", postId)
    .limit(1)
    .get();

  if (!chatRooms.empty) {
    // 채팅방이 있으면 부스트 해제
    return {
      boostWeight: 0,
      reason: "FIRST_CHAT_OCCURRED",
      expiresAt: null,
    };
  }

  const expiresAt = new Date(createdAt.getTime() + BOOST_DURATION_MS);

  return {
    boostWeight: BOOST_WEIGHT,
    reason: "NEW_POST_BOOST",
    expiresAt,
  };
}

// ============================================
// 2. 가격 규율 엔진
// ============================================

export type PriceRuleResult = "OK" | "DOWN" | "REVIEW" | "HIDE" | "BLOCK";

export interface PriceRuleCheck {
  result: PriceRuleResult;
  deviation: number;
  message: string;
  exposurePenalty: number;
}

/**
 * 가격 규율 체크
 */
export function checkPriceRule(
  price: number,
  guidePrice: number
): PriceRuleCheck {
  if (!guidePrice || guidePrice <= 0) {
    return {
      result: "OK",
      deviation: 0,
      message: "가이드 가격 없음",
      exposurePenalty: 0,
    };
  }

  const diff = Math.abs(price - guidePrice) / guidePrice;

  // ±80% 초과 → 등록 차단
  if (diff > 0.8) {
    return {
      result: "BLOCK",
      deviation: diff,
      message: "가이드 가격 대비 ±80% 초과, 등록 차단",
      exposurePenalty: 1.0, // 100% 노출 차단
    };
  }

  // ±60% 초과 → 자동 비공개
  if (diff > 0.6) {
    return {
      result: "HIDE",
      deviation: diff,
      message: "가이드 가격 대비 ±60% 초과, 자동 비공개",
      exposurePenalty: 1.0,
    };
  }

  // ±40% 초과 → 임시 검수
  if (diff > 0.4) {
    return {
      result: "REVIEW",
      deviation: diff,
      message: "가이드 가격 대비 ±40% 초과, 임시 검수 필요",
      exposurePenalty: 0.3, // -30% 노출
    };
  }

  // ±20% 초과 → 노출 감소
  if (diff > 0.2) {
    return {
      result: "DOWN",
      deviation: diff,
      message: "가이드 가격 대비 ±20% 초과, 노출 감소",
      exposurePenalty: 0.3, // -30% 노출
    };
  }

  // 정상 범위
  return {
    result: "OK",
    deviation: diff,
    message: "가이드 가격 범위 내",
    exposurePenalty: 0,
  };
}

// ============================================
// 3. 인증 제한 엔진
// ============================================

export interface ChatPermissionResult {
  canChat: boolean;
  reason: string;
  isVerified: boolean;
}

/**
 * 채팅 권한 체크
 */
export async function checkChatPermission(
  userId: string
): Promise<ChatPermissionResult> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return {
        canChat: false,
        reason: "USER_NOT_FOUND",
        isVerified: false,
      };
    }

    const userData = userDoc.data();
    const trustTier = userData?.trustTier;
    const faceToFaceVerified = userData?.faceToFaceVerified === true;
    const realNameVerified = userData?.realNameVerified === true;

    // 🔥 verified 이상이면 인증된 것으로 간주
    if (trustTier === "verified" || trustTier === "host") {
      return {
        canChat: true,
        reason: "VERIFIED_USER",
        isVerified: true,
      };
    }

    // 🔥 대면 또는 실명 인증이 있으면 인증된 것으로 간주
    if (faceToFaceVerified || realNameVerified) {
      return {
        canChat: true,
        reason: "FACE_TO_FACE_OR_REALNAME_VERIFIED",
        isVerified: true,
      };
    }

    // 🔥 미인증 사용자는 채팅 불가 (읽기만 가능)
    return {
      canChat: false,
      reason: "UNVERIFIED_USER",
      isVerified: false,
    };
  } catch (error: any) {
    logger.error("[checkChatPermission] 인증 상태 확인 실패:", {
      userId,
      error: error.message,
    });
    return {
      canChat: false,
      reason: "ERROR",
      isVerified: false,
    };
  }
}

// ============================================
// 4. 에스크로 엔진
// ============================================

export interface EscrowCheckResult {
  required: boolean;
  reason: string;
  riskScore: number;
}

/**
 * 에스크로 필요 여부 체크
 */
export async function checkEscrowRequired(
  trade: {
    price: number;
    buyerId: string;
    sellerId: string;
    postId: string;
  }
): Promise<EscrowCheckResult> {
  try {
    let riskScore = 0;
    const reasons: string[] = [];

    // 🔥 고가 거래 체크 (20만원 이상)
    if (trade.price >= 200000) {
      riskScore += 0.3;
      reasons.push("HIGH_PRICE");
    }

    // 🔥 구매자 평판 체크
    const buyerDoc = await db.collection("users").doc(trade.buyerId).get();
    const buyerData = buyerDoc.data();
    const buyerRep = buyerData?.reputation || 0;
    const buyerTradeCount = buyerData?.tradeCount || 0;

    if (buyerRep < 3.5) {
      riskScore += 0.2;
      reasons.push("LOW_BUYER_REPUTATION");
    }

    if (buyerTradeCount < 5) {
      riskScore += 0.2;
      reasons.push("LOW_BUYER_TRADE_COUNT");
    }

    // 🔥 판매자 평판 체크
    const sellerDoc = await db.collection("users").doc(trade.sellerId).get();
    const sellerData = sellerDoc.data();
    const sellerRep = sellerData?.reputation || 0;
    const sellerTradeCount = sellerData?.tradeCount || 0;

    if (sellerRep < 3.5) {
      riskScore += 0.2;
      reasons.push("LOW_SELLER_REPUTATION");
    }

    if (sellerTradeCount < 5) {
      riskScore += 0.2;
      reasons.push("LOW_SELLER_TRADE_COUNT");
    }

    // 🔥 미인증 사용자 체크
    const buyerVerified =
      buyerData?.faceToFaceVerified === true ||
      buyerData?.realNameVerified === true;
    const sellerVerified =
      sellerData?.faceToFaceVerified === true ||
      sellerData?.realNameVerified === true;

    if (!buyerVerified) {
      riskScore += 0.3;
      reasons.push("UNVERIFIED_BUYER");
    }

    if (!sellerVerified) {
      riskScore += 0.3;
      reasons.push("UNVERIFIED_SELLER");
    }

    // 🔥 분쟁 이력 체크 (30일 내)
    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const buyerDisputes = await db
      .collection("disputes")
      .where("userId", "==", trade.buyerId)
      .where("createdAt", ">=", thirtyDaysAgo)
      .get();

    const sellerDisputes = await db
      .collection("disputes")
      .where("userId", "==", trade.sellerId)
      .where("createdAt", ">=", thirtyDaysAgo)
      .get();

    if (buyerDisputes.size > 0) {
      riskScore += 0.3;
      reasons.push("BUYER_DISPUTE_HISTORY");
    }

    if (sellerDisputes.size > 0) {
      riskScore += 0.3;
      reasons.push("SELLER_DISPUTE_HISTORY");
    }

    // 🔥 에스크로 상시 설정 체크
    if (buyerData?.escrowAlwaysRequired === true) {
      riskScore = 1.0;
      reasons.push("BUYER_ESCROW_ALWAYS_REQUIRED");
    }

    if (sellerData?.escrowAlwaysRequired === true) {
      riskScore = 1.0;
      reasons.push("SELLER_ESCROW_ALWAYS_REQUIRED");
    }

    // 🔥 위험도 0.5 이상이면 에스크로 필수
    const required = riskScore >= 0.5;

    return {
      required,
      reason: reasons.join(", "),
      riskScore,
    };
  } catch (error: any) {
    logger.error("[checkEscrowRequired] 에스크로 체크 실패:", {
      trade,
      error: error.message,
    });
    // 🔥 에러 시 안전하게 에스크로 필수로 설정
    return {
      required: true,
      reason: "ERROR",
      riskScore: 1.0,
    };
  }
}

// ============================================
// 5. CS 자동화 최소 엔진
// ============================================

export type IssueType = "PRICE" | "STATE" | "DELIVERY" | "PAYMENT" | "OTHER";

export interface CSAutoResponse {
  template: string;
  autoResolved: boolean;
  needsHuman: boolean;
}

/**
 * CS 자동 응답 라우팅
 */
export function routeCSIssue(issue: {
  type: IssueType;
  title: string;
  description: string;
}): CSAutoResponse {
  const text = `${issue.title} ${issue.description}`.toLowerCase();

  // 🔥 가격 관련
  if (
    text.includes("가격") ||
    text.includes("비싸") ||
    text.includes("싸") ||
    text.includes("협의")
  ) {
    return {
      template: "PRICE_DISAGREEMENT",
      autoResolved: false,
      needsHuman: false,
    };
  }

  // 🔥 상태/품질 관련
  if (
    text.includes("상태") ||
    text.includes("품질") ||
    text.includes("손상") ||
    text.includes("불량")
  ) {
    return {
      template: "ITEM_CONDITION",
      autoResolved: false,
      needsHuman: false,
    };
  }

  // 🔥 배송 관련
  if (
    text.includes("배송") ||
    text.includes("택배") ||
    text.includes("지연") ||
    text.includes("미수령")
  ) {
    return {
      template: "DELIVERY_ISSUE",
      autoResolved: false,
      needsHuman: false,
    };
  }

  // 🔥 결제 관련
  if (
    text.includes("결제") ||
    text.includes("환불") ||
    text.includes("입금") ||
    text.includes("출금")
  ) {
    return {
      template: "PAYMENT_ISSUE",
      autoResolved: false,
      needsHuman: true, // 결제는 상담원 필요
    };
  }

  // 🔥 기타는 상담원 연결
  return {
    template: "OTHER",
    autoResolved: false,
    needsHuman: true,
  };
}
