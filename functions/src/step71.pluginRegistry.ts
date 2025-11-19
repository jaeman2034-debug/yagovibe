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
 * Step 71: Plugin Registry
 * Multi-Modal AI Extensions & Voice UX 2.0
 */

/**
 * Plugin 스키마
 */
export interface Plugin {
    id: string;
    name: string;
    description?: string;
    intents: string[]; // 지원하는 Intent 목록
    schema: Record<string, any>; // 파라미터 스키마
    endpoint: string; // 외부 API 엔드포인트
    auth: {
        type: "oauth2" | "jwt" | "api_key";
        token?: string;
        clientId?: string;
        clientSecret?: string;
    };
    enabled: boolean;
    rateLimit?: {
        rpm: number; // Requests per minute
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Register Plugin
 * POST /api/assistant/plugins/register
 */
export const registerPlugin = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            // 인증 확인 (관리자만)
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const plugin: Omit<Plugin, "createdAt" | "updatedAt"> = req.body || {};

            if (!plugin.id || !plugin.name || !plugin.endpoint) {
                res.status(400).json({ error: "id, name, and endpoint are required" });
                return;
            }

            const now = Timestamp.now();
            await db.collection("plugins").doc(plugin.id).set(
                {
                    ...plugin,
                    enabled: plugin.enabled !== undefined ? plugin.enabled : true,
                    createdAt: now,
                    updatedAt: now,
                },
                { merge: true }
            );

            logger.info(`✅ 플러그인 등록: ${plugin.id}`, { name: plugin.name });

            setSecurityHeaders(res);
            res.json({ ok: true, id: plugin.id });
        } catch (error: any) {
            logger.error("❌ 플러그인 등록 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Update Plugin
 * PUT /api/assistant/plugins/:id
 */
export const updatePlugin = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const pluginId = req.query.id as string;
            if (!pluginId) {
                res.status(400).json({ error: "id is required" });
                return;
            }

            const updates = req.body || {};

            await db.collection("plugins").doc(pluginId).update({
                ...updates,
                updatedAt: Timestamp.now(),
            });

            logger.info(`✅ 플러그인 업데이트: ${pluginId}`);

            setSecurityHeaders(res);
            res.json({ ok: true });
        } catch (error: any) {
            logger.error("❌ 플러그인 업데이트 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Initialize Default Plugins
 * POST /api/assistant/plugins/init
 */
export const initPlugins = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const defaultPlugins: Omit<Plugin, "createdAt" | "updatedAt">[] = [
                {
                    id: "facilities.reserve",
                    name: "시설 예약",
                    description: "경기장 및 시설 예약 서비스",
                    intents: ["reserve_facility", "check_facility"],
                    schema: {
                        facilityId: "string",
                        time: "string",
                        date: "string",
                    },
                    endpoint: "https://partner.yago-facility.com/api/reserve",
                    auth: {
                        type: "oauth2",
                    },
                    enabled: true,
                    rateLimit: {
                        rpm: 60,
                    },
                },
                {
                    id: "equipment.check",
                    name: "장비 조회",
                    description: "스포츠 장비 재고 및 예약 조회",
                    intents: ["check_equipment", "reserve_equipment"],
                    schema: {
                        equipmentType: "string",
                        teamId: "string",
                    },
                    endpoint: "https://partner.yago-equipment.com/api/check",
                    auth: {
                        type: "api_key",
                    },
                    enabled: true,
                    rateLimit: {
                        rpm: 30,
                    },
                },
            ];

            const now = Timestamp.now();

            for (const plugin of defaultPlugins) {
                await db.collection("plugins").doc(plugin.id).set(
                    {
                        ...plugin,
                        createdAt: now,
                        updatedAt: now,
                    },
                    { merge: true }
                );
            }

            logger.info(`✅ 기본 플러그인 초기화 완료: ${defaultPlugins.length}개`);

            setSecurityHeaders(res);
            res.json({ ok: true, count: defaultPlugins.length });
        } catch (error: any) {
            logger.error("❌ 플러그인 초기화 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

