/**
 * 🔥 평판 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 사용자 평판 점수 계산
 * - 평판 업데이트
 * - 신뢰도 기반 노출 최적화
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";

/**
 * 평판 데이터 구조
 */
export interface ReputationData {
  rating: number; // 평균 평점 (0 ~ 5)
  tradeCount: number; // 거래 완료 횟수
  noShowCount: number; // 노쇼 횟수
  noShowRate: number; // 노쇼율 (0 ~ 1)
  responseTime: number; // 평균 응답 시간 (분)
  lastUpdated: Date; // 마지막 업데이트 시간
  score: number; // 종합 평판 점수 (0 ~ 100)
}

/**
 * 평판 점수 계산 공식
 * 
 * score = rating * 0.5 + tradeCount * 0.2 + responseTime * 0.2 - noShowRate * 0.3
 */
export function calculateReputationScore(data: {
  rating: number;
  tradeCount: number;
  responseTime: number;
  noShowRate: number;
}): number {
  const { rating, tradeCount, responseTime, noShowRate } = data;

  // 🔥 정규화
  const normalizedRating = Math.min(5, Math.max(0, rating)) / 5; // 0 ~ 1
  const normalizedTradeCount = Math.min(100, tradeCount) / 100; // 0 ~ 1 (최대 100회)
  const normalizedResponseTime = Math.max(0, Math.min(1, 1 - responseTime / 1440)); // 0 ~ 1 (24시간 = 1440분)
  const normalizedNoShowRate = Math.min(1, Math.max(0, noShowRate)); // 0 ~ 1

  // 🔥 점수 계산
  const score =
    normalizedRating * 0.5 +
    normalizedTradeCount * 0.2 +
    normalizedResponseTime * 0.2 -
    normalizedNoShowRate * 0.3;

  // 🔥 0 ~ 100 범위로 변환
  return Math.max(0, Math.min(100, score * 100));
}

/**
 * 사용자 평판 업데이트
 */
export async function updateUserReputation(
  userId: string,
  updates: {
    rating?: number; // 새로운 평점 추가
    tradeCompleted?: boolean; // 거래 완료
    noShow?: boolean; // 노쇼 발생
    responseTime?: number; // 응답 시간 (분)
  }
): Promise<ReputationData> {
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error(`User ${userId} not found`);
  }

  const currentData = userSnap.data();
  const currentRep = (currentData?.reputation || {}) as Partial<ReputationData>;

  // 🔥 현재 값 가져오기
  let rating = currentRep.rating || 0;
  let tradeCount = currentRep.tradeCount || 0;
  let noShowCount = currentRep.noShowCount || 0;
  let totalRatings = (currentRep as any).totalRatings || 0;
  let totalResponseTime = (currentRep as any).totalResponseTime || 0;
  let responseCount = (currentRep as any).responseCount || 0;

  // 🔥 업데이트 적용
  if (updates.rating !== undefined) {
    totalRatings += 1;
    rating = (rating * (totalRatings - 1) + updates.rating) / totalRatings;
  }

  if (updates.tradeCompleted) {
    tradeCount += 1;
  }

  if (updates.noShow) {
    noShowCount += 1;
  }

  if (updates.responseTime !== undefined) {
    responseCount += 1;
    totalResponseTime += updates.responseTime;
  }

  // 🔥 계산
  const noShowRate = tradeCount > 0 ? noShowCount / tradeCount : 0;
  const responseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

  // 🔥 종합 점수 계산
  const score = calculateReputationScore({
    rating,
    tradeCount,
    responseTime,
    noShowRate,
  });

  // 🔥 Firestore 업데이트
  const reputationData: ReputationData = {
    rating,
    tradeCount,
    noShowCount,
    noShowRate,
    responseTime,
    lastUpdated: new Date(),
    score,
  };

  await userRef.update({
    reputation: reputationData,
    totalRatings,
    totalResponseTime,
    responseCount,
  });

  logger.info("[updateUserReputation] 평판 업데이트 완료:", {
    userId,
    score,
    rating,
    tradeCount,
    noShowRate,
  });

  return reputationData;
}

/**
 * 사용자 평판 조회
 */
export async function getUserReputation(userId: string): Promise<ReputationData | null> {
  const userSnap = await db.collection("users").doc(userId).get();

  if (!userSnap.exists) {
    const data = userSnap.data();
    return (data?.reputation as ReputationData) || null;
  }

  return null;
}
