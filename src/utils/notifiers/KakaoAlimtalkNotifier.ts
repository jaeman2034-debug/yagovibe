// src/utils/notifiers/KakaoAlimtalkNotifier.ts
// 🔥 카카오 알림톡 프로바이더 (실전 구현)

import type { Notifier, Contact, Message, SendResult } from "./Notifier";
import type { NotificationPayload } from "@/domain/notification/types";

// 🔥 템플릿 코드 (승인용 · 고정)
export const KAKAO_TEMPLATE_CODES = {
  UNPAID_1M: "UNPAID_1M", // 미납 1개월
  UNPAID_2M: "UNPAID_2M", // 미납 2개월
  PAUSED_NOTICE: "PAUSED_NOTICE", // 휴원 처리
  MONTHLY_SUMMARY_ADMIN: "MONTHLY_SUMMARY_ADMIN", // 월간 요약
  MEMBER_ATTENTION_NEEDED: "MEMBER_ATTENTION_NEEDED", // 주의 필요 회원 알림
} as const;

export type KakaoTemplateCode = typeof KAKAO_TEMPLATE_CODES[keyof typeof KAKAO_TEMPLATE_CODES];

/**
 * 카카오 알림톡 Notifier
 * 
 * 🔥 표준 인터페이스 구현:
 * - send(payload): 표준 NotificationPayload 사용
 * - 채널별 변환은 내부에서 처리
 * - 실패 시 SendResult에 error 포함 (throw 하지 않음)
 */
export class KakaoAlimtalkNotifier implements Notifier {
  readonly name = "kakao" as const;
  private apiKey?: string;
  private apiUrl = "https://kapi.kakao.com/v2/api/talk/memo/default/send"; // 예시 URL

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VITE_KAKAO_API_KEY;
  }

  /**
   * 템플릿 코드 유효성 검사
   */
  validateTemplate(templateCode: string): boolean {
    return Object.values(KAKAO_TEMPLATE_CODES).includes(templateCode as KakaoTemplateCode);
  }

  /**
   * 표준화된 알림 발송
   * 
   * @param payload 알림 페이로드
   * @returns 발송 결과 (실패해도 throw 하지 않음)
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!payload.target.phone && !payload.target.phoneE164) {
      return {
        success: false,
        provider: this.name,
        error: "전화번호가 없습니다.",
      };
    }

    const templateCode = payload.templateId || payload.templateCode || "";
    if (!this.validateTemplate(templateCode)) {
      return {
        success: false,
        provider: this.name,
        error: `유효하지 않은 템플릿 코드: ${templateCode}`,
      };
    }

    try {
      // TODO: 실제 카카오 알림톡 API 연동
      // const response = await fetch(this.apiUrl, {
      //   method: "POST",
      //   headers: {
      //     "Authorization": `Bearer ${this.apiKey}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     receiver_phone_number: payload.target.phoneE164 || payload.target.phone,
      //     template_id: templateCode,
      //     template_args: payload.variables || {},
      //   }),
      // });

      // 🔥 스텁 구현 (실제 API 연동 전)
      console.log(`[Kakao Alimtalk] 발송 시도: ${payload.target.name || "알 수 없음"}`, {
        templateCode,
        variables: payload.variables,
        event: payload.event,
      });

      // 90% 성공 가정 (테스트용)
      const success = Math.random() > 0.1;

      if (success) {
        return {
          success: true,
          messageId: `kakao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: this.name,
        };
      } else {
        return {
          success: false,
          provider: this.name,
          error: "카카오 API 연동 필요 (스텁 모드)",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        provider: this.name,
        error: error.message || "카카오 알림톡 발송 실패",
      };
    }
  }

  /**
   * 레거시 호환 메서드 (기존 코드 지원)
   * @deprecated send(payload) 사용 권장
   */
  async sendLegacy(to: Contact, message: Message): Promise<SendResult> {
    if (!to.phoneE164) {
      return {
        success: false,
        provider: this.name,
        error: "전화번호가 없습니다.",
      };
    }

    if (!this.validateTemplate(message.templateCode)) {
      return {
        success: false,
        provider: this.name,
        error: `유효하지 않은 템플릿 코드: ${message.templateCode}`,
      };
    }

    try {
      // TODO: 실제 카카오 알림톡 API 연동
      // 예시 구조:
      // const response = await fetch(this.apiUrl, {
      //   method: "POST",
      //   headers: {
      //     "Authorization": `Bearer ${this.apiKey}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     receiver_phone_number: to.phoneE164,
      //     template_id: message.templateCode,
      //     template_args: message.variables,
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`카카오 API 오류: ${response.statusText}`);
      // }
      
      // const data = await response.json();
      // return {
      //   success: true,
      //   messageId: data.message_id,
      //   provider: this.name,
      // };

      // 🔥 스텁 구현 (실제 API 연동 전)
      console.log(`[Kakao Alimtalk] 발송 시도: ${to.phoneLast4 || "알 수 없음"}`, {
        templateCode: message.templateCode,
        variables: message.variables,
      });

      // 90% 성공 가정 (테스트용)
      const success = Math.random() > 0.1;
      
      if (success) {
        return {
          success: true,
          messageId: `kakao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: this.name,
        };
      } else {
        return {
          success: false,
          provider: this.name,
          error: "카카오 API 연동 필요 (스텁 모드)",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        provider: this.name,
        error: error.message || "카카오 알림톡 발송 실패",
      };
    }
  }

  estimateCost(payload: NotificationPayload | Message): number {
    // 카카오 알림톡은 일반적으로 무료 (비즈니스 계정 기준)
    return 0;
  }
}

