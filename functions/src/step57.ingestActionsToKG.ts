import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { run } from "./kg/neo4j";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 57: 액션 수집기 → Knowledge Graph
 * tuningLogs/{logId} 또는 actions/{actionId} 문서 생성 시 Neo4j에 노드 생성
 */
export const ingestActionsToKG = onDocumentCreated(
    {
        document: "tuningLogs/{logId}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const { logId } = event.params;
            const log: any = event.data?.data();

            if (!log || !log.teamId) {
                logger.info("⚠️ 튜닝 로그 데이터가 없거나 teamId가 없습니다.");
                return;
            }

            logger.info("📊 액션을 Knowledge Graph에 수집:", { logId, teamId: log.teamId });

            const ts = new Date();
            const actionType = log.actionType || "retuning";
            const meta = JSON.stringify(log);

            // Team 노드 생성 및 Action 노드 생성 및 연결
            await run(
                `MERGE (t:Team {id: $team})
                 ON CREATE SET t.createdAt = $ts
                 MERGE (a:Action {id: $id})
                 ON CREATE SET a.type = $actionType, a.ts = $ts, a.meta = $meta
                 ON MATCH SET a.type = $actionType, a.ts = $ts, a.meta = $meta
                 MERGE (a)-[:APPLIED_TO]->(t)`,
                { team: log.teamId, id: logId, actionType, ts: ts.toISOString(), meta }
            );

            // Report 연결 (있는 경우)
            if (log.reportId) {
                await run(
                    `MERGE (r:Report {id: $reportId})
                     ON CREATE SET r.createdAt = $ts
                     MERGE (a:Action {id: $id})
                     MERGE (a)-[:APPLIED_TO]->(r)`,
                    { reportId: log.reportId, id: logId, ts: ts.toISOString() }
                );
            }

            // Event 트리거 (있는 경우)
            if (log.eventId) {
                await run(
                    `MERGE (ev:Event {id: $eventId})
                     MERGE (a:Action {id: $id})
                     MERGE (ev)-[:TRIGGERED]->(a)`,
                    { eventId: log.eventId, id: logId }
                );
            }

            logger.info("✅ 액션을 Knowledge Graph에 수집 완료:", { logId });
        } catch (error: any) {
            logger.error("❌ 액션 수집 오류:", error);
            // 에러는 재시도 가능하므로 예외 전파하지 않음
        }
    }
);

/**
 * 일반 액션 수집 (actions 컬렉션)
 */
export const ingestGeneralActionsToKG = onDocumentCreated(
    {
        document: "actions/{actionId}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const { actionId } = event.params;
            const action: any = event.data?.data();

            if (!action || !action.teamId) {
                logger.info("⚠️ 액션 데이터가 없거나 teamId가 없습니다.");
                return;
            }

            logger.info("📊 일반 액션을 Knowledge Graph에 수집:", { actionId });

            const ts = new Date();
            const actionType = action.type || "unknown";
            const meta = JSON.stringify(action);

            await run(
                `MERGE (t:Team {id: $team})
                 ON CREATE SET t.createdAt = $ts
                 MERGE (a:Action {id: $id})
                 ON CREATE SET a.type = $actionType, a.ts = $ts, a.meta = $meta
                 ON MATCH SET a.type = $actionType, a.ts = $ts, a.meta = $meta
                 MERGE (a)-[:APPLIED_TO]->(t)`,
                { team: action.teamId, id: actionId, actionType, ts: ts.toISOString(), meta }
            );

            logger.info("✅ 일반 액션을 Knowledge Graph에 수집 완료:", { actionId });
        } catch (error: any) {
            logger.error("❌ 일반 액션 수집 오류:", error);
        }
    }
);

