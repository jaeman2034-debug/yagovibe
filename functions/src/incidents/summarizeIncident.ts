/**
 * ✅ COMMIT 14: Incident Summary Generator
 * 사건 요약 생성 (AI 기반 타임라인 요약)
 */

import * as admin from "firebase-admin";
import { summarizeWithLlmOrFallback } from "../ai/llm";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

function hashKey(tenantId: string, from: string, to: string): string {
  return `${tenantId}_${from}_${to}`.replace(/[:.]/g, "_");
}

export async function summarizeIncident(input: {
  tenantId: string;
  from: string;
  to: string;
}) {
  const { tenantId, from, to } = input;
  const key = hashKey(tenantId, from, to);
  const ref = db.collection("_incidentSummaries").doc(key);

  const start = new Date(from);
  const end = new Date(to);

  logger.info(`[summarizeIncident] 시작: tenantId=${tenantId}, from=${from}, to=${to}`);

  const [audits, ethics, approvals, policyChanges] = await Promise.all([
    db.collection("_auditLogs")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
      .orderBy("createdAt", "asc")
      .limit(200)
      .get(),
    db.collection("_ethicsDecisions")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
      .orderBy("createdAt", "asc")
      .limit(200)
      .get(),
    db.collection("_approvals")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
      .orderBy("createdAt", "asc")
      .limit(200)
      .get(),
    db.collection("_policyChanges")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
      .orderBy("createdAt", "asc")
      .limit(50)
      .get(),
  ]);

  // 압축 payload(토큰 절약)
  const compact = {
    audit: audits.docs.map((d) => {
      const a: any = d.data();
      return {
        t: a.createdAt?.toDate?.()?.toISOString?.() ?? "",
        action: a.action,
        col: a.collection,
        docId: a.docId,
      };
    }),
    ethics: ethics.docs.map((d) => {
      const e: any = d.data();
      return {
        t: e.createdAt?.toDate?.()?.toISOString?.() ?? "",
        verdict: e.verdict,
        score: e.score,
        col: e.collection,
        docId: e.docId,
        reasons: (e.reasons ?? []).slice(0, 2),
      };
    }),
    approvals: approvals.docs.map((d) => {
      const ap: any = d.data();
      return {
        t: ap.createdAt?.toDate?.()?.toISOString?.() ?? "",
        status: ap.status,
        col: ap.collection,
        docId: ap.docId ?? "(new)",
        ethics: ap.ethicsScore,
      };
    }),
    policy: policyChanges.docs.map((d) => {
      const pc: any = d.data();
      return {
        t: pc.createdAt?.toDate?.()?.toISOString?.() ?? "",
        risk: pc.simulationResult?.riskScore,
      };
    }),
  };

  // LLM 요약: 결정 금지 프롬프트는 llm.ts에 이미 고정
  const llm = await summarizeWithLlmOrFallback({
    collection: "incident",
    action: "summarize",
    docId: key,
    payload: compact,
    ethicsScore: 100,
    ethicsReasons: [],
  });

  const checklist = [
    "승인 대기(pending) 증가 여부 확인",
    "차단(block) 증가 원인(top reasons) 확인",
    "정책 변경(policy change) 직후 지표 급변 여부 확인",
    "특정 컬렉션/문서에 이벤트 집중 여부 확인",
    "롤백 필요성(버전 스냅샷) 검토",
  ];

  const out = {
    tenantId,
    from,
    to,
    summary: llm.summary,
    recommendation: llm.recommendation,
    checklist,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sourceCounts: {
      audit: audits.size,
      ethics: ethics.size,
      approvals: approvals.size,
      policyChanges: policyChanges.size,
    },
  };

  await ref.set(out, { merge: true });
  logger.info(`[summarizeIncident] 완료: key=${key}`);

  return { ok: true, key };
}

// ✅ HTTP 엔드포인트
export const incidentSummary = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const { tenantId, from, to } = req.body ?? {};
      if (!tenantId || !from || !to) {
        return res.status(400).json({ ok: false, error: "tenantId/from/to required" });
      }

      const out = await summarizeIncident({ tenantId, from, to });
      return res.json(out);
    } catch (e: any) {
      logger.error("[incidentSummary] 오류:", e);
      return res.status(500).json({ ok: false, error: e?.message ?? "error" });
    }
  }
);

