/**
 * 🔥 공지 작성 시 활동 점수 자동 적립
 * 
 * 역할:
 * - teams/{teamId}/notices/{noticeId} 생성 시
 * - 작성자에게 +3점 적립
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * 공지 작성 시 활동 점수 적립
 */
export const onNoticeScore = functions.firestore
  .document("teams/{teamId}/notices/{noticeId}")
  .onCreate(async (snap, context) => {
    const { teamId, noticeId } = context.params;
    const noticeData = snap.data();

    logger.info("📌 [onNoticeScore] 공지 생성 감지:", {
      teamId,
      noticeId,
      authorId: noticeData.authorId,
    });

    try {
      const authorId = noticeData.authorId;
      if (!authorId) {
        logger.warn("⚠️ [onNoticeScore] authorId 없음");
        return;
      }

      // 1️⃣ 팀 멤버 문서 업데이트
      const memberRef = db.doc(`teams/${teamId}/members/${authorId}`);

      const memberSnap = await memberRef.get();
      if (!memberSnap.exists) {
        logger.warn("⚠️ [onNoticeScore] 팀 멤버 문서 없음:", {
          teamId,
          authorId,
        });
        return;
      }

      // 2️⃣ 점수 적립 (+3점)
      const currentData = memberSnap.data();
      const currentScore = currentData?.score || 0;
      const newScore = currentScore + 3; // 공지 작성 +3점
      const newLevel = Math.floor(newScore / 50) + 1;

      await memberRef.update({
        score: admin.firestore.FieldValue.increment(3),
        noticeCount: admin.firestore.FieldValue.increment(1),
        level: newLevel,
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("✅ [onNoticeScore] 공지 작성 점수 적립 완료:", {
        teamId,
        authorId,
        newScore,
        newLevel,
      });
    } catch (error: any) {
      logger.error("❌ [onNoticeScore] 점수 적립 실패:", {
        teamId,
        noticeId,
        error: error.message,
        stack: error.stack,
      });
    }
  });
