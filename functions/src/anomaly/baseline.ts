/**
 * ✅ COMMIT 17: Baseline 생성
 * 최근 N일 이동 평균 + 표준편차 계산
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

export interface Baseline {
  tenantId: string;
  metric: string;
  avg: number;
  std: number;
  samples?: number;
  updatedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
}

export async function buildBaseline(tenantId: string, metric: string, days = 14): Promise<Baseline | null> {
  const since = admin.firestore.Timestamp.fromDate(new Date(Date.now() - days * 86400000));

  const snap = await db
    .collection("_metrics")
    .where("tenantId", "==", tenantId)
    .where("metric", "==", metric)
    .where("date", ">=", since)
    .get();

  const values = snap.docs.map((d) => Number(d.data().value)).filter((v) => Number.isFinite(v));
  if (values.length < 5) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);

  const out: Baseline = {
    tenantId,
    metric,
    avg,
    std,
    samples: values.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("_baselines").doc(`${tenantId}_${metric}`).set(out, { merge: true });
  return out;
}

