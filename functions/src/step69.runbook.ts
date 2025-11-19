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
 * Step 69: Runbook Template - 런북 템플릿 관리
 * Production Hardening & Launch Readiness
 */

/**
 * 런북 템플릿 스키마
 */
export interface RunbookTemplate {
    service: string; // 서비스명 (예: "GraphAsk", "InsightCopilot")
    symptom: string; // 증상 (예: "High latency", "Error rate spike")
    detection: {
        alerts?: string[]; // 경보 ID 목록
        dashboard?: string; // 대시보드 URL
        screenshots?: string[]; // 스크린샷 URL
    };
    impact: {
        users?: string; // 사용자 영향 추정
        orgs?: string; // 조직 영향 추정
        revenue?: string; // 매출 영향 추정
    };
    timeline: {
        occurred?: string; // 발생 시점
        detected?: string; // 탐지 시점
        action?: string; // 조치 시점
        recovered?: string; // 복구 시점
    };
    rootCause: {
        technical?: string; // 기술적 원인
        process?: string; // 프로세스 원인
    };
    mitigation: {
        hotfix?: string; // 핫픽스
        rollback?: string; // 롤백 절차
        workaround?: string; // 우회 방법
    };
    followUp: {
        tasks?: Array<{
            description: string;
            dueDate?: string;
            assignee?: string;
        }>;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Create Runbook Template
 * POST /createRunbookTemplate
 */
export const createRunbookTemplate = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const template: Omit<RunbookTemplate, "createdAt" | "updatedAt"> = req.body || {};

            if (!template.service || !template.symptom) {
                res.status(400).json({ error: "service and symptom are required" });
                return;
            }

            const now = Timestamp.now();
            const doc = {
                ...template,
                createdAt: now,
                updatedAt: now,
            };

            const ref = await db.collection("runbookTemplates").add(doc);

            logger.info(`✅ 런북 템플릿 생성: ${ref.id}`, { service: template.service, symptom: template.symptom });

            setSecurityHeaders(res);
            res.json({ ok: true, id: ref.id });
        } catch (error: any) {
            logger.error("❌ 런북 템플릿 생성 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Get Runbook Template
 * GET /getRunbookTemplate?service=SERVICE&symptom=SYMPTOM
 */
export const getRunbookTemplate = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { service, symptom } = req.query as any;

            let query: any = db.collection("runbookTemplates");

            if (service) {
                query = query.where("service", "==", service);
            }
            if (symptom) {
                query = query.where("symptom", "==", symptom);
            }

            const qs = await query.orderBy("updatedAt", "desc").limit(10).get();

            const items = qs.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                };
            });

            setSecurityHeaders(res);
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 런북 템플릿 조회 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Generate Runbook from Incident
 * POST /generateRunbookFromIncident
 * Body: { incidentId: string }
 */
export const generateRunbookFromIncident = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { incidentId } = req.body || {};

            if (!incidentId) {
                res.status(400).json({ error: "incidentId is required" });
                return;
            }

            // 인시던트 조회
            const incidentDoc = await db.collection("incidents").doc(incidentId).get();
            if (!incidentDoc.exists) {
                res.status(404).json({ error: "incident not found" });
                return;
            }

            const incident = incidentDoc.data() as any;

            // 런북 템플릿 생성
            const runbook: Omit<RunbookTemplate, "createdAt" | "updatedAt"> = {
                service: incident.affectedServices?.[0] || "unknown",
                symptom: incident.title || "Unknown symptom",
                detection: {
                    alerts: [incidentId],
                    dashboard: "/app/admin/pilot-console",
                },
                impact: {
                    users: "TBD",
                    orgs: "TBD",
                    revenue: "TBD",
                },
                timeline: {
                    occurred: incident.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    detected: incident.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    action: incident.resolvedAt?.toDate?.()?.toISOString(),
                    recovered: incident.resolvedAt?.toDate?.()?.toISOString(),
                },
                rootCause: {
                    technical: incident.description || "TBD",
                    process: "TBD",
                },
                mitigation: {
                    hotfix: incident.resolution || "TBD",
                    rollback: "TBD",
                    workaround: "TBD",
                },
                followUp: {
                    tasks: [],
                },
            };

            const now = Timestamp.now();
            const ref = await db.collection("runbookTemplates").add({
                ...runbook,
                createdAt: now,
                updatedAt: now,
            });

            logger.info(`✅ 인시던트에서 런북 생성: ${ref.id}`, { incidentId });

            setSecurityHeaders(res);
            res.json({ ok: true, id: ref.id, runbook });
        } catch (error: any) {
            logger.error("❌ 런북 생성 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

