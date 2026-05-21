/**
 * 협회 월간 리포트 이메일 발송 서비스
 * 
 * 협회 운영 리포트 PDF를 협회 담당자에게 자동 발송
 * SendGrid 직접 사용 (Firebase Functions 최적화)
 */

import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * 이메일 발송 파라미터
 */
export interface SendMonthlyReportEmailParams {
  associationId: string;
  associationName: string;
  year: number;
  month: number;
  pdfUrl: string;
}

/**
 * 협회 리포트 설정 조회
 * 
 * report_settings 구조 사용 (recipients, enabled)
 * 하위 호환성: 기존 adminEmails/email/contactEmail 필드도 지원
 */
async function getAssociationReportRecipients(
  associationId: string
): Promise<{ recipients: string[]; enabled: boolean }> {
  try {
    const associationDoc = await db.doc(`associations/${associationId}`).get();
    
    if (!associationDoc.exists) {
      logger.warn(`협회를 찾을 수 없습니다: ${associationId}`);
      return { recipients: [], enabled: false };
    }

    const associationData = associationDoc.data();
    
    // report_settings 우선 사용
    if (associationData?.report_settings) {
      const settings = associationData.report_settings;
      const recipients = settings.recipients || [];
      const enabled = settings.enabled !== false; // 기본값 true
      
      // 유효성 검사 및 중복 제거
      const validRecipients = Array.from(
        new Set(recipients.filter((email: string) => email && typeof email === "string" && email.includes("@")))
      );
      
      return {
        recipients: validRecipients,
        enabled,
      };
    }

    // 하위 호환성: 기존 필드 사용 (마이그레이션 중)
    const emails: string[] = [];
    
    // 1. adminEmails (배열)
    if (associationData?.adminEmails && Array.isArray(associationData.adminEmails)) {
      emails.push(...associationData.adminEmails);
    }
    
    // 2. email (단일)
    if (associationData?.email && typeof associationData.email === "string") {
      emails.push(associationData.email);
    }
    
    // 3. contactEmail
    if (associationData?.contactEmail && typeof associationData.contactEmail === "string") {
      emails.push(associationData.contactEmail);
    }

    // 중복 제거 및 유효성 검사
    const uniqueEmails = Array.from(
      new Set(emails.filter((email) => email && typeof email === "string" && email.includes("@")))
    );

    if (uniqueEmails.length === 0) {
      logger.warn(`협회에 이메일 주소가 등록되어 있지 않습니다: ${associationId}`);
      // 환경 변수에서 기본 이메일 사용
      const fallbackEmail = process.env.ASSOCIATION_REPORT_EMAIL || process.env.ALERT_EMAIL_TO;
      if (fallbackEmail) {
        logger.info(`기본 이메일 주소 사용: ${fallbackEmail}`);
        return { recipients: [fallbackEmail], enabled: true };
      }
      return { recipients: [], enabled: false };
    }

    return { recipients: uniqueEmails, enabled: true };
  } catch (error: any) {
    logger.error(`협회 리포트 설정 조회 실패: ${error}`, {
      associationId,
    });
    throw error;
  }
}

/**
 * 협회 월간 리포트 이메일 발송
 * 
 * SendGrid 직접 사용 (최적화)
 * 
 * @example
 * ```typescript
 * await sendMonthlyReportEmail({
 *   associationId: "assoc-nowon-football",
 *   associationName: "노원구축구협회",
 *   year: 2026,
 *   month: 1,
 *   pdfUrl: "https://storage.googleapis.com/...",
 * });
 * ```
 */
