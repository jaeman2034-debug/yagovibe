/**
 * 🔥 동일 이슈 재문의 스레드 병합 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 동일 이슈 재문의 감지
 * - 스레드 자동 병합
 * - 이전 대화 내역 연결
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 스레드 병합 임계값
const THREAD_SIMILARITY_THRESHOLD = 0.85; // 유사도 85% 이상
const THREAD_TIME_WINDOW_HOURS = 7 * 24; // 7일 이내

/**
 * 제목/내용 유사도 계산
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * 동일 이슈 재문의 감지 및 스레드 병합
 */
export const onDisputeThreadMerge = onDocumentCreated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const dispute = event.data?.data();
    if (!dispute) return;

    const disputeId = event.params.disputeId;
    const userId = dispute.userId;
    const title = dispute.title || "";
    const description = dispute.description || "";

    logger.info("[onDisputeThreadMerge] 스레드 병합 체크 시작:", { disputeId, userId });

    try {
      // 🔥 최근 7일 내 동일 사용자 분쟁 조회
      const sevenDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - THREAD_TIME_WINDOW_HOURS * 60 * 60 * 1000)
      );

      const recentDisputes = await db
        .collection("disputes")
        .where("userId", "==", userId)
        .where("createdAt", ">=", sevenDaysAgo)
        .where("status", "!=", "CLOSED")
        .limit(20)
        .get();

      let bestMatch: { disputeId: string; similarity: number } | null = null;

      // 🔥 유사한 분쟁 찾기
      for (const doc of recentDisputes.docs) {
        if (doc.id === disputeId) continue; // 자기 자신 제외

        const existingDispute = doc.data();
        const existingTitle = existingDispute.title || "";
        const existingDescription = existingDispute.description || "";

        // 🔥 제목 유사도
        const titleSimilarity = calculateSimilarity(title, existingTitle);
        
        // 🔥 내용 유사도
        const descriptionSimilarity = calculateSimilarity(description, existingDescription);
        
        // 🔥 종합 유사도
        const overallSimilarity = (titleSimilarity * 0.6) + (descriptionSimilarity * 0.4);

        if (overallSimilarity >= THREAD_SIMILARITY_THRESHOLD) {
          if (!bestMatch || overallSimilarity > bestMatch.similarity) {
            bestMatch = {
              disputeId: doc.id,
              similarity: overallSimilarity,
            };
          }
        }
      }

      // 🔥 유사한 분쟁이 있으면 스레드 병합
      if (bestMatch) {
        const parentDisputeId = bestMatch.disputeId;

        // 🔥 현재 분쟁을 부모 분쟁의 스레드로 연결
        await db.collection("disputes").doc(disputeId).update({
          parentDisputeId,
          isThread: true,
          threadMerged: true,
          threadMergedAt: FieldValue.serverTimestamp(),
          similarity: bestMatch.similarity,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 부모 분쟁에 스레드 추가
        await db.collection("disputes").doc(parentDisputeId).update({
          threadCount: FieldValue.increment(1),
          lastThreadAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("[onDisputeThreadMerge] 스레드 병합 완료:", {
          disputeId,
          parentDisputeId,
          similarity: bestMatch.similarity,
        });
      } else {
        logger.info("[onDisputeThreadMerge] 유사한 분쟁 없음:", { disputeId });
      }
    } catch (error: any) {
      logger.error("[onDisputeThreadMerge] 스레드 병합 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
