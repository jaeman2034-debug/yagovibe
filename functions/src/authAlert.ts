/**
 * 🔥 SMS 인증 오류 자동 Slack 알림
 * 
 * 역할:
 * - auth_logs 컬렉션에 새 문서 생성 시 감지
 * - 중요한 에러만 필터링 (too-many-requests, quota, DAILY_LIMIT)
 * - Slack Webhook으로 실시간 알림
 * 
 * 포인트:
 * - 클라 로그는 이미 있음
 * - Cloud Functions가 auth_logs 감시 → 조건 만족 시 Slack 알림
 * - DAILY_LIMIT / too-many-requests 초기 징후 탐지
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

// 🔥 Slack Webhook URL (환경 변수에서 가져오기)
// 설정 방법: firebase functions:config:set slack.webhook="<SLACK_WEBHOOK_URL>"
const SLACK_WEBHOOK = functions.config().slack?.webhook;

/**
 * auth_logs 컬렉션에 새 문서가 생성될 때 실행
 * 중요한 SMS 인증 오류를 감지하고 Slack으로 알림
 */
export const alertOnPhoneAuthError = functions.firestore
  .document("auth_logs/{logId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();

    if (!data) {
      console.log("⚠️ [authAlert] 데이터 없음, 무시");
      return;
    }

    // ✅ 성공 이벤트는 무시
    if (data.type === "sms_success" || data.type === "verify_success") {
      console.log("✅ [authAlert] 성공 이벤트, 무시:", data.type);
      return;
    }

    // 🎯 중요한 에러만 알림
    const errorCode = data.errorCode || "";
    const errorMessage = data.errorMessage || "";

    const isCritical =
      errorCode.includes("too-many-requests") ||
      errorCode.includes("quota") ||
      errorCode.includes("quota-exceeded") ||
      errorCode.includes("DAILY_LIMIT") ||
      errorMessage.includes("too many") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("daily limit");

    if (!isCritical) {
      console.log("ℹ️ [authAlert] 일반 에러, 무시:", errorCode);
      return;
    }

    // 🔥 Slack Webhook URL이 없으면 로그만 남기고 종료
    if (!SLACK_WEBHOOK) {
      console.error("❌ [authAlert] Slack Webhook URL이 설정되지 않았습니다.");
      console.error("❌ [authAlert] 설정 방법: firebase functions:config:set slack.webhook=\"<SLACK_WEBHOOK_URL>\"");
      return;
    }

    // 📱 전화번호 마스킹
    const phoneNumber = data.phoneNumber || "-";
    const maskedPhone = phoneNumber
      ? phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3")
      : "-";

    // 🔔 Slack 메시지 구성
    const slackMessage = {
      text: "🚨 SMS 인증 오류 감지",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 SMS 인증 오류 감지",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*타입:*\n${data.type}`,
            },
            {
              type: "mrkdwn",
              text: `*전화번호:*\n${maskedPhone}`,
            },
            {
              type: "mrkdwn",
              text: `*에러 코드:*\n\`${errorCode || "-"}\``,
            },
            {
              type: "mrkdwn",
              text: `*에러 메시지:*\n${errorMessage || "-"}`,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `발생 시간: ${new Date().toLocaleString("ko-KR")}`,
            },
          ],
        },
      ],
    };

    try {
      // 🔔 Slack Webhook 호출
      const response = await fetch(SLACK_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(`Slack API 응답 오류: ${response.status} ${response.statusText}`);
      }

      console.log("✅ [authAlert] Slack 알림 전송 성공:", {
        logId: context.params.logId,
        type: data.type,
        errorCode,
      });
    } catch (error: any) {
      console.error("❌ [authAlert] Slack 알림 전송 실패:", error);
      // 🔥 알림 실패해도 함수는 성공으로 처리 (무한 재시도 방지)
    }
  });
