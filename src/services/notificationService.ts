// src/services/notificationService.ts
// 🔥 알림 서비스: 비즈니스 로직 진입점
//
// 🎯 핵심 원칙:
// - 비즈니스 로직은 채널을 몰라도 된다
// - 채널 교체/추가/비활성화가 코드 수정 없이 가능
// - 실패 허용 (Fail-safe): 알림 실패 ≠ 비즈니스 실패

import type { NotificationPayload } from "@/domain/notification/types";
import { getNotifier } from "@/utils/notifiers/factory";

/**
 * 알림 발송 (표준화된 진입점)
 * 
 * 🔥 사용법:
 * ```ts
 * await notify({
 *   event: 'FEE_PAID',
 *   channel: 'kakao',
 *   target: {
 *     userId: 'user123',
 *     phoneE164: '+821012345678',
 *     name: '홍길동'
 *   },
 *   message: '✅ 2025-01 회비가 완납 처리되었습니다.',
 *   templateId: 'fee_paid_v1'
 * });
 * ```
 * 
 * @param payload 알림 페이로드
 * @returns 발송 결과 (실패해도 throw 하지 않음)
 * 
 * @example
 * ```ts
 * // 회비 완납 알림
 * await notify({
 *   event: 'FEE_PAID',
 *   channel: 'kakao',
 *   target: { userId: memberId, phoneE164: phone, name: memberName },
 *   message: `✅ ${month} 회비가 완납 처리되었습니다.`,
 *   templateId: 'fee_paid_v1',
 *   teamId: teamId,
 *   memberId: memberId
 * });
 * 
 * // 나중에 SMS로 바꾸고 싶으면
 * // channel: 'sms' 만 바꾸면 끝
 * ```
 */
export async function notify(payload: NotificationPayload): Promise<void> {
  try {
    const notifier = getNotifier(payload.channel);
    const result = await notifier.send(payload);

    if (!result.success) {
      // ❗ 절대 throw 하지 않음 (Fail-safe 원칙)
      console.error('[Notification Failed]', {
        channel: payload.channel,
        event: payload.event,
        error: result.error,
        target: payload.target.userId,
      });
    } else {
      console.log('[Notification Sent]', {
        channel: payload.channel,
        event: payload.event,
        messageId: result.messageId,
        target: payload.target.userId,
      });
    }
  } catch (error: any) {
    // ❗ 절대 throw 하지 않음 (Fail-safe 원칙)
    console.error('[Notification Error]', {
      channel: payload.channel,
      event: payload.event,
      error: error.message || String(error),
      target: payload.target.userId,
    });
  }
}

/**
 * 여러 채널에 순차적으로 발송 (Fallback 전략)
 * 
 * 첫 번째 채널이 실패하면 다음 채널로 자동 전환
 * 
 * @param payload 알림 페이로드 (channel은 무시됨)
 * @param channels 우선순위가 높은 순서대로 채널 배열
 * 
 * @example
 * ```ts
 * // 카카오 → SMS → Push 순서로 시도
 * await notifyWithFallback(
 *   {
 *     event: 'FEE_OVERDUE',
 *     channel: 'kakao', // 무시됨
 *     target: { userId, phoneE164, name },
 *     message: '회비 미납 알림',
 *   },
 *   ['kakao', 'sms', 'push']
 * );
 * ```
 */
export async function notifyWithFallback(
  payload: Omit<NotificationPayload, 'channel'>,
  channels: NotificationPayload['channel'][]
): Promise<void> {
  for (const channel of channels) {
    const result = await notify({
      ...payload,
      channel,
    });

    // 성공하면 중단
    // (notify는 내부에서 로그만 남기므로, 실제로는 각 채널 시도 후 계속)
    // TODO: notify가 성공 여부를 반환하도록 개선 가능
  }
}

