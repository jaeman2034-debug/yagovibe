import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { run } from "./kg/neo4j";

if (!getApps().length) {
    initializeApp();
}

/**
 * Step 57: 모델 배포 기록 → Knowledge Graph
 * Pub/Sub 'model-deploy-events' 토픽 메시지 수신 시 Neo4j에 노드 생성
 */
export const ingestModelDeploy = onMessagePublished(
    {
        topic: "model-deploy-events",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const message = JSON.parse(
                Buffer.from(event.data.message.data, "base64").toString("utf8")
            );

            logger.info("📊 모델 배포를 Knowledge Graph에 수집:", { id: message.id });

            const ts = message.ts || new Date().toISOString();
            const modelId = message.id || `model-${Date.now()}`;
            const ver = message.ver || "1.0.0";
            const sha = message.sha || "";
            const teamId = message.teamId || message.team;

            if (!teamId) {
                logger.warn("⚠️ 모델 배포 메시지에 teamId가 없습니다.");
                return;
            }

            // ModelVersion 노드 생성 및 Team 연결
            await run(
                `MERGE (v:ModelVersion {id: $id})
                 ON CREATE SET v.ver = $ver, v.sha = $sha, v.ts = $ts, v.createdAt = $ts
                 ON MATCH SET v.ver = $ver, v.sha = $sha, v.ts = $ts
                 MERGE (t:Team {id: $team})
                 ON CREATE SET t.createdAt = $ts
                 MERGE (v)-[:DEPLOYED_FOR]->(t)`,
                { id: modelId, ver, sha, ts, team: teamId }
            );

            // 이전 버전 연결 (있는 경우)
            if (message.previousVersion) {
                await run(
                    `MERGE (v1:ModelVersion {id: $prevId})
                     MERGE (v2:ModelVersion {id: $currId})
                     MERGE (v1)-[:REPLACED_BY]->(v2)`,
                    { prevId: message.previousVersion, currId: modelId }
                );
            }

            logger.info("✅ 모델 배포를 Knowledge Graph에 수집 완료:", { modelId });
        } catch (error: any) {
            logger.error("❌ 모델 배포 수집 오류:", error);
            // 에러는 재시도 가능하므로 예외 전파하지 않음
        }
    }
);

