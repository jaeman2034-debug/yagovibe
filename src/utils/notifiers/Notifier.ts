// src/utils/notifiers/Notifier.ts
// 🔥 알림 채널 추상화: 비즈니스 로직은 채널을 몰라야 한다
//
// 🎯 핵심 원칙:
// - 채널 독립: 비즈니스 로직은 SMS인지 카카오인지 모름
// - 인터페이스 단일화: 모든 알림은 동일한 Payload 구조
// - 실패 허용: 알림 실패 ≠ 비즈니스 실패

import type { NotificationPayload, NotificationChannel } from "@/domain/notification/types";

/**
 * 발송 결과
 * 
 * 모든 채널이 동일한 결과 구조 반환
 */
export interface SendResult {
  success: boolean;
  messageId?: string;        // 프로바이더에서 발급한 메시지 ID
  provider: NotificationChannel;
  error?: string;             // 실패 시 에러 메시지
  cost?: number;             // 발송 비용 (선택, 원 단위)
}

/**
 * Notifier 인터페이스: 채널 추상화
 * 
 * 🔥 표준화된 인터페이스:
 * - send(payload): 표준 NotificationPayload 사용
 * - 채널별 변환은 내부에서 처리
 * - 실패 시 SendResult에 error 포함 (throw 하지 않음)
 * 
 * @example
 * ```ts
 * const notifier: Notifier = getNotifier('kakao');
 * const result = await notifier.send({
 *   event: 'FEE_PAID',
 *   channel: 'kakao',
 *   target: { userId: 'user123', phoneE164: '+821012345678' },
 *   message: '회비 완납되었습니다.',
 *   templateId: 'fee_paid_v1'
 * });
 * 
 * if (!result.success) {
 *   console.error('알림 발송 실패:', result.error);
 * }
 * ```
 */
export interface Notifier {
  /**
   * 채널 이름 (읽기 전용)
   */
  readonly name: NotificationChannel;
  
  /**
   * 표준화된 알림 발송
   * 
   * @param payload 알림 페이로드 (채널 독립적)
   * @returns 발송 결과 (실패해도 throw 하지 않음)
   * 
   * @throws 절대 throw 하지 않음 (Fail-safe 원칙)
   */
  send(payload: NotificationPayload): Promise<SendResult>;
}

// ============================================================================
// 레거시 호환 타입 (기존 코드 지원용)
// ============================================================================

/**
 * 연락처 정보 (레거시 호환용)
 * @deprecated NotificationTarget 사용 권장
 */
export interface Contact {
  memberId?: string;
  phoneE164?: string; // +821012345678 (암호화된 값 또는 별도 저장)
  phoneLast4?: string; // 로그용
  name?: string;
}

/**
 * 메시지 정보 (레거시 호환용)
 * @deprecated NotificationPayload 사용 권장
 */
export interface Message {
  templateCode: string; // 카카오 템플릿 코드 또는 SMS 템플릿 ID
  variables: Record<string, string>; // 템플릿 변수
  fallbackText?: string; // SMS 폴백용 일반 텍스트
}

