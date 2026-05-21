// src/domain/notification/types.ts
// 🔥 알림 도메인 타입 정의 (채널 독립적 설계)
// 
// 🎯 핵심 원칙:
// - 비즈니스 로직은 채널을 몰라야 한다
// - 채널 교체/추가/비활성화가 코드 수정 없이 가능
// - 실패 허용 (Fail-safe): 알림 실패 ≠ 비즈니스 실패

/**
 * 알림 채널 타입
 * 
 * @example
 * ```ts
 * const channel: NotificationChannel = 'kakao';
 * ```
 */
export type NotificationChannel = "kakao" | "sms" | "push" | "email";

/**
 * 알림 이벤트 타입
 * 
 * 비즈니스 도메인 이벤트를 나타냄
 * 
 * @example
 * ```ts
 * const event: NotificationEvent = 'FEE_PAID';
 * ```
 */
export type NotificationEvent =
  | "FEE_PAID"              // 회비 완납
  | "FEE_OVERDUE"           // 회비 미납
  | "FEE_REMINDER"          // 회비 알림
  | "MONTHLY_REPORT"        // 월간 리포트
  | "MATCH_REMINDER"        // 경기 일정 알림
  | "MEMBER_PAUSED"         // 회원 휴원 처리
  | "MEMBER_ATTENTION_NEEDED"; // 회원 주의 필요

/**
 * 알림 대상 정보
 * 
 * 채널별로 필요한 정보만 포함
 * - kakao/sms: phone 또는 phoneE164 필요
 * - push: deviceToken 필요
 * - email: email 필요
 */
export interface NotificationTarget {
  userId: string;
  phone?: string;           // 일반 전화번호
  phoneE164?: string;       // +821012345678 형식 (E.164)
  deviceToken?: string;     // FCM 토큰 (Push용)
  email?: string;           // 이메일 주소
  name?: string;            // 수신자 이름 (로그/표시용)
}

/**
 * 알림 페이로드 (채널 독립적)
 * 
 * 🔥 표준화된 구조:
 * - 모든 채널이 동일한 Payload 구조 사용
 * - 채널별 변환은 Notifier 내부 책임
 * 
 * @example
 * ```ts
 * const payload: NotificationPayload = {
 *   event: 'FEE_PAID',
 *   channel: 'kakao',
 *   target: {
 *     userId: 'user123',
 *     phoneE164: '+821012345678',
 *     name: '홍길동'
 *   },
 *   message: '✅ 2025-01 회비가 완납 처리되었습니다.',
 *   templateId: 'fee_paid_v1'
 * };
 * ```
 */
export interface NotificationPayload {
  // 필수 필드
  event: NotificationEvent;
  channel: NotificationChannel;
  target: NotificationTarget;
  message: string;

  // 선택 필드
  title?: string;                    // 알림 제목 (Push/Email용)

  // 채널별 설정
  templateId?: string;               // 카카오 템플릿 ID
  templateCode?: string;             // 템플릿 코드 (레거시 호환)
  variables?: Record<string, string>; // 템플릿 변수

  // 확장 데이터
  data?: Record<string, any>;        // Push 알림용 추가 데이터

  // 메타데이터
  teamId?: string;
  memberId?: string;
  priority?: "low" | "normal" | "high";
}

