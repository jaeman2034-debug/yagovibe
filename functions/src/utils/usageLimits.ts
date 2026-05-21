/**
 * 🔥 Usage 제한 판단 로직 (서버 전용)
 * 
 * 핵심 원칙:
 * - 차단 판단은 서버에서만
 * - plan + usage 함께 판단
 * - Free 한도 도달 시 Upgrade 유도
 */

import type { UsageLimits, TeamUsage, UsageCheckResult } from "../types/usage";
import { USAGE_LIMITS } from "../types/usage";

/**
 * Usage 제한 체크
 * 
 * @param plan - 팀 플랜
 * @param usage - 현재 사용량
 * @returns 제한 통과 여부 및 사유
 */
export function checkUsageLimit({
  plan,
  usage,
}: {
  plan: "free" | "pro" | "academy_pro";
  usage: TeamUsage;
}): UsageCheckResult {
  // Pro는 무제한 (제한 체크 스킵)
  if (plan === "pro" || plan === "academy_pro") {
    return { ok: true };
  }

  const limits = USAGE_LIMITS[plan];

  // 멤버 수 체크
  if (usage.membersCount > limits.membersCount) {
    return {
      ok: false,
      reason: "MEMBER_LIMIT",
      limit: limits,
      current: usage,
    };
  }

  // 월 액션 체크
  if (usage.actionsThisMonth > limits.actionsThisMonth) {
    return {
      ok: false,
      reason: "ACTION_LIMIT",
      limit: limits,
      current: usage,
    };
  }

  // 저장 용량 체크
  if (usage.storageMB > limits.storageMB) {
    return {
      ok: false,
      reason: "STORAGE_LIMIT",
      limit: limits,
      current: usage,
    };
  }

  return { ok: true };
}

/**
 * Usage 증가 (트랜잭션 내에서 사용)
 * 
 * ⚠️ 주의: 이 함수는 트랜잭션 내에서만 사용
 */
export function incrementUsageInTransaction(
  transaction: any,
  usageRef: any,
  increment: {
    actionsThisMonth?: number;
    storageMB?: number;
  }
) {
  const update: any = {
    updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
  };

  if (increment.actionsThisMonth !== undefined) {
    update.actionsThisMonth = require("firebase-admin").firestore.FieldValue.increment(
      increment.actionsThisMonth
    );
  }

  if (increment.storageMB !== undefined) {
    update.storageMB = require("firebase-admin").firestore.FieldValue.increment(
      increment.storageMB
    );
  }

  transaction.update(usageRef, update);
}

/**
 * Usage 문서 초기화 (월 초기화용)
 */
export function initializeUsage(teamId: string): {
  membersCount: number;
  actionsThisMonth: number;
  storageMB: number;
  updatedAt: any;
} {
  return {
    membersCount: 0,
    actionsThisMonth: 0,
    storageMB: 0,
    updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
  };
}
