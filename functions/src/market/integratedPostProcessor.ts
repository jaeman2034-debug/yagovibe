/**
 * 🔥 통합 게시물 처리기 (실전 배포 패키지)
 * 
 * 역할:
 * - 게시물 생성 시 부스트 + 가격 규율 + 인증 체크 통합 처리
 * - 실시간 피드 점수 계산에 반영
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { calculateBoost, BoostResult } from "./coreStabilityEngine";
import { checkPriceRule, PriceRuleCheck } from "./coreStabilityEngine";
import { calculateRegionalPriceStats } from "./priceAnomalyDetection";

/**
 * 게시물 생성 시 통합 처리
 */
export const onMarketPostCreated = onDocumentCreated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const postId = event.params.postId;
    const authorId = post.authorId || post.userId;

    logger.info("[onMarketPostCreated] 게시물 생성 통합 처리 시작:", { postId, authorId });

    try {
      const updates: Record<string, any> = {};

      // ============================================
      // 1. 부스트 계산
      // ============================================
      const boostResult: BoostResult = await calculateBoost(postId, post, authorId);
      
      if (boostResult.boostWeight > 0) {
        updates.boostActive = true;
        updates.boostWeight = boostResult.boostWeight;
        updates.boostStartTime = Timestamp.fromDate(new Date());
        updates.boostEndTime = boostResult.expiresAt 
          ? Timestamp.fromDate(boostResult.expiresAt)
          : null;
        updates.boostReason = boostResult.reason;
      } else {
        updates.boostActive = false;
        updates.boostBlocked = true;
        updates.boostBlockReason = boostResult.reason;
      }

      // ============================================
      // 2. 가격 규율 체크
      // ============================================
      const price = post.price || 0;
      const guidePrice = post.priceGuide || post.aiPriceGuide || 0;

      if (price > 0 && guidePrice > 0) {
        const priceCheck: PriceRuleCheck = checkPriceRule(price, guidePrice);
        
        updates.priceRuleResult = priceCheck.result;
        updates.priceDeviation = priceCheck.deviation;
        updates.exposurePenalty = priceCheck.exposurePenalty;
        updates.priceAnomaly = priceCheck.result !== "OK";

        // 🔥 BLOCK 또는 HIDE인 경우 즉시 처리
        if (priceCheck.result === "BLOCK") {
          updates.status = "blocked";
          updates.blockReason = "PRICE_ANOMALY_BLOCK";
        } else if (priceCheck.result === "HIDE") {
          updates.status = "hidden";
          updates.hideReason = "PRICE_ANOMALY_HIDE";
        } else if (priceCheck.result === "REVIEW") {
          updates.inspectionRequired = true;
          updates.inspectionReason = "PRICE_ANOMALY_REVIEW";
          
          // 🔥 검수 큐에 등록
          await db.collection("inspectionQueue").add({
            postId,
            sellerId: authorId,
            category: post.category,
            reason: "PRICE_ANOMALY_REVIEW",
            priceDeviation: priceCheck.deviation,
            createdAt: FieldValue.serverTimestamp(),
            status: "PENDING",
          });
        }
      }

      // ============================================
      // 3. 지역별 가격 통계 기반 추가 체크
      // ============================================
      if (price > 0 && post.category) {
        const regionalStats = await calculateRegionalPriceStats(
          post.category,
          post.location?.region || post.location,
          30
        );

        if (regionalStats) {
          const mean = regionalStats.mean;
          const stdDev = regionalStats.stdDev;
          const zScore = (price - mean) / stdDev;

          // 🔥 2σ 이상 벗어난 경우 추가 페널티
          if (Math.abs(zScore) >= 2) {
            updates.priceAnomaly = true;
            updates.priceZScore = zScore;
            updates.exposurePenalty = Math.max(
              updates.exposurePenalty || 0,
              0.3 // 최소 -30%
            );
          }
        }
      }

      // ============================================
      // 4. 작성자 인증 상태 저장 (피드 점수 계산용)
      // ============================================
      if (authorId) {
        const userDoc = await db.collection("users").doc(authorId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          updates.authorFaceToFaceVerified = userData?.faceToFaceVerified === true;
          updates.authorRealNameVerified = userData?.realNameVerified === true;
          updates.authorTrustTier = userData?.trustTier || "basic";
        }
      }

      // ============================================
      // 5. activities 컬렉션에 Activity 생성 (ActivityFeed 표시용)
      // ============================================
      try {
        // 🔥 카테고리별 type 매핑
        const activityTypeMap: Record<string, string> = {
          equipment: "equipment_created",
          recruit: "recruit_created",
          match: "match_created",
        };
        
        const activityType = activityTypeMap[post.category] || "market_created";
        const refType = post.category === "recruit" ? "recruit" : "market";
        
        // 🔥 activities 컬렉션에 Activity 생성
        const activityData = {
          type: activityType,
          refType: refType,
          refId: postId,
          authorId: authorId,
          teamId: post.teamId || undefined,
          title: post.title || "",
          summary: post.description?.trim() || (post.price ? `${Number(post.price).toLocaleString()}원` : undefined),
          thumbnailUrl: post.images?.[0] || post.imageUrl || undefined,
          visibility: "public" as const,
          likeCount: 0,
          commentCount: 0,
          createdAt: FieldValue.serverTimestamp(),
          // 호환성 필드
          sport: (post.sport || "soccer").toLowerCase().trim(),
          category: post.category || "equipment",
        };
        
        await db.collection("activities").add(activityData);
        
        logger.info("[onMarketPostCreated] Activity 생성 완료:", {
          postId,
          activityType,
          refType,
        });
      } catch (activityError: any) {
        // 🔥 Activity 생성 실패는 로그만 남기고 계속 진행 (게시글 생성은 성공)
        logger.warn("[onMarketPostCreated] Activity 생성 실패 (게시글은 정상 생성됨):", {
          postId,
          error: activityError.message,
        });
      }

      // ============================================
      // 6. 통합 업데이트
      // ============================================
      updates.processedAt = FieldValue.serverTimestamp();
      updates.updatedAt = FieldValue.serverTimestamp();

      await db.collection("market").doc(postId).update(updates);

      logger.info("[onMarketPostCreated] 게시물 생성 통합 처리 완료:", {
        postId,
        boostActive: updates.boostActive,
        priceRuleResult: updates.priceRuleResult,
        exposurePenalty: updates.exposurePenalty,
      });
    } catch (error: any) {
      logger.error("[onMarketPostCreated] 게시물 생성 통합 처리 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 게시물 업데이트 시 가격 규율 재체크
 */
export const onMarketPostUpdated = onDocumentUpdated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const postId = event.params.postId;

    // 🔥 가격 변경 시에만 재체크
    if (before.price === after.price) return;

    logger.info("[onMarketPostUpdated] 가격 변경 감지, 가격 규율 재체크:", {
      postId,
      beforePrice: before.price,
      afterPrice: after.price,
    });

    try {
      const price = after.price || 0;
      const guidePrice = after.priceGuide || after.aiPriceGuide || 0;

      if (price > 0 && guidePrice > 0) {
        const priceCheck: PriceRuleCheck = checkPriceRule(price, guidePrice);
        
        const updates: Record<string, any> = {
          priceRuleResult: priceCheck.result,
          priceDeviation: priceCheck.deviation,
          exposurePenalty: priceCheck.exposurePenalty,
          priceAnomaly: priceCheck.result !== "OK",
          updatedAt: FieldValue.serverTimestamp(),
        };

        // 🔥 BLOCK 또는 HIDE인 경우 즉시 처리
        if (priceCheck.result === "BLOCK") {
          updates.status = "blocked";
          updates.blockReason = "PRICE_ANOMALY_BLOCK";
        } else if (priceCheck.result === "HIDE") {
          updates.status = "hidden";
          updates.hideReason = "PRICE_ANOMALY_HIDE";
        } else if (priceCheck.result === "REVIEW") {
          updates.inspectionRequired = true;
          updates.inspectionReason = "PRICE_ANOMALY_REVIEW";
        }

        await db.collection("market").doc(postId).update(updates);

        logger.info("[onMarketPostUpdated] 가격 규율 재체크 완료:", {
          postId,
          priceRuleResult: priceCheck.result,
          exposurePenalty: priceCheck.exposurePenalty,
        });
      }
    } catch (error: any) {
      logger.error("[onMarketPostUpdated] 가격 규율 재체크 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
