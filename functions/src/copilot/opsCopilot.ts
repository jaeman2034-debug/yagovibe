/**
 * ✅ COMMIT 20: Ops Copilot HTTP 엔드포인트
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { routeQuery } from "./queryRouter";
import { retrieveContext } from "./retrieveContext";
import { generateCopilotAnswer } from "./answer";

const db = admin.firestore();

export const opsCopilot = onRequest(
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

      const { tenantId, question } = req.body ?? {};

      if (!tenantId || !question) {
        return res.status(400).json({ ok: false, error: "tenantId/question required" });
      }

      // ✅ 보안: tenantId는 auth token에서 가져오는 것을 권장 (여기서는 클라 입력 그대로 사용)
      // TODO: 실제 운영에서는 req.auth.token.tenantId로 덮어쓰기

      const intent = routeQuery(String(question));
      logger.info(`[opsCopilot] intent: ${intent.type}, tenantId: ${tenantId}`);

      const ctx = await retrieveContext({ tenantId, intent });
      logger.info(`[opsCopilot] context retrieved: ${JSON.stringify(Object.keys(ctx))}`);

      const answer = await generateCopilotAnswer({
        tenantId,
        question: String(question),
        ctx,
      });

      // ✅ COMMIT 20-3: 대화 히스토리 저장
      const chatId = `${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const userId = (req as any).auth?.uid ?? "unknown";
      const role = (req as any).auth?.token?.role ?? "unknown";

      try {
        await db.collection("_copilotChats").doc(chatId).set({
          tenantId,
          userId,
          role,
          question: String(question),
          answer,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          correlationId: answer.links?.correlationId ?? null,
        });

        // ✅ COMMIT 20-3: Audit 로그화
        await db.collection("_auditLogs").add({
          tenantId,
          action: "copilot.query",
          collection: "_copilotChats",
          docId: chatId,
          correlationId: answer.links?.correlationId ?? null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (saveError: any) {
        logger.warn(`[opsCopilot] 대화 히스토리 저장 실패 (무시): ${saveError?.message}`);
        // 저장 실패해도 답변은 반환
      }

      res.json({ ok: true, answer });
    } catch (e: any) {
      logger.error("[opsCopilot] 오류:", e);
      res.status(500).json({ ok: false, error: e?.message ?? "error" });
    }
  }
);

