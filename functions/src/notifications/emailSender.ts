/**
 * 🔔 이메일 전송 유틸리티
 * 
 * SendGrid 우선, Gmail 대체
 * 실패해도 운영 흐름에 영향 없음
 */

import * as logger from "firebase-functions/logger";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * 이메일 전송 (SendGrid 우선, Gmail 대체)
 * 
 * 실패해도 운영 흐름에 영향 없음 (로그만 남김)
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, html, text } = params;

  try {
    // SendGrid API 키 확인
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!sendGridApiKey && (!gmailUser || !gmailPass)) {
      logger.warn(`⚠️ 이메일 설정이 없어 발송을 건너뜁니다. SENDGRID_API_KEY 또는 GMAIL_USER/GMAIL_PASS를 설정하세요.`);
      return false;
    }

    // 발신자 정보
    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || gmailUser || "noreply@yagovibe.com";
    const fromName = process.env.NOTIFICATION_FROM_NAME || "YAGO SPORTS 운영 시스템";

    // SendGrid 사용 (우선)
    if (sendGridApiKey) {
      try {
        const sgMail = await import("@sendgrid/mail");
        sgMail.default.setApiKey(sendGridApiKey);

        const msg = {
          to,
          from: {
            email: fromEmail,
            name: fromName,
          },
          subject,
          text,
          html,
        };

        await sgMail.default.send(msg);

        logger.info(`✅ 이메일 발송 성공 (SendGrid)`, {
          to,
          subject,
        });
        return true;
      } catch (sendGridError: any) {
        logger.error(`❌ SendGrid 발송 실패: ${sendGridError.message}`, {
          to,
          error: sendGridError.message,
        });
        // Gmail로 대체 시도
      }
    }

    // Gmail 사용 (SendGrid 실패 또는 Gmail만 있는 경우)
    if (gmailUser && gmailPass) {
      try {
        const nodemailer = await import("nodemailer");
        
        const transporter = nodemailer.default.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        const mailOptions = {
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject,
          html,
          text,
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info(`✅ 이메일 발송 성공 (Gmail)`, {
          to,
          subject,
          messageId: info.messageId,
        });
        return true;
      } catch (gmailError: any) {
        logger.error(`❌ Gmail 발송 실패: ${gmailError.message}`, {
          to,
          error: gmailError.message,
        });
        return false;
      }
    }

    logger.warn(`⚠️ 이메일 발송 방법이 없습니다.`);
    return false;
  } catch (error: any) {
    logger.error(`❌ 이메일 발송 오류: ${error.message}`, {
      to,
      subject,
      error: error.message,
      stack: error.stack,
    });
    // 알림 실패해도 운영 흐름에 영향 없음
    return false;
  }
}
