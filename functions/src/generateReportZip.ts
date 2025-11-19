import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import JSZip from "jszip";
import * as nodemailer from "nodemailer";

// Firebase Admin 초기화
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();
const storage = getStorage().bucket();

/**
 * 요약 텍스트 가져오기
 */
async function getSummaryText(): Promise<string> {
    try {
        const summaryDoc = await db.collection("reports").doc("weekly").collection("data").doc("summary").get();
        if (summaryDoc.exists) {
            const summaryData = summaryDoc.data();
            const summaryText = `${summaryData?.highlight || ""}\n${summaryData?.recommendation || ""}`.trim();
            if (summaryText) {
                return summaryText.slice(0, 200) + (summaryText.length > 200 ? "…" : "");
            }
        }
    } catch (err) {
        logger.warn("⚠️ 요약 데이터를 불러올 수 없습니다.", err);
    }
    return "요약 내용이 없습니다.";
}

/**
 * 멀티 플랫폼 알림 전송 (Slack + Discord + Telegram + Gmail)
 */
async function sendMultiPlatformNotification(zipUrl: string) {
    try {
        // 요약 텍스트 가져오기
        const summary = await getSummaryText();
        
        // 기본 메시지 템플릿
        const baseMessage = `🎉 *YAGO VIBE SPORTS 주간 AI 리포트 업데이트!*\n\n` +
            `🧠 _${summary}_\n\n` +
            `📎 ${zipUrl}\n\n` +
            `📦 포함 내용: 📄 PDF 요약 + 🔊 TTS 음성 파일\n\n` +
            `🕒 생성 시각: ${new Date().toLocaleString("ko-KR")}`;
        
        // 0️⃣ 이메일 알림 (최우선)
        await sendEmailNotification(zipUrl, summary);

        // 1️⃣ Slack 알림
        const slackWebhook = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhook) {
            try {
                const slackMessage = `🎉 *YAGO VIBE SPORTS 주간 AI 리포트 업데이트!*\n\n` +
                    `🧠 _${summary}_\n\n` +
                    `📎 <${zipUrl}|ZIP 다운로드 링크>\n\n` +
                    `📦 포함 내용: 📄 PDF 요약 + 🔊 TTS 음성 파일\n\n` +
                    `🕒 생성 시각: ${new Date().toLocaleString("ko-KR")}`;

                const response = await fetch(slackWebhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: slackMessage }),
                });

                if (response.ok) {
                    logger.info("✅ Slack 알림 발송 완료");
                } else {
                    logger.error(`❌ Slack 알림 발송 실패: ${response.status}`);
                }
            } catch (err: any) {
                logger.error("❌ Slack 알림 발송 오류:", err.message);
            }
        } else {
            logger.warn("⚠️ SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
        }

        // 2️⃣ Discord 알림
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        if (discordWebhook) {
            try {
                const response = await fetch(discordWebhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: baseMessage }),
                });

                if (response.ok) {
                    logger.info("✅ Discord 알림 발송 완료");
                } else {
                    logger.error(`❌ Discord 알림 발송 실패: ${response.status}`);
                }
            } catch (err: any) {
                logger.error("❌ Discord 알림 발송 오류:", err.message);
            }
        } else {
            logger.warn("⚠️ DISCORD_WEBHOOK_URL이 설정되지 않았습니다.");
        }

        // 3️⃣ Telegram 알림
        const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        if (telegramBotToken && telegramChatId) {
            try {
                const response = await fetch(
                    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: telegramChatId,
                            text: baseMessage,
                            parse_mode: "Markdown",
                        }),
                    }
                );

                if (response.ok) {
                    logger.info("✅ Telegram 알림 발송 완료");
                } else {
                    logger.error(`❌ Telegram 알림 발송 실패: ${response.status}`);
                }
            } catch (err: any) {
                logger.error("❌ Telegram 알림 발송 오류:", err.message);
            }
        } else {
            logger.warn("⚠️ TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 설정되지 않았습니다.");
        }

        logger.info("✅ 멀티 플랫폼 알림 전송 완료:", zipUrl);

    } catch (err: any) {
        logger.error("❌ 멀티 플랫폼 알림 전송 중 오류 발생:", err.message);
    }
}

/**
 * 이메일 자동 전송 (Gmail)
 */
