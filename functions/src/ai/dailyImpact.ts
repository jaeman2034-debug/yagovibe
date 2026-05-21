// functions/src/ai/dailyImpact.ts
import * as admin from "firebase-admin";
import { summarizeWithLlmOrFallback } from "./llm";

const db = admin.firestore();

function ymd(date: Date) {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function generateDailyImpactReport(tenantId: string, dateStr?: string) {
  const day = dateStr ?? ymd(new Date());
  const reportId = `${tenantId}_${day}`;
  const reportRef = db.collection("_dailyReports").doc(reportId);

  // 당일 범위(UTC 기준 단순화)
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);

  // auditLogs/ethics/approvals 집계 (필요 최소)
  const [auditSnap, ethicsSnap, approvalsPendingSnap] = await Promise.all([
    db
      .collection("_auditLogs")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
      .get(),
    db
      .collection("_ethicsDecisions")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
      .get(),
    db.collection("_approvals").where("tenantId", "==", tenantId).where("status", "==", "pending").get(),
  ]);

  const auditCount = auditSnap.size;
  let block = 0,
    review = 0,
    allow = 0;
  const reasonCount: Record<string, number> = {};

  ethicsSnap.forEach((d) => {
    const e = d.data() as any;
    if (e.verdict === "block") block++;
    else if (e.verdict === "review_required") review++;
    else allow++;

    (e.reasons ?? []).forEach((r: string) => {
      reasonCount[r] = (reasonCount[r] ?? 0) + 1;
    });
  });

  const topReasons = Object.entries(reasonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // LLM 요약(없으면 fallback이 알아서 처리)
  const { summary, recommendation } = await summarizeWithLlmOrFallback({
    collection: "daily_report",
    action: "summarize",
    docId: reportId,
    before: null,
    payload: {
      day,
      auditCount,
      ethics: { allow, review, block, topReasons },
      pendingApprovals: approvalsPendingSnap.size,
    },
    ethicsScore: 100,
    ethicsReasons: [],
  });

  await reportRef.set(
    {
      tenantId,
      day,
      auditCount,
      ethics: { allow, review, block, topReasons },
      pendingApprovals: approvalsPendingSnap.size,
      summary,
      recommendation,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true, reportId };
}

