/**
 * 🔥 가격 이상 탐지 엔진 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 지역별 평균 가격 대비 2σ 이상 벗어난 가격 탐지
 * - 검수 큐 자동 등록
 * - 판매자 알림
 * - 노출 가중치 -30% 적용
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";

const PRICE_DEVIATION_THRESHOLD = 2; // 2σ (표준편차 2배)
const EXPOSURE_PENALTY = 0.3; // 노출 -30%
const PRICE_GUIDE_TOLERANCE = 0.2; // 가이드 ±20% 허용 범위
const PRICE_GUIDE_STRICT_TOLERANCE = 0.4; // 가이드 ±40% 초과 시 임시 검수
const PRICE_GUIDE_CRITICAL_TOLERANCE = 0.6; // 가이드 ±60% 초과 시 자동 비공개
const PRICE_GUIDE_BLOCK_TOLERANCE = 0.8; // 가이드 ±80% 초과 시 등록 차단

/**
 * 지역별 평균 가격 및 표준편차 계산
 */
export async function calculateRegionalPriceStats(
  category: string,
  location?: string,
  days: number = 30
): Promise<{ mean: number; stdDev: number; count: number } | null> {
  try {
    const daysAgo = Timestamp.fromDate(
      new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    );

    // 🔥 최근 30일 유사 카테고리 게시물 조회
    let query = db
      .collection("market")
      .where("category", "==", category)
      .where("status", "==", "open")
      .where("createdAt", ">=", daysAgo)
      .where("price", ">", 0) // 가격이 있는 것만
      .limit(100);

    // 🔥 지역 필터 (선택적)
    if (location) {
      // location 필드가 문자열인 경우 부분 매칭
      // 또는 location 객체의 region 필드 사용
      // 여기서는 간단히 location 문자열 포함 여부로 필터링
      // 실제로는 location 객체 구조에 따라 조정 필요
    }

    const postsSnap = await query.get();

    if (postsSnap.empty) {
      logger.info("[calculateRegionalPriceStats] 유사 매물 없음:", { category, location });
      return null;
    }

    const prices: number[] = [];
    postsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const price = typeof data.price === "number" ? data.price : Number(data.price || 0);
      if (price > 0) {
        prices.push(price);
      }
    });

    if (prices.length < 3) {
      logger.info("[calculateRegionalPriceStats] 샘플 수 부족:", { count: prices.length });
      return null;
    }

    // 🔥 평균 계산
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

    // 🔥 표준편차 계산
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    logger.info("[calculateRegionalPriceStats] 통계 계산 완료:", {
      category,
      location,
      mean: Math.round(mean),
      stdDev: Math.round(stdDev),
      count: prices.length,
    });

    return { mean, stdDev, count: prices.length };
  } catch (error: any) {
    logger.error("[calculateRegionalPriceStats] 통계 계산 실패:", {
      category,
      location,
      error: error.message,
    });
    return null;
  }
}

/**
 * 가격 가이드 대비 편차 계산
 */
function calculatePriceGuideDeviation(
  price: number,
  priceGuide?: { min: number; max: number; recommended: number } | null
): number | null {
  if (!priceGuide) return null;

  // 🔥 가이드 범위 계산 (±20% 허용)
  const guideMin = priceGuide.recommended * (1 - PRICE_GUIDE_TOLERANCE);
  const guideMax = priceGuide.recommended * (1 + PRICE_GUIDE_TOLERANCE);

  // 🔥 가이드 범위를 벗어난 경우 편차 계산
  if (price < guideMin) {
    return (guideMin - price) / priceGuide.recommended; // 음수 편차 (저가)
  } else if (price > guideMax) {
    return (price - guideMax) / priceGuide.recommended; // 양수 편차 (고가)
  }

  return 0; // 정상 범위
}

/**
 * 가격 이상 탐지
 */
