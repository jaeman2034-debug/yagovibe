// src/utils/notifiers/PushNotifier.ts
// 🔥 Push 알림 프로바이더 (FCM 기반)
//
// 🎯 표준 인터페이스 구현:
// - send(payload): 표준 NotificationPayload 사용
// - FCM 토큰 기반 푸시 알림 발송

import type { Notifier, SendResult } from "./Notifier";
import type { NotificationPayload } from "@/domain/notification/types";
// 🔥 FCM send는 서버 사이드 전용이므로 클라이언트에서는 Cloud Functions 호출 필요
// import { getMessaging, send } from "firebase/messaging";
// import { app } from "@/lib/firebase";

/**
 * Push Notifier (FCM)
 * 
 * 🔥 표준 인터페이스 구현:
 * - send(payload): 표준 NotificationPayload 사용
 * - 채널별 변환은 내부에서 처리
 * - 실패 시 SendResult에 error 포함 (throw 하지 않음)
 */
export class PushNotifier implements Notifier {
  readonly name = "push" as const;

  /**
   * 표준화된 알림 발송
   * 
   * @param payload 알림 페이로드
   * @returns 발송 결과 (실패해도 throw 하지 않음)
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    // FCM 토큰 검증
    if (!payload.target.deviceToken) {
      return {
        success: false,
        provider: this.name,
        error: "FCM 토큰이 없습니다.",
      };
    }

    try {
      // 🔥 FCM send는 서버 사이드 전용
      // 클라이언트에서는 Cloud Functions를 통해 발송해야 함
      // TODO: Cloud Functions 호출로 변경
      // const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
      // const result = await sendPushNotification({
      //   token: payload.target.deviceToken,
      //   notification: {
      //     title: payload.title || this.getDefaultTitle(payload.event),
      //     body: payload.message,
      //   },
      //   data: {
      //     event: payload.event,
      //     teamId: payload.teamId || "",
      //     memberId: payload.memberId || "",
      //     ...payload.data,
      //   },
      //   priority: payload.priority || "normal",
      // });
      
      // FCM 메시지 구성 (로깅용)
      const message = {
        token: payload.target.deviceToken,
        notification: {
          title: payload.title || this.getDefaultTitle(payload.event),
          body: payload.message,
        },
        data: {
          event: payload.event,
          teamId: payload.teamId || "",
          memberId: payload.memberId || "",
          ...payload.data,
        },
        priority: payload.priority || "normal",
      };
      
      // 🔥 스텁 구현 (실제 FCM 연동 전)
      console.log(`[Push] 발송 시도: ${payload.target.name || "알 수 없음"}`, {
        title: message.notification.title,
        body: message.notification.body,
        event: payload.event,
      });

      // 90% 성공 가정 (테스트용)
      const success = Math.random() > 0.1;
      
      if (success) {
        return {
          success: true,
          messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: this.name,
        };
      } else {
        return {
          success: false,
          provider: this.name,
          error: "FCM API 연동 필요 (스텁 모드)",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        provider: this.name,
        error: error.message || "Push 알림 발송 실패",
      };
    }
  }

  /**
   * 이벤트별 기본 제목 생성
   */
  private getDefaultTitle(event: NotificationPayload["event"]): string {
    const titles: Record<NotificationPayload["event"], string> = {
      FEE_PAID: "✅ 회비 완납",
      FEE_OVERDUE: "⚠️ 회비 미납 알림",
      FEE_REMINDER: "📢 회비 알림",
      MONTHLY_REPORT: "📊 월간 리포트",
      MATCH_REMINDER: "⚽ 경기 일정 알림",
      MEMBER_PAUSED: "⏸️ 회원 상태 변경",
      MEMBER_ATTENTION_NEEDED: "🔔 회원 주의 필요",
    };
    return titles[event] || "알림";
  }
}