async function sendEmailNotification(zipUrl: string, summary: string) {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailTo = process.env.EMAIL_TO || "admin@yagovibe.com";

    if (!emailUser || !emailPass) {
        logger.warn("⚠️ EMAIL_USER 또는 EMAIL_PASS가 설정되지 않았습니다.");
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const mailOptions = {
            from: '"YAGO VIBE AI" <no-reply@yagovibe.com>',
            to: emailTo,
            subject: "🧠 AI 주간 리포트 도착!",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">📊 YAGO VIBE AI 주간 리포트</h2>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1f2937; margin-top: 0;">🧠 AI 요약</h3>
                        <p style="color: #4b5563; line-height: 1.6;">${summary}</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${zipUrl}" 
                           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            📦 전체 리포트 ZIP 다운로드
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        생성일: ${new Date().toLocaleString("ko-KR")}
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        이 메일은 YAGO VIBE AI 시스템에서 자동으로 생성되었습니다.
                    </p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        logger.info("✅ 이메일 알림 발송 완료");
    } catch (err: any) {
        logger.error("❌ 이메일 알림 발송 오류:", err.message);
    }
}

/**
 * AI 리포트 ZIP 파일 생성
 * reports/weekly 문서 업데이트 시 PDF + TTS를 ZIP으로 묶어서 저장
 */
export const generateReportZip = onDocumentUpdated(
    {
        document: "reports/weekly",
        region: "asia-northeast3",
    },
    async (event) => {
        const afterData = event.data?.after?.data();

        if (!afterData) {
            logger.warn("⚠️ reports/weekly 문서가 업데이트되지 않았습니다.");
            return;
        }

        // PDF URL 확인 (TTS는 선택사항)
        const pdfURL = afterData.pdfURL;
        const audioURL = afterData.audioURL;

        if (!pdfURL) {
            logger.warn("⚠️ PDF 파일이 없습니다. ZIP 생성 건너뜀");
            return;
        }

        try {
            logger.info("📦 ZIP 파일 생성 시작...");

            // ZIP 생성
            const zip = new JSZip();

            // PDF 파일 가져오기
            const pdfResponse = await fetch(pdfURL);
            if (!pdfResponse.ok) {
                throw new Error(`PDF 다운로드 실패: ${pdfResponse.status}`);
            }
            const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
            zip.file("AI_Weekly_Report.pdf", pdfBuffer);
            logger.info("✅ PDF 파일 추가 완료");

            // TTS 음성 파일 가져오기 (있는 경우만)
            if (audioURL) {
                try {
                    const audioResponse = await fetch(audioURL);
                    if (audioResponse.ok) {
                        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
                        zip.file("AI_Weekly_Report_Audio.mp3", audioBuffer);
                        logger.info("✅ TTS 음성 파일 추가 완료");
                    } else {
                        logger.warn("⚠️ TTS 파일 다운로드 실패, PDF만 ZIP에 포함");
                    }
                } catch (audioErr: any) {
                    logger.warn(`⚠️ TTS 파일 가져오기 실패: ${audioErr.message}, PDF만 ZIP에 포함`);
                }
            } else {
                logger.info("ℹ️ TTS 파일이 없어 PDF만 ZIP에 포함");
            }

            // ZIP 생성
            const zipContent = await zip.generateAsync({ type: "nodebuffer" });
            const timestamp = Date.now();
            const filePath = `reports/weekly_report_${timestamp}.zip`;

            // Firebase Storage에 ZIP 파일 업로드
            await storage.file(filePath).save(zipContent, {
                contentType: "application/zip",
                metadata: { cacheControl: "public, max-age=3600" },
            });

            logger.info("✅ ZIP 파일 Storage 업로드 완료:", filePath);

            // ZIP URL 생성 (Firebase Storage)
            const zipUrl = `https://storage.googleapis.com/${storage.name}/${filePath}`;

            // Firestore에 ZIP URL 업데이트
            await event.data?.after?.ref.update({ zipURL: zipUrl });

            logger.info("✅ ZIP 생성 및 Firestore 업데이트 완료:", zipUrl);

            // 멀티 플랫폼 알림 발송 (Slack + Discord + Telegram)
            await sendMultiPlatformNotification(zipUrl);

        } catch (err: any) {
            logger.error("❌ ZIP 생성 중 오류 발생:", err.message, err.stack);
            throw err;
        }
    }
);