export async function detectPriceAnomaly(
  postId: string,
  post: any
): Promise<{ isAnomaly: boolean; reason: string; deviation?: number }> {
  const price = typeof post.price === "number" ? post.price : Number(post.price || 0);
  const category = post.category;
  const location = post.location;

  if (!price || price <= 0 || !category) {
    return { isAnomaly: false, reason: "가격 또는 카테고리 정보 없음" };
  }

  // 🔥 1. 지역별 평균 가격 대비 2σ 이상 벗어난 경우
  const regionalStats = await calculateRegionalPriceStats(category, location, 30);

  if (regionalStats) {
    const deviation = Math.abs(price - regionalStats.mean) / regionalStats.stdDev;

    if (deviation >= PRICE_DEVIATION_THRESHOLD) {
      const isHigh = price > regionalStats.mean;
      return {
        isAnomaly: true,
        reason: isHigh ? "지역 평균 대비 고가" : "지역 평균 대비 저가",
        deviation,
      };
    }
  }

  // 🔥 2. 가격 가이드 대비 ±20% 초과
  const priceGuide = post.priceGuide as { min: number; max: number; recommended: number } | undefined;
  if (priceGuide) {
    const guideDeviation = calculatePriceGuideDeviation(price, priceGuide);
    if (guideDeviation !== null && guideDeviation > PRICE_GUIDE_TOLERANCE) {
      // 🔥 ±80% 초과 시 등록 차단
      if (guideDeviation > PRICE_GUIDE_BLOCK_TOLERANCE) {
        return {
          isAnomaly: true,
          reason: "가격 가이드 대비 ±80% 초과 (등록 차단)",
          deviation: guideDeviation,
          autoBlock: true, // 🔥 등록 차단 플래그
        } as any;
      }

      // 🔥 ±60% 초과 시 자동 비공개
      if (guideDeviation > PRICE_GUIDE_CRITICAL_TOLERANCE) {
        return {
          isAnomaly: true,
          reason: "가격 가이드 대비 ±60% 초과 (자동 비공개)",
          deviation: guideDeviation,
          autoHide: true, // 🔥 자동 비공개 플래그
        } as any;
      }
      // 🔥 ±40% 초과 시 임시 검수 플래그 추가
      const isStrictAnomaly = guideDeviation > PRICE_GUIDE_STRICT_TOLERANCE;
      return {
        isAnomaly: true,
        reason: isStrictAnomaly 
          ? "가격 가이드 대비 ±40% 초과 (임시 검수)" 
          : "가격 가이드 대비 ±20% 초과",
        deviation: guideDeviation,
      };
    }
  }

  return { isAnomaly: false, reason: "정상 범위" };
}

/**
 * 게시물 생성 시 가격 이상 탐지
 */
