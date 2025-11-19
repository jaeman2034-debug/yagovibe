import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { setSecurityHeaders } from "./step69.securityHeaders";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 71: Assistant API Hub
 * Multi-Modal AI Extensions & Voice UX 2.0
 */

/**
 * Assistant Command API
 * POST /api/assistant/command
 * Authorization: Bearer <token>
 */
export const assistantCommand = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
        maxInstances: 10,
    },
    async (req, res) => {
        try {
            // 인증 확인
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const token = authHeader.substring(7);
            
            // TODO: JWT 토큰 검증
            // const decoded = await verifyToken(token);
            // const orgId = decoded.orgId;

            // Rate Limiting 체크
            const orgId = req.body?.context?.orgId || "default";
            const rateLimitKey = `ratelimits:assistant:${orgId}`;
            
            // TODO: Rate Limiting 구현 (Step 65 연동)
            // const isAllowed = await checkRateLimit(rateLimitKey, 60); // 60 rpm
            // if (!isAllowed) {
            //     res.status(429).json({ error: "Rate limit exceeded" });
            //     return;
            // }

            const { text, context } = req.body || {};

            if (!text) {
                res.status(400).json({ error: "text is required" });
                return;
            }

            logger.info("🤖 Assistant Command:", { text, context });

            // NLU 처리 (Step 52/58 GraphCopilot 연동)
            const functionsOrigin = process.env.FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            // NLU Handler 또는 GraphCopilot 엔진 호출
            // Step 52: opsRouterV2 또는 Step 58: graphCopilot 사용
            const nluResponse = await fetch(`${functionsOrigin}/nluHandler`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, context }),
            }).catch(async () => {
                // Fallback: graphCopilot 시도
                return await fetch(`${functionsOrigin}/graphCopilot`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: text, context }),
                });
            });

            if (!nluResponse.ok) {
                throw new Error("NLU 처리 실패");
            }

            const nluData = await nluResponse.json();

            // 플러그인 레지스트리 확인
            const intent = nluData.intent || "unknown";
            const plugin = await findPlugin(intent);

            let result = nluData.result || nluData.reply || "";
            const actions: any[] = nluData.actions || [];

            // 플러그인이 있으면 외부 API 호출
            if (plugin && plugin.enabled) {
                try {
                    const pluginResponse = await fetch(plugin.endpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${plugin.auth?.token || ""}`,
                        },
                        body: JSON.stringify({
                            intent,
                            params: nluData.params || {},
                            context,
                        }),
                    });

                    if (pluginResponse.ok) {
                        const pluginData = await pluginResponse.json();
                        result = pluginData.result || result;
                        if (pluginData.actions) {
                            actions.push(...pluginData.actions);
                        }
                    }
                } catch (error) {
                    logger.warn("⚠️ 플러그인 호출 실패:", error);
                }
            }

            // 사용 로그 기록
            await db.collection("assistantLogs").add({
                orgId,
                text,
                intent,
                result,
                actions,
                context,
                timestamp: Timestamp.now(),
            });

            setSecurityHeaders(res);
            res.json({
                intent,
                params: nluData.params || {},
                result,
                actions,
                context: {
                    ...context,
                    plugin: plugin?.id || null,
                },
            });
        } catch (error: any) {
            logger.error("❌ Assistant Command 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * 플러그인 찾기
 */
async function findPlugin(intent: string): Promise<any | null> {
    try {
        const pluginsSnap = await db
            .collection("plugins")
            .where("intents", "array-contains", intent)
            .where("enabled", "==", true)
            .limit(1)
            .get();

        if (pluginsSnap.empty) {
            return null;
        }

        return pluginsSnap.docs[0].data();
    } catch (error) {
        logger.warn("⚠️ 플러그인 조회 실패:", error);
        return null;
    }
}

/**
 * List Plugins
 * GET /api/assistant/plugins
 */
export const listPlugins = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const pluginsSnap = await db
                .collection("plugins")
                .where("enabled", "==", true)
                .get();

            const items = pluginsSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            setSecurityHeaders(res);
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 플러그인 목록 조회 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

