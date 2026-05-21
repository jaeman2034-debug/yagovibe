/**
 * 🔥 납부 기한 알림 (매일 9시, 미납/부분납 자동 추적)
 * Scheduled Function: 매일 아침 미납자 찾아서 reminder 생성
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

const db = admin.firestore();

/**
 * 매일 9시 미납/부분납 알림 생성
 */
export const dailyPaymentReminders = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    try {
      // 모든 진행중 대회의 applications 조회
      // ⚠️ collectionGroup 사용 시 구조가 '.../applications'로 동일해야 함
      const applicationsSnap = await db
        .collectionGroup("applications")
        .where("paymentStatus", "in", ["UNPAID", "PARTIAL"])
        .get();

      const batch = db.batch();
      let count = 0;

      for (const doc of applicationsSnap.docs) {
        const app = doc.data() as any;

        // 납부 기한이 없으면 스킵
        if (!app.dueDate) continue;

        // 아직 기한 전이면 스킵 (D-1도 가능하지만 여기서는 기한 경과만)
        if (app.dueDate.toMillis() > now.toMillis()) continue;

        // 너무 자주 알림 방지 (하루 1회, 20시간 이내 재알림 방지)
        if (
          app.lastReminderAt &&
          now.toMillis() - app.lastReminderAt.toMillis() < 20 * 60 * 60 * 1000
        ) {
          continue;
        }

        const ref = doc.ref;

        // lastReminderAt 업데이트
        batch.update(ref, {
          lastReminderAt: now,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 리마인드 로그 (증빙)
        const reminderRef = ref.collection("reminders").doc();
        batch.set(reminderRef, {
          type: "PAYMENT_DUE",
          createdAt: now,
          dueAmount: app.dueAmount ?? null,
          paymentStatus: app.paymentStatus,
          message: `납부 기한이 경과되었습니다. 미납 금액: ${(app.dueAmount ?? 0).toLocaleString()}원을 확인해 주세요.`,
        });

        count++;

        // batch 제한 안전장치 (500개 제한)
        if (count >= 400) break;
      }

      if (count > 0) {
        await batch.commit();
        console.log(
          `[dailyPaymentReminders] Created ${count} payment reminders`
        );
      } else {
        console.log(`[dailyPaymentReminders] No reminders needed`);
      }
    } catch (error) {
      console.error(`[dailyPaymentReminders] Error:`, error);
      throw error;
    }
  }
);

