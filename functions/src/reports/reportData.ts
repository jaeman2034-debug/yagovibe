/**
 * 리포트 데이터 집계
 * 
 * Audit/Ethics/Policy/Approval 데이터를 수집하여 리포트용 데이터로 변환
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

export async function collectReportData(input: {
  tenantId: string;
  from: Date;
  to: Date;
}) {
  const { tenantId, from, to } = input;

  const fromTimestamp = admin.firestore.Timestamp.fromDate(from);
  const toTimestamp = admin.firestore.Timestamp.fromDate(to);

  const [auditSnap, ethicsSnap, approvalsSnap, policySnap] = await Promise.all([
    db
      .collection("_auditLogs")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", fromTimestamp)
      .where("createdAt", "<=", toTimestamp)
      .get(),
    db
      .collection("_ethicsDecisions")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", fromTimestamp)
      .where("createdAt", "<=", toTimestamp)
      .get(),
    db
      .collection("_approvals")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", fromTimestamp)
      .where("createdAt", "<=", toTimestamp)
      .get(),
    db
      .collection("_policyChanges")
      .where("tenantId", "==", tenantId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get(),
  ]);

  let allow = 0,
    review = 0,
    block = 0;
  const reasonCount: Record<string, number> = {};

  ethicsSnap.forEach((d) => {
    const e = d.data() as any;
    if (e.verdict === "allow") allow++;
    else if (e.verdict === "review_required") review++;
    else block++;

    (e.reasons ?? []).forEach((r: string) => {
      reasonCount[r] = (reasonCount[r] ?? 0) + 1;
    });
  });

  const topReasons = Object.entries(reasonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const pendingApprovals = approvalsSnap.docs.filter((d) => d.data().status === "pending").length;

  const latestPolicy = policySnap.empty ? null : policySnap.docs[0].data();

  return {
    period: { from, to },
    auditCount: auditSnap.size,
    ethics: { allow, review, block, topReasons },
    approvals: {
      total: approvalsSnap.size,
      pending: pendingApprovals,
    },
    policy: latestPolicy,
  };
}










