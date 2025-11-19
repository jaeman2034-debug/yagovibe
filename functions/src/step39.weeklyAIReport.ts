import { onSchedule } from "firebase-functions/v2/scheduler";
import { BigQuery } from "@google-cloud/bigquery";
import fetch from "node-fetch";
import OpenAI from "openai";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as nodemailer from "nodemailer";

const bq = new BigQuery();
const DATASET = "yago_reports";
const TABLE = "quality_metrics";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const MAIL_USER = process.env.SMTP_USER;
const MAIL_PASS = process.env.SMTP_PASS;
const MAIL_TO = process.env.MAIL_TO || "admin@yago-vibe.com";

/**
 * Step 39: AI 기반 주간 품질 요약 리포트 자동 생성
 * 매주 월요일 09:30 (Asia/Seoul) 실행
 * BigQuery 데이터 → ChatGPT 분석 → PDF/Slack/Email 자동 발송
 */
export const generateWeeklySummary = onSchedule(
    {
        schedule: "every monday 09:30",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            console.log("🤖 주간 AI 리포트 생성 시작...");

            // 1️⃣ 최근 7일 데이터 집계
            const [rows] = await bq.query({
                query: `
                    SELECT
                        DATE(created_at) AS date,
                        AVG(overallScore) AS avg_score,
                        AVG(coverage) AS avg_coverage,
                        SUM(gaps) AS total_gaps,
                        SUM(overlaps) AS total_overlaps,
                        COUNT(*) AS count
                    FROM \`${DATASET}.${TABLE}\`
                    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                    GROUP BY date 
                    ORDER BY date ASC
                `,
            });

            if (!rows || rows.length === 0) {
                console.log("⚠️ 데이터가 없습니다. 리포트 생성을 건너뜁니다.");
                return;
            }

            // 데이터 요약 텍스트 생성
            const summaryText = rows
                .map((r: any) => {
                    const dateValue = r.date?.value || r.date;
                    const dateStr = dateValue ? new Date(dateValue).toISOString().split("T")[0] : "";
                    return `날짜 ${dateStr}: 평균 점수 ${((r.avg_score || 0) as number).toFixed(2)}, 커버리지 ${(((r.avg_coverage || 0) as number) * 100).toFixed(1)}%, 갭 ${r.total_gaps || 0}, 오버랩 ${r.total_overlaps || 0}, 리포트 수 ${r.count || 0}`;
                })
                .join("\n");

            // 전체 통계 계산
            const totalReports = rows.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
            const avgScore = rows.reduce((sum: number, r: any) => sum + ((r.avg_score || 0) as number), 0) / rows.length;
            const avgCoverage = rows.reduce((sum: number, r: any) => sum + ((r.avg_coverage || 0) as number), 0) / rows.length;
            const totalGaps = rows.reduce((sum: number, r: any) => sum + (r.total_gaps || 0), 0);
            const totalOverlaps = rows.reduce((sum: number, r: any) => sum + (r.total_overlaps || 0), 0);

            // 2️⃣ GPT로 자연어 요약 생성
            if (!process.env.OPENAI_API_KEY) {
                console.error("❌ OPENAI_API_KEY가 설정되지 않았습니다.");
                return;
            }

            const prompt = `
아래는 지난 주 YAGO VIBE 리포트 품질 통계입니다.

전체 통계:
- 총 리포트 수: ${totalReports}개
- 평균 점수: ${avgScore.toFixed(2)}
- 평균 커버리지: ${(avgCoverage * 100).toFixed(1)}%
- 총 갭: ${totalGaps}개
- 총 오버랩: ${totalOverlaps}개

일별 상세:
${summaryText}

위 데이터를 기반으로 다음 항목을 포함한 주간 리포트를 작성해 주세요:

1. 종합 요약 (전주 대비 변화, 전체적인 품질 추세)
2. 주요 이슈 (갭/오버랩 원인 추정, 품질 저하 요인)
3. 개선 제안 (구체적인 액션 아이템)
4. 결론 (한 문장 요약)

출력 형식은 짧은 문단 + bullet point 스타일로 작성해주세요.
한국어로 작성해주세요.
`;

            console.log("🤖 ChatGPT 요약 생성 중...");
            const gptResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            });

            const aiReport = gptResponse.choices[0].message?.content?.trim() || "요약 생성 실패";
            console.log("✅ AI 리포트 생성 완료");

            // 3️⃣ PDF 리포트 생성
            console.log("📄 PDF 생성 중...");
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]); // A4 크기
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const { width, height } = page.getSize();

            let y = height - 50;
            const margin = 50;
            const lineHeight = 15;
            const fontSize = 11;

            // 제목
            page.drawText("YAGO VIBE 주간 품질 리포트", {
                x: margin,
                y: y,
                size: 16,
                font: boldFont,
                color: rgb(0, 0, 0),
            });
            y -= 30;

            // 날짜
            const dateStr = new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            page.drawText(`생성일: ${dateStr}`, {
                x: margin,
                y: y,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5),
            });
            y -= 30;

            // AI 리포트 본문 (줄바꿈 처리)
            const lines = aiReport.split("\n");
            let currentPage = page;
            
            for (const line of lines) {
                if (y < 50) {
                    // 새 페이지 추가
                    currentPage = pdfDoc.addPage([595, 842]);
                    y = height - 50;
                }
                
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    // 긴 줄은 여러 줄로 분할 (대략 70자 기준)
                    const maxChars = 70;
                    if (trimmedLine.length > maxChars) {
                        const words = trimmedLine.split(" ");
                        let currentLine = "";
                        for (const word of words) {
                            const testLine = currentLine ? currentLine + " " + word : word;
                            if (testLine.length > maxChars && currentLine) {
                                currentPage.drawText(currentLine, {
                                    x: margin,
                                    y: y,
                                    size: fontSize,
                                    font: font,
                                    color: rgb(0, 0, 0),
                                });
                                y -= lineHeight;
                                if (y < 50) {
                                    currentPage = pdfDoc.addPage([595, 842]);
                                    y = height - 50;
                                }
                                currentLine = word;
                            } else {
                                currentLine = testLine;
                            }
                        }
                        if (currentLine) {
                            currentPage.drawText(currentLine, {
                                x: margin,
                                y: y,
                                size: fontSize,
                                font: font,
                                color: rgb(0, 0, 0),
                            });
                            y -= lineHeight;
                        }
                    } else {
                        currentPage.drawText(trimmedLine, {
                            x: margin,
                            y: y,
                            size: fontSize,
                            font: font,
                            color: rgb(0, 0, 0),
                        });
                        y -= lineHeight;
                    }
                } else {
                    // 빈 줄은 작은 공간만 추가
                    y -= lineHeight * 0.3;
                }
            }

            const pdfBytes = await pdfDoc.save();
            console.log("✅ PDF 생성 완료");

            // 4️⃣ Slack 전송
            if (SLACK_WEBHOOK) {
                try {
                    await fetch(SLACK_WEBHOOK, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: `🧠 *YAGO VIBE 주간 AI 리포트*\n\n${aiReport}`,
                        }),
                    });
                    console.log("✅ Slack 발송 완료");
                } catch (error) {
                    console.error("❌ Slack 발송 실패:", error);
                }
            } else {
                console.log("⚠️ SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
            }

            // 5️⃣ 이메일 전송
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
                        subject: "YAGO VIBE 주간 AI 품질 리포트",
                        text: aiReport,
                        attachments: [
                            {
                                filename: `WeeklyReport_${new Date().toISOString().split("T")[0]}.pdf`,
                                content: Buffer.from(pdfBytes),
                            },
                        ],
                    });
                    console.log("✅ Email 발송 완료");
                } catch (error) {
                    console.error("❌ Email 발송 실패:", error);
                }
            } else {
                console.log("⚠️ SMTP 설정이 없습니다.");
            }

            console.log("✅ 주간 AI 리포트 발송 완료");
        } catch (error: any) {
            console.error("❌ 주간 AI 리포트 생성 오류:", error);
            throw error;
        }
    }
);