export async function sendMonthlyReportEmail(
  params: SendMonthlyReportEmailParams
): Promise<void> {
  const { associationId, associationName, year, month, pdfUrl } = params;

  try {
    // SendGrid API 키 확인
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!sendGridApiKey && (!gmailUser || !gmailPass)) {
      logger.warn(`⚠️ 이메일 설정이 없어 발송을 건너뜁니다. SENDGRID_API_KEY 또는 GMAIL_USER/GMAIL_PASS를 설정하세요.`);
      return;
    }

    // 협회 리포트 설정 조회
    const { recipients: recipientEmails, enabled } = await getAssociationReportRecipients(associationId);

    // 자동 발송 비활성화 체크
    if (!enabled) {
      logger.info(`⚠️ 자동 리포트 발송이 비활성화되어 있어 발송을 건너뜁니다: ${associationId}`);
      return;
    }

    if (recipientEmails.length === 0) {
      logger.warn(`⚠️ 수신자 이메일이 없어 발송을 건너뜁니다: ${associationId}`);
      return;
    }

    // 월 이름 매핑
    const monthNames = [
      "1월",
      "2월",
      "3월",
      "4월",
      "5월",
      "6월",
      "7월",
      "8월",
      "9월",
      "10월",
      "11월",
      "12월",
    ];
    const monthName = monthNames[month - 1];

    // 이메일 제목
    const subject = `[${associationName}] ${year}년 ${monthName} 월간 운영 리포트 (자동 생성)`;

    // 이메일 본문 (HTML)
    const htmlBody = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${associationName} ${year}년 ${monthName} 운영 리포트가 자동 생성되었습니다.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${pdfUrl}" 
         target="_blank"
         style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        ▶ 월간 운영 리포트 PDF 다운로드
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.8; margin-top: 30px;">
      본 리포트는 대관 운영 현황, 회원 우선 배정 사용률,<br/>
      비회원 대기 및 회원 전환 현황을 요약한 자료입니다.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      감사합니다.<br/>
      YAGO SPORTS 운영 시스템
    </p>
  </div>
</body>
</html>
    `.trim();

    // 발신자 이메일 주소
    const fromEmail = process.env.REPORT_FROM_EMAIL || gmailUser || "noreply@yagovibe.com";
    const fromName = "YAGO SPORTS 운영 시스템";

    // SendGrid 사용 (우선)
    if (sendGridApiKey) {
      try {
        // 동적 import (필요 시에만 로드)
        const sgMail = await import("@sendgrid/mail");
        sgMail.default.setApiKey(sendGridApiKey);

        const msg = {
          to: recipientEmails,
          from: {
            email: fromEmail,
            name: fromName,
          },
          subject,
          html: htmlBody,
          // PDF는 링크로만 제공 (첨부 파일은 추후 필요 시 추가)
        };

        await sgMail.default.send(msg);

        logger.info(`✅ 월간 리포트 이메일 발송 성공 (SendGrid)`, {
          associationId,
          associationName,
          year,
          month,
          recipients: recipientEmails,
        });
        return;
      } catch (sgError: any) {
        logger.error(`❌ SendGrid 발송 실패, Gmail로 폴백: ${sgError.message}`, {
          associationId,
          error: sgError.message,
        });
        // Gmail로 폴백
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
          to: recipientEmails.join(", "),
          subject,
          html: htmlBody,
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info(`✅ 월간 리포트 이메일 발송 성공 (Gmail)`, {
          associationId,
          associationName,
          year,
          month,
          recipients: recipientEmails,
          messageId: info.messageId,
        });
        return;
      } catch (gmailError: any) {
        logger.error(`❌ Gmail 발송 실패: ${gmailError.message}`, {
          associationId,
          error: gmailError.message,
        });
        throw gmailError;
      }
    }

    throw new Error("이메일 발송 방법이 없습니다.");
  } catch (error: any) {
    logger.error(`❌ 월간 리포트 이메일 발송 실패: ${error}`, {
      associationId,
      associationName,
      year,
      month,
      error: error.message,
      stack: error.stack,
    });
    // 이메일 발송 실패는 전체 프로세스를 중단시키지 않음
    // 추후 report_send_logs 컬렉션에 기록하여 수동 재전송 가능하게 확장
    throw error;
  }
}