export const onMarketPriceCreated = onDocumentCreated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const postId = event.params.postId;
    const price = typeof post.price === "number" ? post.price : Number(post.price || 0);

    // 🔥 가격이 없는 경우 스킵 (equipment 카테고리만 가격 필수)
    if (!price || price <= 0 || post.category !== "equipment") {
      return;
    }

    logger.info("[onMarketPriceCreated] 가격 이상 탐지 시작:", { postId, price });

    try {
      const anomaly = await detectPriceAnomaly(postId, post);

      if (anomaly.isAnomaly) {
        // 🔥 ±80% 초과 시 등록 차단
        const isBlocked = (anomaly as any).autoBlock === true;
        // 🔥 ±60% 초과 시 자동 비공개
        const isCriticalAnomaly = (anomaly as any).autoHide === true;
        // 🔥 ±40% 초과 시 임시 검수 플래그
        const isStrictAnomaly = anomaly.reason.includes("±40%") && !isCriticalAnomaly && !isBlocked;
        const inspectionType = isBlocked
          ? "PRICE_BLOCKED"
          : (isCriticalAnomaly 
              ? "PRICE_CRITICAL_ANOMALY" 
              : (isStrictAnomaly ? "TEMPORARY_INSPECTION" : "PRICE_ANOMALY"));
        
        // 🔥 검수 큐 자동 등록
        await db.collection("inspectionQueue").add({
          postId,
          userId: post.authorId,
          reason: inspectionType,
          details: {
            price,
            category: post.category,
            location: post.location,
            deviation: anomaly.deviation,
            anomalyReason: anomaly.reason,
            isStrictAnomaly,
            isCriticalAnomaly,
            isBlocked,
          },
          priority: isBlocked ? "CRITICAL" : (isCriticalAnomaly ? "CRITICAL" : (isStrictAnomaly ? "URGENT" : "HIGH")),
          createdAt: FieldValue.serverTimestamp(),
          // 🔥 6시간 후 재점검 스케줄 (임시 검수만)
          recheckAt: isStrictAnomaly 
            ? Timestamp.fromDate(new Date(Date.now() + 6 * 60 * 60 * 1000))
            : undefined,
        });

        // 🔥 ±80% 초과 시 등록 차단
        if (isBlocked) {
          await db.collection("market").doc(postId).update({
            status: "blocked", // 🔥 등록 차단
            priceAnomaly: true,
            priceAnomalyReason: anomaly.reason,
            priceAnomalyDeviation: anomaly.deviation,
            autoBlocked: true, // 🔥 등록 차단 플래그
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (isCriticalAnomaly) {
          // 🔥 ±60% 초과 시 자동 비공개
          await db.collection("market").doc(postId).update({
            status: "hidden", // 🔥 자동 비공개
            priceAnomaly: true,
            priceAnomalyReason: anomaly.reason,
            priceAnomalyDeviation: anomaly.deviation,
            autoHidden: true, // 🔥 자동 비공개 플래그
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          // 🔥 노출 가중치 -30% 적용
          await db.collection("market").doc(postId).update({
            priceAnomaly: true,
            priceAnomalyReason: anomaly.reason,
            priceAnomalyDeviation: anomaly.deviation,
            exposurePenalty: EXPOSURE_PENALTY, // -30%
            temporaryInspection: isStrictAnomaly, // 🔥 임시 검수 플래그
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        // 🔥 판매자 알림 (임시 검수 vs 일반 이상 구분)
        await notify(post.authorId, {
          type: "JOIN_REJECTED_FULL", // 임시 타입, 실제로는 PRICE_ANOMALY 타입 추가 필요
          title: isStrictAnomaly ? "가격 임시 검수 안내" : "가격 이상 탐지",
          body: isStrictAnomaly
            ? `등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다. 6시간 후 자동 재점검됩니다. 가격을 조정해주세요.`
            : `등록하신 게시물의 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.`,
          postId,
        });

        logger.warn("[onMarketPriceCreated] 가격 이상 탐지:", {
          postId,
          price,
          reason: anomaly.reason,
          deviation: anomaly.deviation,
        });
      } else {
        // 🔥 정상 범위인 경우 이전 이상 플래그 제거
        await db.collection("market").doc(postId).update({
          priceAnomaly: false,
          exposurePenalty: 0,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (error: any) {
      logger.error("[onMarketPriceCreated] 가격 이상 탐지 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 게시물 가격 수정 시 가격 이상 탐지
 */
export const onMarketPriceUpdated = onDocumentUpdated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const postId = event.params.postId;
    const beforePrice = typeof before.price === "number" ? before.price : Number(before.price || 0);
    const afterPrice = typeof after.price === "number" ? after.price : Number(after.price || 0);

    // 🔥 가격이 변경되지 않았거나 가격이 없는 경우 스킵
    if (beforePrice === afterPrice || !afterPrice || afterPrice <= 0 || after.category !== "equipment") {
      return;
    }

    logger.info("[onMarketPriceUpdated] 가격 수정 감지, 이상 탐지 시작:", {
      postId,
      beforePrice,
      afterPrice,
    });

    try {
      const anomaly = await detectPriceAnomaly(postId, after);

      if (anomaly.isAnomaly) {
        // 🔥 ±80% 초과 시 등록 차단
        const isBlocked = (anomaly as any).autoBlock === true;
        // 🔥 ±60% 초과 시 자동 비공개
        const isCriticalAnomaly = (anomaly as any).autoHide === true;
        // 🔥 ±40% 초과 시 임시 검수 플래그
        const isStrictAnomaly = anomaly.reason.includes("±40%") && !isCriticalAnomaly && !isBlocked;
        const inspectionType = isBlocked
          ? "PRICE_BLOCKED"
          : (isCriticalAnomaly 
              ? "PRICE_CRITICAL_ANOMALY" 
              : (isStrictAnomaly ? "TEMPORARY_INSPECTION" : "PRICE_ANOMALY"));
        
        // 🔥 검수 큐 자동 등록
        await db.collection("inspectionQueue").add({
          postId,
          userId: after.authorId,
          reason: inspectionType,
          details: {
            price: afterPrice,
            beforePrice,
            category: after.category,
            location: after.location,
            deviation: anomaly.deviation,
            anomalyReason: anomaly.reason,
            isStrictAnomaly,
            isCriticalAnomaly,
            isBlocked,
          },
          priority: isBlocked ? "CRITICAL" : (isCriticalAnomaly ? "CRITICAL" : (isStrictAnomaly ? "URGENT" : "HIGH")),
          createdAt: FieldValue.serverTimestamp(),
          // 🔥 6시간 후 재점검 스케줄 (임시 검수만)
          recheckAt: isStrictAnomaly 
            ? Timestamp.fromDate(new Date(Date.now() + 6 * 60 * 60 * 1000))
            : undefined,
        });

        // 🔥 ±80% 초과 시 등록 차단
        if (isBlocked) {
          await db.collection("market").doc(postId).update({
            status: "blocked", // 🔥 등록 차단
            priceAnomaly: true,
            priceAnomalyReason: anomaly.reason,
            priceAnomalyDeviation: anomaly.deviation,
            autoBlocked: true, // 🔥 등록 차단 플래그
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (isCriticalAnomaly) {
          // 🔥 ±60% 초과 시 자동 비공개
          await db.collection("market").doc(postId).update({
            status: "hidden", // 🔥 자동 비공개
            priceAnomaly: true,
            priceAnomalyReason: anomaly.reason,
            priceAnomalyDeviation: anomaly.deviation,
            autoHidden: true, // 🔥 자동 비공개 플래그
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          // 🔥 노출 가중치 -30% 적용
          await db.collection("market").doc(postId).update({
            priceAnomaly: true,
            priceAnomalyReason: anomaly.reason,
            priceAnomalyDeviation: anomaly.deviation,
            exposurePenalty: EXPOSURE_PENALTY, // -30%
            temporaryInspection: isStrictAnomaly, // 🔥 임시 검수 플래그
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        // 🔥 판매자 알림 (임시 검수 vs 일반 이상 구분)
        await notify(after.authorId, {
          type: "JOIN_REJECTED_FULL", // 임시 타입
          title: isStrictAnomaly ? "가격 임시 검수 안내" : "가격 이상 탐지",
          body: isStrictAnomaly
            ? `수정하신 가격이 추천 가격 가이드를 크게 벗어났습니다. 6시간 후 자동 재점검됩니다. 가격을 조정해주세요.`
            : `수정하신 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.`,
          postId,
        });

        logger.warn("[onMarketPriceUpdated] 가격 이상 탐지:", {
          postId,
          afterPrice,
          reason: anomaly.reason,
          deviation: anomaly.deviation,
        });
      } else {
        // 🔥 정상 범위로 복귀한 경우 이상 플래그 제거
        await db.collection("market").doc(postId).update({
          priceAnomaly: false,
          exposurePenalty: 0,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (error: any) {
      logger.error("[onMarketPriceUpdated] 가격 이상 탐지 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
