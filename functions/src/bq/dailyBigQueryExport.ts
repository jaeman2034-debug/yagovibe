/**
 * ✅ COMMIT 22: 일간 BigQuery Export Job
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { exportCollection } from "./exportToBigQuery";

export const dailyBigQueryExport = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 1,
    timeoutSeconds: 540, // 9분 (BigQuery 작업 시간 고려)
  },
  async (_req, res) => {
    try {
      const since = new Date(Date.now() - 24 * 3600 * 1000); // 최근 24시간

      logger.info(`[dailyBigQueryExport] 시작: ${since.toISOString()} 이후 데이터`);

      const results: any = {};

      // ✅ COMMIT 22: 각 컬렉션 Export
      results.auditLogs = await exportCollection("_auditLogs", "audit_logs", since);
      results.approvals = await exportCollection("_approvals", "approvals", since);
      results.ethicsDecisions = await exportCollection("_ethicsDecisions", "ethics_decisions", since);
      results.anomalies = await exportCollection("_anomalies", "anomalies", since);
      results.incidentSummaries = await exportCollection("_incidentSummaries", "incident_summaries", since);
      results.copilotChats = await exportCollection("_copilotChats", "copilot_chats", since);
      // ✅ COMMIT 26: Remediation Effects Export
      results.remediationEffects = await exportCollection("_remediationEffects", "remediation_effects", since);

      const total = Object.values(results).reduce(
        (sum: number, r: any) => sum + (r.exported ?? 0),
        0
      );

      logger.info(`[dailyBigQueryExport] 완료: 총 ${total}개 행 export`);

      res.json({ ok: true, results, total });
    } catch (e: any) {
      logger.error("[dailyBigQueryExport] 오류:", e);
      res.status(500).json({ ok: false, error: e?.message ?? "error" });
    }
  }
);

