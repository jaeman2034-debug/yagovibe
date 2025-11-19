import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { setSecurityHeaders } from "./step69.securityHeaders";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// POST /api/gateway/assist
// Body: { intent: string, params: any, context?: any }
export const assistantGateway = onRequest(
  { region: "asia-northeast3", cors: true, maxInstances: 20 },
  async (req, res) => {
    try {
      const { intent, params, context } = req.body || {};
      if (!intent) {
        res.status(400).json({ error: "intent is required" });
        return;
      }

      // 인증 확인 (Bearer 토큰 기반) - 실제 검증은 Step 65/64 연동
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // intent에 맞는 플러그인 조회
      const ps = await db
        .collection("plugins")
        .where("intents", "array-contains", intent)
        .where("enabled", "==", true)
        .orderBy("updatedAt", "desc")
        .limit(1)
        .get();

      if (ps.empty) {
        res.status(404).json({ error: "plugin_not_found" });
        return;
      }

      const plugin = ps.docs[0].data() as any;

      // 호출 로깅 사전 기록
      const callRef = await db.collection("assistantLogs").add({
        type: "gateway_call",
        pluginId: ps.docs[0].id,
        intent,
        params,
        context,
        createdAt: Timestamp.now(),
        status: "pending",
      });

      // 파트너 웹훅 호출
      const resp = await fetch(plugin.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ intent, params, context }),
      });

      const data = await resp.json().catch(() => ({}));

      // 사용량 기록 (간단)
      await db.collection("usage").add({
        subject: `plugin:${ps.docs[0].id}`,
        ts: Timestamp.now(),
        rpm: 1,
        intent,
        ok: resp.ok,
      });

      // 호출 결과 업데이트
      await callRef.update({ status: resp.ok ? "ok" : "error", response: data, finishedAt: Timestamp.now() });

      setSecurityHeaders(res);
      if (!resp.ok) {
        res.status(502).json({ error: "plugin_error", detail: data });
        return;
      }
      res.json({ ok: true, result: data.result, actions: data.actions || [] });
    } catch (error: any) {
      logger.error("❌ assistantGateway 오류", error);
      res.status(500).json({ error: error.message });
    }
  }
);
