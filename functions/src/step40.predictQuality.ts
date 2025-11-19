import { onSchedule } from "firebase-functions/v2/scheduler";
import { BigQuery } from "@google-cloud/bigquery";
import OpenAI from "openai";
import fetch from "node-fetch";

const bq = new BigQuery();
const DATASET = "yago_reports";
const MODEL_NAME = "quality_forecast";
const TABLE = "quality_metrics";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

/**
 * Step 40: BigQuery ML 기반 품질 점수 예측
 * 매주 월요일 10:00 (Asia/Seoul) 실행
 * BigQuery ML 모델로 다음 주 품질 점수 예측 → ChatGPT 분석 → Slack 발송
 */
export const predictQualityTrend = onSchedule(
    {
        schedule: "every monday 10:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            console.log("📊 품질 예측 시작...");

            // 1️⃣ 최근 7일간 평균값 계산 (예측 입력)
            const [avgData] = await bq.query({
                query: `
                    SELECT
                        AVG(coverage) AS coverage,
                        AVG(avgDur) AS avgDur,
                        AVG(gaps) AS gaps,
                        AVG(overlaps) AS overlaps
                    FROM \`${DATASET}.${TABLE}\`
                    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                `,
            });

            if (!avgData || avgData.length === 0) {
                console.log("⚠️ 데이터가 없습니다. 예측을 건너뜁니다.");
                return;
            }

            const avg = avgData[0] as any;
            const coverage = avg.coverage || 0;
            const avgDur = avg.avgDur || 0;
            const gaps = avg.gaps || 0;
            const overlaps = avg.overlaps || 0;

            console.log("📊 최근 7일 평균:", { coverage, avgDur, gaps, overlaps });

            // 2️⃣ BigQuery ML 모델로 예측
            const [predictions] = await bq.query({
                query: `
                    SELECT
                        predicted_overallScore AS forecast_score,
                        ${coverage} AS coverage,
                        ${avgDur} AS avgDur,
                        ${gaps} AS gaps,
                        ${overlaps} AS overlaps
                    FROM ML.PREDICT(
                        MODEL \`${DATASET}.${MODEL_NAME}\`,
                        (SELECT
                            ${coverage} AS coverage,
                            ${avgDur} AS avgDur,
                            ${gaps} AS gaps,
                            ${overlaps} AS overlaps)
                    )
                `,
            });

            if (!predictions || predictions.length === 0) {
                console.error("❌ 예측 결과가 없습니다. 모델이 생성되었는지 확인하세요.");
                return;
            }

            const result = predictions[0] as any;
            const forecastScore = result.forecast_score || 0;

            console.log("✅ 예측 완료:", { forecastScore });

            // 3️⃣ ChatGPT로 자연어 리포트 생성
            if (!process.env.OPENAI_API_KEY) {
                console.error("❌ OPENAI_API_KEY가 설정되지 않았습니다.");
                return;
            }

            // 최근 7일간 실제 평균 점수 조회 (비교용)
            const [recentData] = await bq.query({
                query: `
                    SELECT AVG(overallScore) AS recent_avg_score
                    FROM \`${DATASET}.${TABLE}\`
                    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                `,
            });

            const recentAvgScore = recentData[0]?.recent_avg_score || 0;
            const scoreDiff = forecastScore - recentAvgScore;
            const scoreChange = scoreDiff > 0 ? `+${scoreDiff.toFixed(3)} 상승` : `${scoreDiff.toFixed(3)} 하락`;

            const prompt = `
아래는 지난주 품질 요약 통계입니다:

- Coverage: ${(coverage * 100).toFixed(1)}%
- Avg Duration: ${avgDur.toFixed(2)}s
- Gaps: ${gaps}, Overlaps: ${overlaps}
- 최근 7일 평균 점수: ${recentAvgScore.toFixed(3)}

BigQuery ML 모델이 예측한 다음 주 품질 점수는 ${forecastScore.toFixed(3)} 입니다.
전주 대비 ${scoreChange} 예상됩니다.

위 데이터를 기반으로 다음 항목을 포함한 자연어 리포트를 작성해 주세요:

1) 다음 주 품질 전망 요약 (예측 점수, 전주 대비 변화)
2) 개선 포인트 (예측 근거 기반)
3) 위험요인 및 제안 (갭/오버랩 관리 방안)

출력은 간결한 문단 + bullet point 형식으로 작성해주세요.
한국어로 작성해주세요.
`;

            console.log("🤖 ChatGPT 예측 리포트 생성 중...");
            const aiRes = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            });

            const aiText = aiRes.choices[0].message?.content?.trim() || "AI 예측 요약 실패";
            console.log("✅ AI 리포트 생성 완료");

            // 4️⃣ Slack 발송
            if (SLACK_WEBHOOK) {
                try {
                    const slackText = `📊 *YAGO VIBE 다음 주 품질 예측 리포트*\n\n` +
                        `예측 점수: ${forecastScore.toFixed(3)} (전주 대비 ${scoreChange})\n\n` +
                        `${aiText}`;

                    await fetch(SLACK_WEBHOOK, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: slackText,
                        }),
                    });
                    console.log("✅ Slack 발송 완료");
                } catch (error) {
                    console.error("❌ Slack 발송 실패:", error);
                }
            } else {
                console.log("⚠️ SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
            }

            // 5️⃣ Firestore에 예측 결과 저장
            const admin = await import("firebase-admin");
            const db = admin.firestore();
            const predictionDoc = {
                forecastScore: forecastScore,
                coverage: coverage,
                avgDur: avgDur,
                gaps: gaps,
                overlaps: overlaps,
                recentAvgScore: recentAvgScore,
                scoreChange: scoreDiff,
                aiSummary: aiText,
                createdAt: new Date(),
            };

            await db.collection("quality_predictions").add(predictionDoc);
            console.log("✅ Firestore 저장 완료");

            console.log("✅ 품질 예측 완료");
        } catch (error: any) {
            console.error("❌ 품질 예측 오류:", error);
            // 모델이 없는 경우 에러 메시지 출력
            if (error.message?.includes("MODEL") || error.message?.includes("model")) {
                console.error("💡 BigQuery ML 모델이 생성되지 않았습니다. 모델 생성 스크립트를 실행하세요.");
            }
            throw error;
        }
    }
);

