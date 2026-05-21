/**
 * 예약 게시 공지 자동 전환 스케줄 작업
 * 
 * 매 5분마다 실행
 * publishAt <= now && status === "scheduled"
 * → status = "published"
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 예약 게시 공지 자동 전환
 */
export const publishScheduledNotices = onSchedule(
  {
    schedule: "*/5 * * * *", // 매 5분마다 실행
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    logger.info("⏰ [SCHEDULED_NOTICES] 예약 게시 공지 자동 전환 시작");

    try {
      const now = Timestamp.now();
      let processedCount = 0;
      let publishedCount = 0;

      // 모든 협회 조회
      const associationsSnapshot = await db.collection("associations").get();

      for (const assocDoc of associationsSnapshot.docs) {
        const associationId = assocDoc.id;
        const noticesRef = db.collection(`associations/${associationId}/notices`);

        // scheduled 상태이고 publishAt이 지난 공지 조회
        const scheduledNotices = await noticesRef
          .where("status", "==", "scheduled")
          .where("publishAt", "<=", now)
          .get();

        for (const noticeDoc of scheduledNotices.docs) {
          try {
            await noticeDoc.ref.update({
              status: "published",
              updatedAt: Timestamp.now(),
            });

            // 로그 기록
            await db.collection(`associations/${associationId}/audit_logs`).add({
              action: "NOTICE_PUBLISHED",
              noticeId: noticeDoc.id,
              trigger: "scheduled_auto",
              timestamp: Timestamp.now(),
            });

            publishedCount++;
            logger.info(`✅ [SCHEDULED_NOTICES] 공지 게시됨: ${associationId}/${noticeDoc.id}`);
          } catch (error) {
            logger.error(
              `❌ [SCHEDULED_NOTICES] 공지 게시 실패: ${associationId}/${noticeDoc.id}`,
              error
            );
          }
        }

        processedCount += scheduledNotices.size;
      }

      logger.info("✅ [SCHEDULED_NOTICES] 예약 게시 공지 자동 전환 완료", {
        processed: processedCount,
        published: publishedCount,
      });
    } catch (error) {
      logger.error("❌ [SCHEDULED_NOTICES] 예약 게시 공지 자동 전환 실패", error);
    }
  }
);

