// src/domain/notification/outbox.ts
// 🔥 알림 Outbox 패턴: 비즈니스 트랜잭션과 발송 완전 분리
//
// 🎯 핵심 원칙:
// - 비즈니스 트랜잭션 안에서 "발송"을 직접 하지 않음
// - DB에 Outbox 레코드를 쌓고 워커가 처리
// - 멱등성 보장 (dedupeKey)
// - Fail-safe + 재시도

import type { NotificationPayload } from "./types";

/**
 * 알림 상태
 */
export type NotificationStatus = 
  | "PENDING"      // 대기 중
  | "PROCESSING"   // 처리 중 (Claim됨)
  | "SENT"         // 발송 완료
  | "FAILED"       // 실패 (재시도 가능)
  | "DEAD";        // 영구 실패 (재시도 불가)

/**
 * 알림 Outbox 레코드
 * 
 * 🔥 저장 시점:
 * - 리포트 생성 완료 시
 * - 스케줄 시작 시점
 * - 비즈니스 트랜잭션 내부
 * 
 * 🔥 처리 시점:
 * - 워커가 주기적으로 조회하여 발송
 */
export interface NotificationOutbox {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // 기존 표준 payload 그대로 저장 (= 표준 유지)
  payload: NotificationPayload;

  status: NotificationStatus;
  attempt: number;              // 시도 횟수
  nextAttemptAt?: Date;         // 다음 시도 시각
  lastError?: string;            // 마지막 에러 메시지

  // 중복 방지 키 (유니크 인덱스)
  // 예: `FEE_PAID:kakao:user123:2025-01`
  dedupeKey: string;

  // Claim 패턴 필드 (선택)
  workerId?: string;             // Claim한 워커 ID
  claimedAt?: Date;              // Claim 시각
  leaseExpiresAt?: Date;         // Lease 만료 시각
}

/**
 * Outbox 생성 파라미터
 */
export interface CreateOutboxParams {
  payload: NotificationPayload;
  dedupeKey: string;
  nextAttemptAt?: Date;
}

/**
 * Outbox 업데이트 파라미터
 */
export interface UpdateOutboxParams {
  status: NotificationStatus;
  attempt?: number;
  nextAttemptAt?: Date;
  lastError?: string;
}

/**
 * dedupeKey 생성 헬퍼
 * 
 * @example
 * ```ts
 * const key = generateDedupeKey({
 *   event: 'FEE_PAID',
 *   channel: 'kakao',
 *   target: { userId: 'user123' },
 *   teamId: 'team1',
 *   memberId: 'member1'
 * }, '2025-01');
 * // => "FEE_PAID:kakao:team1:member1:2025-01"
 * ```
 */
export function generateDedupeKey(
  payload: NotificationPayload,
  timeKey?: string  // yyyyMM 또는 timestamp
): string {
  const parts = [
    payload.event,
    payload.channel,
    payload.teamId || "",
    payload.memberId || payload.target.userId,
    timeKey || new Date().toISOString().slice(0, 10), // 기본: YYYY-MM-DD
  ];
  return parts.join(":");
}

