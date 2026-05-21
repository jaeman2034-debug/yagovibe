/**
 * ✅ COMMIT 27: Remediation 정책 추천 HTTP 엔드포인트
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { recommendRemediationPolicy } from "./recommendPolicy";

export const recommendRemediationPolicyEndpoint = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 5,
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

      const { tenantId, anomaly } = req.body ?? {};

      if (!tenantId || !anomaly) {
        return res.status(400).json({ ok: false, error: "tenantId/anomaly required" });
      }

      const recommendation = await recommendRemediationPolicy({ tenantId, anomaly });

      res.json({ ok: true, recommendation });
    } catch (e: any) {
      logger.error("[recommendRemediationPolicyEndpoint] 오류:", e);
      res.status(500).json({ ok: false, error: e?.message ?? "error" });
    }
  }
);

