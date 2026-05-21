// src/utils/notifiers/SmsNotifier.ts
// 🔥 SMS 프로바이더 (폴백 전용)
//
// 🎯 표준 인터페이스 구현:
// - send(payload): 표준 NotificationPayload 사용
// - 카카오 실패 시 자동 폴백으로 사용

import type { Notifier, SendResult } from "./Notifier";
import type { NotificationPayload } from "@/domain/notification/types";

/**
 * SMS Notifier
 * 
 * 🔥 표준 인터페이스 구현:
 * - send(payload): 표준 NotificationPayload 사용
 * - 채널별 변환은 내부에서 처리
 * - 실패 시 SendResult에 error 포함 (throw 하지 않음)
 */
export class SmsNotifier implements Notifier {
  readonly name = "sms" as const;
  private apiKey?: string;
  private apiUrl = "https://api.sms-provider.com/send"; // 예시 URL

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VITE_SMS_API_KEY;
  }

  /**
   * 표준화된 알림 발송
   * 
   * @param payload 알림 페이로드
   * @returns 발송 결과 (실패해도 throw 하지 않음)
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    // 전화번호 검증
    if (!payload.target.phone && !payload.target.phoneE164) {
      return {
        success: false,
        provider: this.name,
        error: "전화번호가 없습니다.",
      };
    }

    try {
      // SMS 텍스트 생성 (payload.message 또는 템플릿 변환)
      const smsText = this.buildSmsText(payload);

      // TODO: 실제 SMS API 연동 (예: 알리고, 카카오 SMS 등)
      // const response = await fetch(this.apiUrl, {
      //   method: "POST",
      //   headers: {
      //     "Authorization": `Bearer ${this.apiKey}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     to: payload.target.phoneE164 || payload.target.phone,
      //     text: smsText,
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`SMS API 오류: ${response.statusText}`);
      // }
      
      // const data = await response.json();
      // return {
      //   success: true,
      //   messageId: data.message_id,
      //   provider: this.name,
      //   cost: data.cost || 20, // SMS는 보통 건당 20원
      // };

      // 🔥 스텁 구현 (실제 API 연동 전)
      console.log(`[SMS] 폴백 발송 시도: ${payload.target.name || "알 수 없음"}`, {
        text: smsText,
        event: payload.event,
      });

      // 95% 성공 가정 (테스트용)
      const success = Math.random() > 0.05;
      
      if (success) {
        return {
          success: true,
          messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: this.name,
          cost: 20, // SMS 건당 20원 가정
        };
      } else {
        return {
          success: false,
          provider: this.name,
          error: "SMS API 연동 필요 (스텁 모드)",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        provider: this.name,
        error: error.message || "SMS 발송 실패",
      };
    }
  }

  /**
   * SMS 텍스트 생성
   * 
   * payload.message를 우선 사용하고,
   * 템플릿 변수가 있으면 변환
   */
  private buildSmsText(payload: NotificationPayload): string {
    // payload.message가 있으면 우선 사용
    if (payload.message) {
      // 템플릿 변수 치환
      if (payload.variables) {
        let text = payload.message;
        for (const [key, value] of Object.entries(payload.variables)) {
          text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return text;
      }
      return payload.message;
    }

    // 템플릿 코드 기반 변환 (레거시 호환)
    const templateCode = payload.templateCode || payload.templateId || "";
    const vars = payload.variables || {};
    
    if (templateCode === "UNPAID_1M" || payload.event === "FEE_OVERDUE") {
      return `${vars.memberName || payload.target.name || "회원"}님, ${vars.month || ""} 회비 ${vars.dueAmount || ""}원이 미납입니다. 납부 확인 부탁드립니다.`;
    } else if (templateCode === "UNPAID_2M") {
      return `${vars.memberName || payload.target.name || "회원"}님, 회비가 2개월 미납입니다. 정관 기준 3개월 이상 시 휴원/징계 처리될 수 있습니다.`;
    } else if (templateCode === "PAUSED_NOTICE" || payload.event === "MEMBER_PAUSED") {
      return `${vars.memberName || payload.target.name || "회원"}님, 회비 ${vars.unpaidMonths || ""}개월 미납으로 상태가 '휴원'으로 변경되었습니다. 납부 후 총무에게 말씀해 주세요.`;
    } else if (templateCode === "MONTHLY_SUMMARY_ADMIN" || payload.event === "MONTHLY_REPORT") {
      return `${vars.month || ""} 정산 완료: 수납 ${vars.collected || 0}원 / 미납 ${vars.unpaidCount || 0}명 / 휴원 ${vars.pausedCount || 0}명`;
    }
    
    // 기본 메시지
    return payload.message || "알림이 있습니다.";
  }
}

