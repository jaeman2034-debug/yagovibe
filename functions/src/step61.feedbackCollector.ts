import { onDocumentWritten } from "firebase-functions/v2/firestore";
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
 * Step 61: Feedback Collector - 피드백 수집
 * insightReports/{id} 문서가 업데이트될 때 승인/반려 피드백을 수집
 */
export const feedbackCollector = onDocumentWritten(
    {
        document: "insightReports/{id}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const before = event.data?.before?.data();
            const after = event.data?.after?.data();

            if (!after) {
                logger.info("⚠️ 문서가 삭제되었거나 데이터가 없습니다.");
                return;
            }

            // 상태 변경이 없으면 스킵
            if (before?.status === after.status) {
                logger.info("📋 상태 변경 없음, 스킵");
                return;
            }

            // 승인/반려가 발생한 시점만 수집
            if (!["approved", "rejected"].includes(after.status)) {
                logger.info("📋 승인/반려 상태가 아니므로 스킵");
                return;
            }

            logger.info("📋 피드백 수집 시작:", {
                reportId: event.params.id,
                status: after.status,
            });

            // 피드백 데이터 구성
            const feedback = {
                reportId: event.params.id,
                teamId: after.teamId || "",
                text: after.summary || "",
                decision: after.status === "approved" ? "approved" : "rejected",
                reviewerComment: after.comments?.at(-1)?.text || "",
                highlights: after.highlights || [],
                alerts: after.alerts || [],
                metrics: after.metrics || {},
                reviewer: after.reviewer || {},
                updatedAt: Timestamp.now(),
            };

            // 임베딩 생성 (요약 문맥)
            try {
                const embeddingText = `${feedback.text}\n\n하이라이트: ${JSON.stringify(feedback.highlights)}\n\n경보: ${JSON.stringify(feedback.alerts)}`;
                
                const emb = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: embeddingText.substring(0, 8000), // 최대 길이 제한
                });

                feedback.embedding = emb.data[0].embedding;

                logger.info("✅ 임베딩 생성 완료");
            } catch (error: any) {
                logger.error("❌ 임베딩 생성 실패:", error);
                // 임베딩 실패해도 피드백은 저장
                feedback.embedding = null;
            }

            // deltaScore 계산 (승인 시 +1, 반려 시 -1)
            const deltaScore = feedback.decision === "approved" ? 1 : -1;

            // 피드백 데이터셋에 저장
            await db.collection("feedbackDataset").add({
                ...feedback,
                deltaScore,
                createdAt: Timestamp.now(),
            });

            logger.info("✅ 피드백 수집 완료:", {
                reportId: event.params.id,
                decision: feedback.decision,
            });
        } catch (error: any) {
            logger.error("❌ 피드백 수집 오류:", error);
        }
    }
);

