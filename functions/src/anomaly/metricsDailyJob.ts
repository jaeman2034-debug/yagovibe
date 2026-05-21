/**
 * ✅ COMMIT 17: _metrics 생성 잡
 * Audit/Ethics/Approvals에서 일간 카운트를 만들고 _metrics에 저장
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

function dayKeyUTC(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function writeDailyMetrics(tenantId: string, day = dayKeyUTC()) {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);
  const startTs = admin.firestore.Timestamp.fromDate(start);
  const endTs = admin.firestore.Timestamp.fromDate(end);

  logger.info(`[writeDailyMetrics] 시작: tenantId=${tenantId}, day=${day}`);

  const [auditSnap, ethicsSnap, approvalsPendingSnap] = await Promise.all([
    db.collection("_auditLogs")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get(),

    db.collection("_ethicsDecisions")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get(),

    // pending은 "현재 시점 스냅샷"도 유용해서 date 범위 없이 별도
    db.collection("_approvals").where("tenantId", "==", tenantId).where("status", "==", "pending").get(),
  ]);

  // ethics block count
  let ethicsBlock = 0;
  ethicsSnap.forEach((d) => {
    const e: any = d.data();
    if (e.verdict === "block") ethicsBlock++;
  });

  const metrics = [
    { metric: "audit.write.count", value: auditSnap.size },
    { metric: "ethics.block.count", value: ethicsBlock },
    { metric: "approvals.pending.count", value: approvalsPendingSnap.size },
  ];

  const date = admin.firestore.Timestamp.fromDate(start);

  // 문서키를 deterministic하게: tenant_metric_day
  for (const m of metrics) {
    const id = `${tenantId}_${m.metric}_${day}`;
    await db
      .collection("_metrics")
      .doc(id)
      .set(
        {
          tenantId,
          metric: m.metric,
          value: m.value,
          day,
          date,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  logger.info(`[writeDailyMetrics] 완료: tenantId=${tenantId}, day=${day}, metrics=${metrics.length}개`);

  return { ok: true, tenantId, day, metrics };
}

