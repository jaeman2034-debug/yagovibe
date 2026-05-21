/**
 * ✅ COMMIT 25: Remediation 승인 HTTP 엔드포인트
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { approveRemediation, rejectRemediation } from "./processRemediationApproval";

export const approveRemediationEndpoint = onRequest(
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

      const { approvalId, extendMinutes } = req.body ?? {};
      const userId = (req as any).auth?.uid ?? "unknown";

      if (!approvalId) {
        return res.status(400).json({ ok: false, error: "approvalId required" });
      }

      await approveRemediation({ approvalId, userId, extendMinutes });

      res.json({ ok: true });
    } catch (e: any) {
      logger.error("[approveRemediationEndpoint] 오류:", e);
      res.status(500).json({ ok: false, error: e?.message ?? "error" });
    }
  }
);

export const rejectRemediationEndpoint = onRequest(
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

      const { approvalId } = req.body ?? {};
      const userId = (req as any).auth?.uid ?? "unknown";

      if (!approvalId) {
        return res.status(400).json({ ok: false, error: "approvalId required" });
      }

      await rejectRemediation({ approvalId, userId });

      res.json({ ok: true });
    } catch (e: any) {
      logger.error("[rejectRemediationEndpoint] 오류:", e);
      res.status(500).json({ ok: false, error: e?.message ?? "error" });
    }
  }
);

