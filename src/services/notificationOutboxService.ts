// src/services/notificationOutboxService.ts
// 🔥 알림 Outbox 서비스: 비즈니스 트랜잭션 안에서 호출
//
// 🎯 핵심 원칙:
// - 비즈니스 트랜잭션 안에서 "발송"을 직접 하지 않음
// - Outbox 레코드를 쌓고 워커가 처리
// - 멱등성 보장 (dedupeKey 유니크)

import { collection, doc, setDoc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NotificationPayload } from "@/domain/notification/types";
import type { NotificationOutbox } from "@/domain/notification/outbox";
import { generateDedupeKey } from "@/domain/notification/outbox";

/**
 * 알림을 Outbox에 등록
 * 
 * 🔥 사용 시점:
 * - 리포트 생성 완료 시
 * - 스케줄 시작 시점
 * - 비즈니스 트랜잭션 내부
 * 
 * 🔥 멱등성 보장:
 * - dedupeKey가 이미 존재하면 업데이트하지 않음 (중복 방지)
 * 
 * @param payload 알림 페이로드
 * @param dedupeKey 중복 방지 키 (생략 시 자동 생성)
 * @param nextAttemptAt 다음 시도 시각 (생략 시 즉시)
 * 
 * @example
 * ```ts
 * await enqueueNotification({
 *   event: 'MONTHLY_REPORT',
 *   channel: 'kakao',
 *   target: { userId, phoneE164 },
 *   message: '월간 리포트가 준비되었습니다.',
 *   templateId: 'monthly_report_v1',
 *   data: { yyyyMM, reportUrl }
 * }, `MONTHLY_REPORT:kakao:${teamId}:${yyyyMM}`);
 * ```
 */
export async function enqueueNotification(
  payload: NotificationPayload,
  dedupeKey?: string,
  nextAttemptAt?: Date
): Promise<NotificationOutbox> {
  // dedupeKey 자동 생성
  const key = dedupeKey || generateDedupeKey(payload);

  // Outbox 컬렉션 경로
  const outboxRef = doc(collection(db, "notificationOutbox"), key);

  // 기존 레코드 확인 (멱등성 보장)
  const existing = await getDoc(outboxRef);
  
  if (existing.exists()) {
    const existingData = existing.data() as NotificationOutbox;
    // 이미 존재하면 그대로 반환 (중복 방지)
    console.log(`[Outbox] 이미 존재하는 알림: ${key}`, {
      status: existingData.status,
      attempt: existingData.attempt,
    });
    return existingData;
  }

  // 새 Outbox 레코드 생성
  const now = new Date();
  const outbox: NotificationOutbox = {
    id: key,
    createdAt: now,
    updatedAt: now,
    payload,
    status: "PENDING",
    attempt: 0,
    nextAttemptAt: nextAttemptAt || now,
    dedupeKey: key,
  };

  // Firestore에 저장
  await setDoc(outboxRef, {
    ...outbox,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    nextAttemptAt: nextAttemptAt ? Timestamp.fromDate(nextAttemptAt) : serverTimestamp(),
  });

  console.log(`[Outbox] 알림 등록: ${key}`, {
    event: payload.event,
    channel: payload.channel,
    target: payload.target.userId,
  });

  return outbox;
}

/**
 * 여러 알림을 일괄 등록
 * 
 * @param notifications 알림 목록
 */
export async function enqueueNotifications(
  notifications: Array<{
    payload: NotificationPayload;
    dedupeKey?: string;
    nextAttemptAt?: Date;
  }>
): Promise<NotificationOutbox[]> {
  const results = await Promise.all(
    notifications.map(({ payload, dedupeKey, nextAttemptAt }) =>
      enqueueNotification(payload, dedupeKey, nextAttemptAt)
    )
  );
  return results;
}

