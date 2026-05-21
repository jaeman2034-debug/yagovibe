/**
 * ✅ COMMIT 17: 일간 운영 잡 통합 엔드포인트
 * Metrics 생성 → Anomaly 체크 순서 보장
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { listTenants } from "../tenants/listTenants";
import { writeDailyMetrics } from "./metricsDailyJob";
import { runDailyAnomalyCheck } from "./dailyAnomalyJob";

// Firebase Admin 초기화
if (admin.apps.length === 0) {
  admin.initializeApp();
}

function dayKeyUTC(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const dailyOps = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 1, // 동시 실행 방지
    timeoutSeconds: 540, // 9분 (여러 테넌트 처리 시간 고려)
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

      const day = (req.body?.day as string) || undefined;

      logger.info(`[dailyOps] 시작: day=${day ?? "today"}`);

      const tenants = await listTenants();
      if (!tenants.length) {
        logger.warn("[dailyOps] 테넌트 없음");
        return res.json({ ok: true, message: "no tenants found in _tenants" });
      }

      logger.info(`[dailyOps] 테넌트 ${tenants.length}개 처리 시작`);

      const results: any[] = [];
      for (const t of tenants) {
        try {
          const m = await writeDailyMetrics(t, day);
          const a = await runDailyAnomalyCheck(t, day);
          results.push({ tenantId: t, metrics: m, anomaly: a });
        } catch (error: any) {
          logger.error(`[dailyOps] 테넌트 ${t} 처리 오류:`, error);
          results.push({ tenantId: t, error: error?.message });
        }
      }

      logger.info(`[dailyOps] 완료: ${results.length}개 테넌트 처리`);

      res.json({ ok: true, results });
    } catch (error: any) {
      logger.error("[dailyOps] 오류:", error);
      res.status(500).json({ ok: false, error: error?.message ?? "error" });
    }
  }
);

