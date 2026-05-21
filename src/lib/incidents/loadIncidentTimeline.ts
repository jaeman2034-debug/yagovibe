/**
 * 운영 사고 타임라인 로더
 * 
 * Audit/Ethics/Approval/PolicyChange를 시간순으로 합쳐서 반환
 */

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import type { IncidentEvent } from "@/types/incident";

function toDate(x: any): Date {
  if (!x) return new Date(0);
  if (x.toDate) return x.toDate();
  if (x.seconds) return new Date(x.seconds * 1000);
  if (x instanceof Date) return x;
  return new Date(x);
}

export async function loadIncidentTimeline(input: {
  tenantId: string;
  from: Date;
  to: Date;
}): Promise<IncidentEvent[]> {
  const { tenantId, from, to } = input;

  const fromTimestamp = Timestamp.fromDate(from);
  const toTimestamp = Timestamp.fromDate(to);

  const range = (col: string) =>
    query(
      collection(db, col),
      where("tenantId", "==", tenantId),
      where("createdAt", ">=", fromTimestamp),
      where("createdAt", "<=", toTimestamp)
    );

  const [audits, ethics, approvals, policyChanges] = await Promise.all([
    getDocs(range("_auditLogs")),
    getDocs(range("_ethicsDecisions")),
    getDocs(range("_approvals")),
    getDocs(range("_policyChanges")),
  ]);

  const events: IncidentEvent[] = [];

  audits.forEach((d) => {
    const a: any = d.data();
    events.push({
      id: d.id,
      source: "audit",
      tenantId,
      timestamp: toDate(a.createdAt),
      collection: a.collection,
      docId: a.docId,
      auditId: a.auditId ?? a.meta?.auditId ?? undefined,
      title: `AUDIT · ${a.action}`,
      summary: `${a.collection}/${a.docId ?? "(new)"}`,
      raw: a,
    });
  });

  ethics.forEach((d) => {
    const e: any = d.data();
    events.push({
      id: d.id,
      source: "ethics",
      tenantId,
      timestamp: toDate(e.createdAt),
      collection: e.collection,
      docId: e.docId,
      auditId: e.auditId ?? d.id,
      title: `ETHICS · ${e.verdict.toUpperCase()} (${e.score})`,
      summary: (e.reasons ?? []).slice(0, 2).join(" / "),
      raw: e,
    });
  });

  approvals.forEach((d) => {
    const ap: any = d.data();
    events.push({
      id: d.id,
      source: "approval",
      tenantId,
      timestamp: toDate(ap.createdAt),
      collection: ap.collection,
      docId: ap.docId ?? undefined,
      auditId: ap.auditId ?? d.id,
      approvalId: ap.auditId ?? d.id,
      title: `APPROVAL · ${ap.status.toUpperCase()}`,
      summary: ap.summary ?? (ap.ethicsReasons ?? []).slice(0, 2).join(" / "),
      raw: ap,
    });
  });

  policyChanges.forEach((d) => {
    const pc: any = d.data();
    events.push({
      id: d.id,
      source: "policy_change",
      tenantId,
      timestamp: toDate(pc.createdAt),
      policyChangeId: pc.changeId ?? d.id,
      title: `POLICY · change`,
      summary: pc.simulationResult
        ? `risk=${pc.simulationResult.riskScore} (a/r/b ${pc.simulationResult.allow}/${pc.simulationResult.review}/${pc.simulationResult.block})`
        : "",
      raw: pc,
    });
  });

  // 시간순 정렬
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return events;
}










