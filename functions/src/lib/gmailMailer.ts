import { google } from "googleapis";
import * as logger from "firebase-functions/logger";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

/**
 * Gmail API를 사용하여 이메일 발송
 * @param to 수신자 이메일
 * @param subject 이메일 제목
 * @param body 이메일 본문
 * @param pdfBuffer PDF 파일 버퍼
 */
export const sendReportEmail = async (
    to: string,
    subject: string,
    body: string,
    pdfBuffer: Buffer
): Promise<void> => {
    try {
        // 서비스 계정 JSON 경로 (환경변수 또는 기본값)
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./gmail-service-account.json";

        // 동적 import로 JSON 로드
        let CREDENTIALS;
        try {
            CREDENTIALS = require(credentialsPath);
        } catch (error) {
            logger.error("Gmail 서비스 계정 JSON을 찾을 수 없습니다:", credentialsPath);
            throw new Error(`Gmail 서비스 계정 파일을 찾을 수 없습니다: ${credentialsPath}`);
        }

        // JWT 클라이언트 생성
        const jwtClient = new google.auth.JWT(
            CREDENTIALS.client_email,
            undefined,
            CREDENTIALS.private_key,
            SCOPES
        );

        // 인증
        await jwtClient.authorize();

        // Gmail API 인스턴스 생성
        const gmail = google.gmail({ version: "v1", auth: jwtClient });

        // 발신자 이메일
        const sender = process.env.GMAIL_SENDER || CREDENTIALS.client_email;

        // MIME 메시지 구성
        const messageParts = [
            `From: YAGO VIBE <${sender}>`,
            `To: ${to}`,
            `Subject: ${subject}`,
            "MIME-Version: 1.0",
            "Content-Type: multipart/mixed; boundary=reportBoundary",
            "",
            "--reportBoundary",
            "Content-Type: text/plain; charset=utf-8",
            "Content-Transfer-Encoding: 7bit",
            "",
            body,
            "",
            "--reportBoundary",
            "Content-Type: application/pdf; name=weekly_report.pdf",
            "Content-Disposition: attachment; filename=weekly_report.pdf",
            "Content-Transfer-Encoding: base64",
            "",
            pdfBuffer.toString("base64"),
            "--reportBoundary--",
        ];

        const rawMessage = messageParts.join("\n").trim();
        const encodedMessage = Buffer.from(rawMessage)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        // 이메일 발송
        await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
            },
        });

        logger.info(`📧 AI 리포트 이메일 발송 완료: ${to}`);
    } catch (error: any) {
        logger.error(`❌ 이메일 발송 실패 (${to}):`, error.message);
        throw error;
    }
};

