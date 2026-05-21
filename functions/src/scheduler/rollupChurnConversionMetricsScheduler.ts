/**
 * billingChurnEvents / billingConversionEvents → platformMetrics 최근 7일·30일 건수.
 * 31일 초과 이벤트 삭제(스토리지 상한).
 */
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const METRICS = "platformMetrics/current";
const SEVEN_MS = 7 * 86400000;
const THIRTY_MS = 30 * 86400000;
const RETENTION_MS = 31 * 86400000;
const DELETE_BATCH = 400;

async function rollupCollection(
  collectionName: string,
  field: string,
  sevenAgo: admin.firestore.Timestamp,
  thirtyAgo: admin.firestore.Timestamp,
  retentionCutoff: admin.firestore.Timestamp
): Promise<{ c7: number; c30: number; deleted: number }> {
  const col = db.collection(collectionName);
  const [c7, c30] = await Promise.all([
    col.where(field, ">=", sevenAgo).count().get(),
    col.where(field, ">=", thirtyAgo).count().get(),
  ]);

  let deleted = 0;
  for (let round = 0; round < 25; round++) {
    const oldSnap = await col
      .where(field, "<", retentionCutoff)
      .orderBy(field, "asc")
      .limit(DELETE_BATCH)
      .get();
    if (oldSnap.empty) break;
    const batch = db.batch();
    for (const d of oldSnap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
    deleted += oldSnap.size;
    if (oldSnap.size < DELETE_BATCH) break;
  }
  return { c7: c7.data().count, c30: c30.data().count, deleted };
}

export const rollupChurnConversionMetricsScheduler = onSchedule(
  {
    schedule: "45 0 * * *",
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

    const churn = await rollupCollection("billingChurnEvents", "churnedAt", sevenAgo, thirtyAgo, retentionCutoff);
    const conv = await rollupCollection(
      "billingConversionEvents",
      "convertedAt",
      sevenAgo,
      thirtyAgo,
      retentionCutoff
    );

    await db.doc(METRICS).set(
      {
        churnedSubscriptions7d: churn.c7,
        churnedSubscriptions30d: churn.c30,
        trialToPaidConversions7d: conv.c7,
        trialToPaidConversions30d: conv.c30,
        billingChurnConversionRollupAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("[rollupChurnConversionMetricsScheduler] ok", {
      churn7: churn.c7,
      churn30: churn.c30,
      conv7: conv.c7,
      conv30: conv.c30,
      churnDeleted: churn.deleted,
      convDeleted: conv.deleted,
    });
  }
);
