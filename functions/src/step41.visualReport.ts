import { onSchedule } from "firebase-functions/v2/scheduler";
import { BigQuery } from "@google-cloud/bigquery";
import fetch from "node-fetch";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const bq = new BigQuery();
const DATASET = "yago_reports";
const TABLE = "quality_metrics";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const MAIL_USER = process.env.SMTP_USER;
const MAIL_PASS = process.env.SMTP_PASS;
const MAIL_TO = process.env.MAIL_TO || "admin@yago-vibe.com";

/**
 * Step 41: 시각화 품질 리포트 자동 생성
 * 매주 월요일 10:30 (Asia/Seoul) 실행
 * BigQuery 데이터 → 그래프 이미지 생성 → AI 요약 이미지 생성 → Slack/Email 발송
 */
export const generateVisualQualityReport = onSchedule(
    {
        schedule: "every monday 10:30",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            console.log("📊 시각화 리포트 생성 시작...");

            // 1️⃣ 최근 4주 데이터 로드
            const [rows] = await bq.query({
                query: `
                    SELECT 
                        DATE(created_at) AS date, 
                        AVG(overallScore) AS avg_score,
                        AVG(coverage) AS avg_coverage,
                        SUM(gaps) AS total_gaps,
                        SUM(overlaps) AS total_overlaps
                    FROM \`${DATASET}.${TABLE}\`
                    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
                    GROUP BY date 
                    ORDER BY date ASC
                `,
            });

            if (!rows || rows.length === 0) {
                console.log("⚠️ 데이터가 없습니다. 리포트 생성을 건너뜁니다.");
                return;
            }

            const labels = rows.map((r: any) => {
                const dateValue = r.date?.value || r.date;
                return dateValue ? new Date(dateValue).toISOString().split("T")[0] : "";
            });
            const scores = rows.map((r: any) => (r.avg_score || 0) as number);
            const coverage = rows.map((r: any) => ((r.avg_coverage || 0) as number) * 100);

            // 전체 통계 계산
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const avgCoverage = coverage.reduce((a, b) => a + b, 0) / coverage.length;
            const totalGaps = rows.reduce((sum: number, r: any) => sum + (r.total_gaps || 0), 0);
            const totalOverlaps = rows.reduce((sum: number, r: any) => sum + (r.total_overlaps || 0), 0);

            // 다음 주 예측 점수 (Step 40 예측 결과 사용)
            const admin = await import("firebase-admin");
            const db = admin.firestore();
            const predictionSnap = await db.collection("quality_predictions")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();
            
            const latestPrediction = predictionSnap.docs[0]?.data();
            const forecastScore = latestPrediction?.forecastScore || avgScore;
            const scoreChange = latestPrediction?.scoreChange || 0;

            console.log("📊 데이터 로드 완료:", { labels: labels.length, avgScore, avgCoverage });

            // 2️⃣ 그래프 이미지 생성 (chartjs-node-canvas)
            console.log("📈 그래프 이미지 생성 중...");
            const { ChartJSNodeCanvas } = await import("chartjs-node-canvas");
            
            const width = 800;
            const height = 400;
            const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
                width, 
                height,
                backgroundColour: "white"
            });

            // Coverage를 0-1 범위로 정규화 (같은 Y축 사용)
            const coverageNormalized = coverage.map((c: number) => c / 100);

            const chartBuffer = await chartJSNodeCanvas.renderToBuffer({
                type: "line",
                data: {
                    labels: labels.map((l: string) => l.split("-").slice(1).join("-")), // MM-DD 형식
                    datasets: [
                        { 
                            label: "Score", 
                            data: scores, 
                            borderColor: "#1d4ed8",
                            backgroundColor: "rgba(29, 78, 216, 0.1)",
                            fill: true,
                            tension: 0.4
                        },
                        { 
                            label: "Coverage (정규화)", 
                            data: coverageNormalized, 
                            borderColor: "#10b981",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            fill: true,
                            tension: 0.4
                        },
                    ],
                },
                options: {
                    plugins: { 
                        title: { 
                            display: true, 
                            text: "YAGO VIBE 품질 트렌드 (최근 4주)",
                            font: { size: 16 }
                        },
                        legend: {
                            display: true,
                            position: "top"
                        }
                    },
                    scales: { 
                        y: { 
                            min: 0, 
                            max: 1,
                            title: {
                                display: true,
                                text: "Score / Coverage (정규화)"
                            }
                        }
                    },
                },
            });

            // 임시 파일로 저장
            const tempDir = os.tmpdir();
            const chartPath = path.join(tempDir, `chart_${Date.now()}.png`);
            fs.writeFileSync(chartPath, chartBuffer);
            console.log("✅ 그래프 이미지 생성 완료:", chartPath);

            // 3️⃣ ChatGPT Images API로 AI 요약 이미지 생성
            if (!process.env.OPENAI_API_KEY) {
                console.error("❌ OPENAI_API_KEY가 설정되지 않았습니다.");
                return;
            }

            console.log("🎨 AI 요약 이미지 생성 중...");
            const aiImagePrompt = `
Create a sleek dashboard-style image summarizing weekly AI quality report:

Key metrics:
- Average Score: ${avgScore.toFixed(2)}
- Average Coverage: ${avgCoverage.toFixed(1)}%
- Gaps: ${totalGaps}, Overlaps: ${totalOverlaps}
- Next Week Forecast: ${forecastScore.toFixed(3)} ${scoreChange > 0 ? `(+${scoreChange.toFixed(3)})` : `(${scoreChange.toFixed(3)})`}

Include:
- A line chart trend visualization
- Metrics summary cards
- Short note like "Quality ${scoreChange > 0 ? "improving" : "needs attention"}"
- Color palette: blue & green tones, modern UI style
- Title: "YAGO VIBE AI Quality Insight"

Style: Clean, professional dashboard design with gradient backgrounds.
`;

            const aiImage = await openai.images.generate({
                model: "dall-e-3",
                prompt: aiImagePrompt,
                size: "1024x512",
                quality: "standard",
                n: 1,
            });

            const aiImageUrl = aiImage.data[0]?.url;
            console.log("✅ AI 이미지 생성 완료:", aiImageUrl);

            // 4️⃣ Slack 메시지 전송
            if (SLACK_WEBHOOK) {
                try {
                    // Slack 메시지 본문
                    const slackText = `📊 *YAGO VIBE AI 품질 시각화 리포트*\n\n` +
                        `• Score 상승세 유지 (평균 ${avgScore.toFixed(2)})\n` +
                        `• Coverage 안정적 (${avgCoverage.toFixed(1)}% 이상)\n` +
                        `• 다음 주 예측: ${forecastScore.toFixed(3)} ${scoreChange > 0 ? `(+${scoreChange.toFixed(3)})` : `(${scoreChange.toFixed(3)})`}\n\n` +
                        `📈 트렌드 차트 및 AI 요약 이미지:\n` +
                        `${aiImageUrl || "AI 이미지 생성 실패"}`;

                    // Slack에 메시지 전송 (이미지 URL 포함)
                    await fetch(SLACK_WEBHOOK, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: slackText,
                            blocks: [
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: slackText,
                                    },
                                },
                                ...(aiImageUrl ? [{
                                    type: "image",
                                    image_url: aiImageUrl,
                                    alt_text: "AI Quality Summary",
                                }] : []),
                            ],
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
                    const nodemailer = await import("nodemailer");
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: MAIL_USER,
                            pass: MAIL_PASS,
                        },
                    });

                    // AI 이미지 다운로드
                    let aiImageBuffer: Buffer | null = null;
                    if (aiImageUrl) {
                        try {
                            const imageRes = await fetch(aiImageUrl);
                            aiImageBuffer = Buffer.from(await imageRes.arrayBuffer());
                        } catch (error) {
                            console.warn("⚠️ AI 이미지 다운로드 실패:", error);
                        }
                    }

                    await transporter.sendMail({
                        from: MAIL_USER,
                        to: MAIL_TO,
                        subject: "YAGO VIBE AI 품질 시각화 리포트",
                        html: `
                            <h2>📊 YAGO VIBE AI 품질 시각화 리포트</h2>
                            <p>• Score 상승세 유지 (평균 ${avgScore.toFixed(2)})</p>
                            <p>• Coverage 안정적 (${avgCoverage.toFixed(1)}% 이상)</p>
                            <p>• 다음 주 예측: ${forecastScore.toFixed(3)} ${scoreChange > 0 ? `(+${scoreChange.toFixed(3)})` : `(${scoreChange.toFixed(3)})`}</p>
                            <h3>📈 품질 트렌드 차트</h3>
                            <img src="cid:chart" alt="Quality Trend Chart" />
                            ${aiImageUrl ? `<h3>🎨 AI 요약 이미지</h3><img src="${aiImageUrl}" alt="AI Summary" />` : ""}
                        `,
                        attachments: [
                            {
                                filename: "quality_trend_chart.png",
                                content: chartBuffer,
                                cid: "chart",
                            },
                            ...(aiImageBuffer ? [{
                                filename: "ai_summary.png",
                                content: aiImageBuffer,
                            }] : []),
                        ],
                    });
                    console.log("✅ Email 발송 완료");
                } catch (error) {
                    console.error("❌ Email 발송 실패:", error);
                }
            } else {
                console.log("⚠️ SMTP 설정이 없습니다.");
            }

            // 임시 파일 정리
            try {
                if (fs.existsSync(chartPath)) {
                    fs.unlinkSync(chartPath);
                }
            } catch (error) {
                console.warn("⚠️ 임시 파일 정리 실패:", error);
            }

            console.log("✅ Step 41 시각화 리포트 완료");
        } catch (error: any) {
            console.error("❌ 시각화 리포트 생성 오류:", error);
            throw error;
        }
    }
);

