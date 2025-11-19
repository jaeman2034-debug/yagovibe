import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 62: Get Decision Explain - 결정 해석 API
 * GET /getDecisionExplain?logId=LOG_ID
 */
export const getDecisionExplain = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { logId } = req.query as any;

            if (!logId) {
                res.status(400).json({ error: "logId is required" });
                return;
            }

            logger.info("🔍 결정 해석 요청:", { logId });

            const snap = await db.collection("auditLogs").doc(String(logId)).get();

            if (!snap.exists) {
                res.status(404).json({ error: "not found" });
                return;
            }

            const log: any = snap.data();

            // Why-Chain: 정책/그래프 링크 재구성
            const why: string[] = [];

            // 정책 일치 규칙
            if (log.policy?.matchedRules?.length) {
                why.push(
                    `정책 일치: ${log.policy.matchedRules.map((r: any) => r.metric || r.id || r).join(", ")}`
                );
            }

            // 지식그래프 관련 노드
            if (log.links?.kgNodes?.length) {
                why.push(`지식그래프 관련 노드: ${log.links.kgNodes.length}개`);
            }

            // 모델 정보
            if (log.model?.name) {
                why.push(`모델: ${log.model.name} (v${log.model.version || "unknown"})`);
            }

            // 액션 컨텍스트
            if (log.action) {
                why.push(`액션: ${log.action}`);
            }

            // Model Card 조회
            let modelCard = null;
            if (log.model?.version) {
                try {
                    const mc = await db
                        .collection("modelCards")
                        .where("version", "==", log.model.version)
                        .limit(1)
                        .get();

                    if (!mc.empty) {
                        modelCard = mc.docs[0].data();
                    }
                } catch (error) {
                    logger.warn("⚠️ Model Card 조회 실패:", error);
                }
            }

            // Timestamp 변환
            const when = log.ts?.toDate ? log.ts.toDate() : log.ts;

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                logId,
                action: log.action,
                actor: log.actor,
                subject: log.subject,
                when,
                why,
                model: log.model,
                modelCard,
                input: log.input,
                output: log.output,
                policy: log.policy,
                pii: log.pii,
                consent: log.consent,
                integrity: log.integrity,
                links: log.links,
            });
        } catch (error: any) {
            logger.error("❌ 결정 해석 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

