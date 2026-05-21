/**
 * 공지 노출 상태 자동 동기화 (Cloud Function)
 * 
 * 원칙:
 * - 매 1분마다 실행 (Cloud Scheduler)
 * - published 상태의 공지만 처리
 * - isVisible 값이 현재 조건과 다른 문서만 업데이트
 * - 불필요한 write 방지
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 공지 노출 상태 자동 동기화 함수
 * 
 * 매 1분마다 실행되어 published 상태의 공지 중
 * visibleFrom/visibleUntil 조건에 맞는 공지를 찾아
 * isVisible 필드를 자동으로 업데이트합니다.
 */
export const syncNoticeVisibility = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    logger.info("공지 노출 상태 동기화 시작");

    try {
      const now = Timestamp.now();

      // published 상태의 모든 공지 조회
      const noticesRef = db.collection("notices");
      const snap = await noticesRef
        .where("status", "==", "published")
        .get();

      if (snap.empty) {
        logger.info("동기화할 공지가 없습니다.");
        return;
      }

      const batch = db.batch();
      let updatedCount = 0;

      snap.docs.forEach((doc) => {
        const data = doc.data();

        // visibleFrom/visibleUntil이 없으면 스킵 (레거시 호환)
        if (!data.visibleFrom || !data.visibleUntil) {
          return;
        }

        // 노출 조건 계산
        const visibleFrom = data.visibleFrom as Timestamp;
        const visibleUntil = data.visibleUntil as Timestamp;

        const shouldBeVisible =
          visibleFrom.toMillis() <= now.toMillis() &&
          visibleUntil.toMillis() > now.toMillis();

        // 현재 isVisible 값과 비교
        const currentIsVisible = data.isVisible === true;

        if (currentIsVisible !== shouldBeVisible) {
          batch.update(doc.ref, {
            isVisible: shouldBeVisible,
            updatedAt: now,
            auditLogs: FieldValue.arrayUnion({
              action: shouldBeVisible ? "auto-visible" : "auto-hidden",
              by: "system",
              at: now,
            }),
          });

          updatedCount++;
          logger.info(`공지 ${doc.id}: isVisible ${currentIsVisible} → ${shouldBeVisible}`);
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        logger.info(`공지 노출 상태 동기화 완료: ${updatedCount}개 업데이트`);
      } else {
        logger.info("업데이트할 공지가 없습니다.");
      }
    } catch (error) {
      logger.error("공지 노출 상태 동기화 오류:", error);
      throw error;
    }
  }
);

