import { onSchedule } from "firebase-functions/v2/scheduler";
import { BigQuery } from "@google-cloud/bigquery";
import fetch from "node-fetch";
import * as nodemailer from "nodemailer";

const bq = new BigQuery();
const DATASET = "yago_reports";
const TABLE = "quality_metrics";

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const MAIL_USER = process.env.SMTP_USER;
const MAIL_PASS = process.env.SMTP_PASS;
const MAIL_TO = process.env.MAIL_TO || "admin@yago-vibe.com";

/**
 * Step 37: 주간 품질 리포트 자동 생성 및 발송
 * 매주 월요일 09:00 (Asia/Seoul) 실행
 */
export const sendWeeklyQualityReport = onSchedule(
    {
        schedule: "every monday 09:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            console.log("📊 주간 품질 리포트 생성 시작...");

            // BigQuery에서 최근 7일간 통계 조회
            const [rows] = await bq.query({
                query: `
                    SELECT
                        AVG(overallScore) as avg_score,
                        AVG(coverage) as avg_coverage,
                        AVG(avgDur) as avg_dur,
                        SUM(gaps) as total_gaps,
                        SUM(overlaps) as total_overlaps,
                        COUNT(*) as count
                    FROM \`${DATASET}.${TABLE}\`
                    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                `,
            });

            const r = rows[0] || {};
            const text = `🧠 *주간 품질 리포트 (YAGO VIBE)*\n\n` +
                `리포트 수: ${r.count || 0}\n` +
                `평균 점수: ${((r.avg_score || 0) as number).toFixed(2)}\n` +
                `평균 커버리지: ${(((r.avg_coverage || 0) as number) * 100).toFixed(1)}%\n` +
                `평균 길이: ${((r.avg_dur || 0) as number).toFixed(2)}s\n` +
                `Gaps: ${r.total_gaps || 0} / Overlaps: ${r.total_overlaps || 0}`;

            console.log("📊 리포트 내용:", text);

            // Slack 발송
            if (SLACK_WEBHOOK) {
                try {
                    await fetch(SLACK_WEBHOOK, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text }),
                    });
                    console.log("✅ Slack 발송 완료");
                } catch (error) {
                    console.error("❌ Slack 발송 실패:", error);
                }
            } else {
                console.log("⚠️ SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
            }

            // Email 발송
            if (MAIL_USER && MAIL_PASS) {
                try {
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: MAIL_USER,
                            pass: MAIL_PASS,
                        },
                    });

                    await transporter.sendMail({
                        from: MAIL_USER,
                        to: MAIL_TO,
                        subject: `YAGO VIBE 주간 품질 리포트`,
                        text: text.replace(/\*/g, ""), // Slack 마크다운 제거
                    });
                    console.log("✅ Email 발송 완료");
                } catch (error) {
                    console.error("❌ Email 발송 실패:", error);
                }
            } else {
                console.log("⚠️ SMTP 설정이 없습니다.");
            }

            // Step 38: Google Sheets 및 Notion 동기화
            const PROJECT_ID = process.env.GCLOUD_PROJECT || "yago-vibe-spt";
            const FUNCTIONS_ORIGIN = process.env.FUNCTIONS_ORIGIN || 
                `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net`;

            // Google Sheets 동기화
            try {
                const sheetsRes = await fetch(`${FUNCTIONS_ORIGIN}/exportQualityToSheets`, {
                    method: "POST",
                });
                if (sheetsRes.ok) {
                    console.log("✅ Google Sheets 동기화 완료");
                } else {
                    console.error("⚠️ Google Sheets 동기화 실패:", await sheetsRes.text());
                }
            } catch (error) {
                console.error("⚠️ Google Sheets 동기화 오류:", error);
            }

            // Notion 동기화
            try {
                const notionRes = await fetch(`${FUNCTIONS_ORIGIN}/exportQualityToNotion`, {
                    method: "POST",
                });
                if (notionRes.ok) {
                    console.log("✅ Notion 동기화 완료");
                } else {
                    console.error("⚠️ Notion 동기화 실패:", await notionRes.text());
                }
            } catch (error) {
                console.error("⚠️ Notion 동기화 오류:", error);
            }

            console.log("✅ 주간 리포트 발송 완료");
        } catch (error: any) {
            console.error("❌ 주간 리포트 생성 오류:", error);
            throw error;
        }
    }
);

