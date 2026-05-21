/**
 * 🔥 Send Email Cloud Function
 * 
 * 역할:
 * - SendGrid를 통한 이메일 발송
 * - 구독 설정 확인
 * - 템플릿 적용
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../firebaseAdmin";
import { getEmailTemplate } from "./emailTemplates";
import type { EmailNotificationType } from "../types/email";

const db = getFirestore();

// SendGrid API Key (환경 변수에서 가져오기)
// const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
// const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@yagosports.com";

/**
 * 이메일 발송 Cloud Function
 * 
 * Note: SendGrid 연동은 실제 API Key 설정 후 활성화
 */
export const sendEmail = onCall(
  {
    region: "asia-northeast3",
  },
  async (request) => {
    try {
      const { to, subject, html, text, type, data } = request.data;

      if (!to || !subject) {
        throw new Error("to와 subject는 필수입니다");
      }

      // 템플릿 사용 시
      if (type && data) {
        const template = getEmailTemplate(type as EmailNotificationType, data);
        return await sendEmailInternal(to, template.subject, template.html, template.text);
      }

      // 직접 HTML/Text 제공 시
      return await sendEmailInternal(to, subject, html, text);
    } catch (error: any) {
      logger.error("❌ [sendEmail] 이메일 발송 실패:", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
);

/**
 * 실제 이메일 발송 (SendGrid 연동)
 * 
 * Note: 실제 SendGrid 연동 시 주석 해제 및 구현
 */
async function sendEmailInternal(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string }> {
  // TODO: SendGrid 연동
  // const sgMail = require("@sendgrid/mail");
  // sgMail.setApiKey(SENDGRID_API_KEY);

  // const msg = {
  //   to,
  //   from: SENDGRID_FROM_EMAIL,
  //   subject,
  //   text: text || html.replace(/<[^>]*>/g, ""),
  //   html,
  // };

  // try {
  //   const [response] = await sgMail.send(msg);
  //   logger.info("✅ [sendEmailInternal] 이메일 발송 성공:", {
  //     to,
  //     statusCode: response.statusCode,
  //   });
  //   return { success: true, messageId: response.headers["x-message-id"] };
  // } catch (error: any) {
  //   logger.error("❌ [sendEmailInternal] SendGrid 오류:", error);
  //   throw error;
  // }

  // 임시: 로그만 출력 (SendGrid 연동 전)
  logger.info("📧 [sendEmailInternal] 이메일 발송 요청 (SendGrid 미연동):", {
    to,
    subject,
  });

  return { success: true };
}

/**
 * 알림 타입별 이메일 발송
 */
export async function sendNotificationEmail(
  userId: string,
  type: EmailNotificationType,
  data: Record<string, any>
): Promise<void> {
  try {
    // 구독 설정 확인
    const subscriptionRef = db.doc(`email_subscriptions/${userId}`);
    const subscriptionSnap = await subscriptionRef.get();

    if (!subscriptionSnap.exists) {
      logger.info("⚠️ [sendNotificationEmail] 구독 설정 없음:", userId);
      return;
    }

    const subscription = subscriptionSnap.data();
    if (!subscription?.enabled) {
      logger.info("⚠️ [sendNotificationEmail] 이메일 구독 비활성화:", userId);
      return;
    }

    const preferences = subscription.preferences || {};
    if (!preferences[type]) {
      logger.info("⚠️ [sendNotificationEmail] 알림 타입 구독 안함:", {
        userId,
        type,
      });
      return;
    }

    const email = subscription.email;
    if (!email) {
      logger.warn("⚠️ [sendNotificationEmail] 이메일 주소 없음:", userId);
      return;
    }

    // 템플릿 생성
    const template = getEmailTemplate(type, data);

    // 이메일 발송
    await sendEmailInternal(email, template.subject, template.html, template.text);

    logger.info("✅ [sendNotificationEmail] 이메일 발송 완료:", {
      userId,
      type,
      email,
    });
  } catch (error: any) {
    logger.error("❌ [sendNotificationEmail] 이메일 발송 실패:", {
      error: error.message,
      userId,
      type,
    });
  }
}
