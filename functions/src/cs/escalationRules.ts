/**
 * 🔥 CS 에스컬레이션 규칙 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 에스컬레이션 조건 체크
 * - 자동 에스컬레이션 처리
 * - 우선순위 관리
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 에스컬레이션 조건
const ESCALATION_TIME_HOURS = 48; // 48시간 초과 시 에스컬레이션
const ESCALATION_RETRY_COUNT = 3; // 3회 재시도 후 에스컬레이션
const ESCALATION_PRIORITY_THRESHOLD = 8; // 우선순위 8 이상 시 즉시 에스컬레이션

/**
 * 에스컬레이션 조건 체크
 */
export async function checkEscalationConditions(dispute: any): Promise<{
  shouldEscalate: boolean;
  reason: string;
  priority: number;
}> {
  const now = Timestamp.now();
  const createdAt = dispute.createdAt?.toDate() || new Date();
  const hoursSinceCreation = (now.toMillis() - createdAt.getTime()) / (1000 * 60 * 60);

  // 🔥 1. 시간 기반 에스컬레이션 (48시간 초과)
  if (hoursSinceCreation >= ESCALATION_TIME_HOURS) {
    return {
      shouldEscalate: true,
      reason: "TIME_EXCEEDED",
      priority: 10,
    };
  }

  // 🔥 2. 재시도 기반 에스컬레이션 (3회 재시도 후)
  const retryCount = dispute.retryCount || 0;
  if (retryCount >= ESCALATION_RETRY_COUNT) {
    return {
      shouldEscalate: true,
      reason: "RETRY_EXCEEDED",
      priority: 9,
    };
  }

  // 🔥 3. 우선순위 기반 에스컬레이션 (우선순위 8 이상)
  const priority = dispute.priority || 0;
  if (priority >= ESCALATION_PRIORITY_THRESHOLD) {
    return {
      shouldEscalate: true,
      reason: "HIGH_PRIORITY",
      priority: priority,
    };
  }

  // 🔥 4. 금액 기반 에스컬레이션 (100만원 이상)
  const amount = dispute.amount || 0;
  if (amount >= 1000000) {
    return {
      shouldEscalate: true,
      reason: "HIGH_AMOUNT",
      priority: 8,
    };
  }

  // 🔥 5. 반복 분쟁 기반 에스컬레이션 (동일 사용자 3회 이상)
  const userId = dispute.userId;
  const userDisputes = await db
    .collection("disputes")
    .where("userId", "==", userId)
    .where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    .get();

  if (userDisputes.size >= 3) {
    return {
      shouldEscalate: true,
      reason: "REPEATED_DISPUTES",
      priority: 7,
    };
  }

  return {
    shouldEscalate: false,
    reason: "",
    priority: 0,
  };
}

/**
 * 에스컬레이션 처리
 */
export async function escalateDispute(
  disputeId: string,
  reason: string,
  priority: number
): Promise<void> {
  await db.collection("disputes").doc(disputeId).update({
    stage: "ESCALATED",
    escalatedAt: FieldValue.serverTimestamp(),
    escalatedTo: "ADMIN",
    escalationReason: reason,
    priority,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 🔥 관리자 알림 (관리자 알림 시스템 연동 필요)
  logger.warn("[escalateDispute] 분쟁 에스컬레이션:", {
    disputeId,
    reason,
    priority,
  });
}
