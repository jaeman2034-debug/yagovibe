/**
 * Stripe 제한 해제(billing_recovered) 이벤트를 `billingRecoveryEvents`에 쌓고,
 * 여기서 최근 7일·30일 건수를 `platformMetrics/current`에 반영한다.
 * - 31일 초과 문서는 배치 삭제로 컬렉션 크기 상한 유지
 */
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const EVENTS = "billingRecoveryEvents";
const METRICS = "platformMetrics/current";
const SEVEN_MS = 7 * 86400000;
const THIRTY_MS = 30 * 86400000;
const RETENTION_MS = 31 * 86400000;
const DELETE_BATCH = 400;

export const rollupBillingRecoveryMetricsScheduler = onSchedule(
  {
    schedule: "40 0 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    const now = Date.now();
    const sevenAgo = admin.firestore.Timestamp.fromMillis(now - SEVEN_MS);
    const thirtyAgo = admin.firestore.Timestamp.fromMillis(now - THIRTY_MS);
    const retentionCutoff = admin.firestore.Timestamp.fromMillis(now - RETENTION_MS);

    const col = db.collection(EVENTS);

    const [c7, c30] = await Promise.all([
      col.where("recoveredAt", ">=", sevenAgo).count().get(),
      col.where("recoveredAt", ">=", thirtyAgo).count().get(),
    ]);

    const recent7 = c7.data().count;
    const recent30 = c30.data().count;

    let deletedTotal = 0;
    for (let round = 0; round < 25; round++) {
      const oldSnap = await col
        .where("recoveredAt", "<", retentionCutoff)
        .orderBy("recoveredAt", "asc")
        .limit(DELETE_BATCH)
        .get();
      if (oldSnap.empty) break;
      const batch = db.batch();
      for (const d of oldSnap.docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
      deletedTotal += oldSnap.size;
      if (oldSnap.size < DELETE_BATCH) break;
    }

    await db.doc(METRICS).set(
      {
        recentRecoveredBillingTeams7d: recent7,
        recentRecoveredBillingTeams30d: recent30,
        billingRecoveryMetricsRolledUpAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("[rollupBillingRecoveryMetricsScheduler] ok", {
      recent7,
      recent30,
      deletedTotal,
    });
  }
);
