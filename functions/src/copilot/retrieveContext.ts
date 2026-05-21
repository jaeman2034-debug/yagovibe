/**
 * ✅ COMMIT 20: 컨텍스트 수집 (근거 데이터만)
 */

import * as admin from "firebase-admin";
import type { QueryIntent } from "./queryRouter";

const db = admin.firestore();

export async function retrieveContext(input: {
  tenantId: string;
  intent: QueryIntent;
}) {
  const now = new Date();
  const hours = (input.intent as any).windowHours ?? 24;
  const from = new Date(now.getTime() - hours * 3600 * 1000);

  const startTs = admin.firestore.Timestamp.fromDate(from);
  const endTs = admin.firestore.Timestamp.fromDate(now);

  const limit = 50;
  const out: any = { from: from.toISOString(), to: now.toISOString(), capped: false };

  // 공통: 최근 anomalies
  const anomalies = await db
    .collection("_anomalies")
    .where("tenantId", "==", input.tenantId)
    .where("createdAt", ">=", startTs)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  out.anomalies = anomalies.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (input.intent.type === "pending_approvals") {
    const approvals = await db
      .collection("_approvals")
      .where("tenantId", "==", input.tenantId)
      .where("status", "==", "pending")
      .limit(limit)
      .get();

    out.approvals = approvals.docs.map((d) => ({ id: d.id, ...d.data() }));
    return out;
  }

  if (input.intent.type === "recent_policy_change") {
    const pc = await db
      .collection("_policyChanges")
      .where("tenantId", "==", input.tenantId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    out.policyChanges = pc.docs.map((d) => ({ id: d.id, ...d.data() }));
    return out;
  }

  // general/why_alert/incident_summary: 최근 24h audit/ethics/approval
  const [audit, ethics, approvals] = await Promise.all([
    db
      .collection("_auditLogs")
      .where("tenantId", "==", input.tenantId)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),

    db
      .collection("_ethicsDecisions")
      .where("tenantId", "==", input.tenantId)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),

    db
      .collection("_approvals")
      .where("tenantId", "==", input.tenantId)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get(),
  ]);

  out.audit = audit.docs.map((d) => ({ id: d.id, ...d.data() }));
  out.ethics = ethics.docs.map((d) => ({ id: d.id, ...d.data() }));
  out.approvals = approvals.docs.map((d) => ({ id: d.id, ...d.data() }));

  // capped 플래그(더 많을 수 있음)
  out.capped = audit.size === limit || ethics.size === limit || approvals.size === limit;
  return out;
}

