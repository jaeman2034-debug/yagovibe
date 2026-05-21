/**
 * 🔥 부스트 만료 체크 스케줄러 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 1분마다 만료된 부스트 비활성화
 * - 부스트 효과 모니터링
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

/**
 * 부스트 만료 체크 (1분마다)
 */
export const checkBoostExpiry = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    const now = Timestamp.now();
    const nowDate = now.toDate();

    // 만료된 부스트 찾기
    const expiredBoosts = await db
      .collection("market")
      .where("boostActive", "==", true)
      .where("boostEndTime", "<=", now)
      .limit(100)
      .get();

    if (expiredBoosts.empty) {
      logger.info("[checkBoostExpiry] 만료된 부스트 없음");
      return;
    }

    // 부스트 비활성화
    const batch = db.batch();
    expiredBoosts.docs.forEach((doc) => {
      batch.update(doc.ref, {
        boostActive: false,
        boostWeight: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    logger.info("[checkBoostExpiry] 부스트 만료 처리:", {
      count: expiredBoosts.size,
    });
  }
);
