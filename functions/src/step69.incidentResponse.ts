import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 69: Incident Response - 인시던트 대응
 * SEV 분류 및 온콜/런북 관리
 */

/**
 * SEV 분류
 */
export type SEVLevel = "SEV1" | "SEV2" | "SEV3";

/**
 * 인시던트 생성
 */
export async function createIncident(
    sev: SEVLevel,
    title: string,
    description: string,
    affectedServices: string[]
): Promise<string> {
    const incident = {
        sev,
        title,
        description,
        affectedServices,
        status: "open",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    const ref = await db.collection("incidents").add(incident);

    // SEV1/SEV2는 즉시 알림
    if (sev === "SEV1" || sev === "SEV2") {
        await sendIncidentAlert(sev, title, description, ref.id);
    }

    logger.error(`🚨 인시던트 생성: ${sev} - ${title}`, { incidentId: ref.id });

    return ref.id;
}

/**
 * 인시던트 알림 전송
 */
async function sendIncidentAlert(
    sev: SEVLevel,
    title: string,
    description: string,
    incidentId: string
): Promise<void> {
    const message = `🚨 ${sev} 인시던트 발생\n\n제목: ${title}\n설명: ${description}\n인시던트 ID: ${incidentId}`;

    // Slack 알림
    if (process.env.SLACK_WEBHOOK_URL) {
        try {
            await fetch(process.env.SLACK_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: message,
                    channel: sev === "SEV1" ? "#incidents-critical" : "#incidents",
                }),
            });
        } catch (error) {
            logger.warn("⚠️ Slack 알림 실패:", error);
        }
    }

    // 이메일 알림 (SEV1만)
    if (sev === "SEV1" && process.env.ALERT_EMAIL_TO) {
        // TODO: 이메일 전송 로직
        logger.info("📧 SEV1 이메일 알림 필요:", process.env.ALERT_EMAIL_TO);
    }
}

/**
 * 인시던트 해결
 */
export async function resolveIncident(
    incidentId: string,
    resolution: string,
    resolvedBy: string
): Promise<void> {
    await db.collection("incidents").doc(incidentId).update({
        status: "resolved",
        resolution,
        resolvedBy,
        resolvedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    logger.info(`✅ 인시던트 해결: ${incidentId}`, { resolvedBy });
}

/**
 * Postmortem 생성
 */
export async function createPostmortem(
    incidentId: string,
    summary: string,
    rootCause: string,
    timeline: string[],
    actions: string[]
): Promise<void> {
    await db.collection("postmortems").add({
        incidentId,
        summary,
        rootCause,
        timeline,
        actions,
        createdAt: Timestamp.now(),
    });

    logger.info(`📋 Postmortem 생성: ${incidentId}`);
}

/**
 * Create Incident API
 * POST /createIncident
 */
export const createIncidentAPI = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { sev, title, description, affectedServices } = req.body || {};

            if (!sev || !title) {
                res.status(400).json({ error: "sev and title are required" });
                return;
            }

            const incidentId = await createIncident(
                sev,
                title,
                description || "",
                affectedServices || []
            );

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ ok: true, incidentId });
        } catch (error: any) {
            logger.error("❌ 인시던트 생성 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * List Incidents API
 * GET /listIncidents?status=open&sev=SEV1
 */
export const listIncidents = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const status = req.query.status as string | undefined;
            const sev = req.query.sev as string | undefined;

            let query: any = db.collection("incidents");

            if (status) {
                query = query.where("status", "==", status);
            }
            if (sev) {
                query = query.where("sev", "==", sev);
            }

            const qs = await query.orderBy("createdAt", "desc").limit(50).get();

            const items = qs.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                };
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 인시던트 목록 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

