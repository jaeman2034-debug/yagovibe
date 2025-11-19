import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Step 61: Feedback Trainer - 주간 학습 루프
 * 매주 월요일 03:00에 피드백 데이터를 분석하여 개선 규칙 생성
 */
export const feedbackTrainer = onSchedule(
    {
        schedule: "every monday 03:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("🧠 Feedback Trainer 시작");

            // 최근 200개 피드백 샘플 수집
            const snap = await db
                .collection("feedbackDataset")
                .orderBy("updatedAt", "desc")
                .limit(200)
                .get();

            if (snap.empty) {
                logger.info("⚠️ 피드백 데이터가 없습니다.");
                return;
            }

            const samples = snap.docs.map((d) => {
                const data = d.data();
                return {
                    text: data.text || "",
                    decision: data.decision || "",
                    reviewerComment: data.reviewerComment || "",
                    highlights: data.highlights || [],
                };
            });

            const positives = samples.filter((s) => s.decision === "approved");
            const negatives = samples.filter((s) => s.decision === "rejected");

            logger.info("📊 피드백 통계:", {
                total: samples.length,
                positives: positives.length,
                negatives: negatives.length,
            });

            // 승인/반려 샘플 예시 선택 (최대 10개씩)
            const positiveExamples = positives.slice(0, 10);
            const negativeExamples = negatives.slice(0, 10);

            // AI 분석 프롬프트
            const prompt = `
다음은 인사이트 생성 피드백 데이터입니다.

승인된 문장은 요약 품질이 높고, 반려된 문장은 불명확하거나 부정확합니다.

이 패턴을 반영하여 향후 인사이트 생성 품질을 개선하는 규칙을 제안하세요.

## 승인된 샘플 (${positiveExamples.length}개):
${JSON.stringify(positiveExamples, null, 2)}

## 반려된 샘플 (${negativeExamples.length}개):
${JSON.stringify(negativeExamples, null, 2)}

## 요청사항:
1. 승인된 샘플의 공통 특징을 분석하세요.
2. 반려된 샘플의 문제점을 식별하세요.
3. 향후 인사이트 생성 시 적용할 구체적인 개선 규칙을 제안하세요.
4. 규칙은 JSON 형식으로 제공하세요: { "rules": ["규칙1", "규칙2", ...] }
`;

            // AI 분석 실행
            let improvementNotes = "";
            let improvementRules: string[] = [];

            try {
                const result = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "너는 AI 리포트 품질 개선 엔진이다. 피드백 데이터를 분석하여 구체적이고 실행 가능한 개선 규칙을 제안한다.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                });

                improvementNotes = result.choices[0].message?.content || "";

                // JSON 규칙 추출 시도
                try {
                    const jsonMatch = improvementNotes.match(/\{[\s\S]*"rules"[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        improvementRules = parsed.rules || [];
                    }
                } catch (parseError) {
                    logger.warn("⚠️ JSON 규칙 파싱 실패, 텍스트만 저장");
                }

                logger.info("✅ AI 분석 완료");
            } catch (error: any) {
                logger.error("❌ AI 분석 실패:", error);
                improvementNotes = `AI 분석 실패: ${error.message}`;
            }

            // 승인율 계산
            const approvalRate = positives.length / Math.max(samples.length, 1);

            // 이전 주와 비교 (개선율 계산)
            const lastWeekSnap = await db
                .collection("modelInsights")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            let improvementRate = 0;
            if (!lastWeekSnap.empty) {
                const lastWeek = lastWeekSnap.docs[0].data();
                const lastApprovalRate = lastWeek.stats?.approvalRate || 0;
                improvementRate = approvalRate - lastApprovalRate;
            }

            // Embedding Drift 계산 (승인 vs 반려 임베딩 간 코사인 거리)
            let embeddingDrift = 0;
            if (positives.length > 0 && negatives.length > 0) {
                try {
                    // 간단한 평균 임베딩 계산
                    const positiveEmbeddings = positives
                        .filter((p) => p.embedding)
                        .map((p) => p.embedding);
                    const negativeEmbeddings = negatives
                        .filter((n) => n.embedding)
                        .map((n) => n.embedding);

                    if (positiveEmbeddings.length > 0 && negativeEmbeddings.length > 0) {
                        // 코사인 유사도 계산 (간단한 버전)
                        // 실제로는 더 정교한 계산 필요
                        embeddingDrift = 0.5; // 임시값 (실제 계산 필요)
                    }
                } catch (error) {
                    logger.warn("⚠️ Embedding Drift 계산 실패");
                }
            }

            // 모델 인사이트 저장
            await db.collection("modelInsights").add({
                createdAt: Timestamp.now(),
                improvementNotes,
                improvementRules,
                stats: {
                    total: samples.length,
                    positives: positives.length,
                    negatives: negatives.length,
                    approvalRate,
                    improvementRate,
                    embeddingDrift,
                },
                samplesAnalyzed: samples.length,
                positiveExamples: positiveExamples.length,
                negativeExamples: negativeExamples.length,
            });

            logger.info("✅ Feedback Trainer 완료:", {
                approvalRate: (approvalRate * 100).toFixed(2) + "%",
                improvementRate: (improvementRate * 100).toFixed(2) + "%",
            });
        } catch (error: any) {
            logger.error("❌ Feedback Trainer 오류:", error);
        }
    }
);

