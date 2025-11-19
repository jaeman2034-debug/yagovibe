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
 * Step 57: 알람 수집기 → Knowledge Graph
 * teams/{teamId}/alerts/{alertId} 문서 생성 시 Neo4j에 노드 생성
 */
export const ingestAlertsToKG = onDocumentCreated(
    {
        document: "teams/{teamId}/alerts/{alertId}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const { teamId, alertId } = event.params;
            const data: any = event.data?.data();

            if (!data) {
                logger.info("⚠️ 알람 데이터가 없습니다.");
                return;
            }

            logger.info("📊 알람을 Knowledge Graph에 수집:", { teamId, alertId });

            const ts = new Date();
            const type = data.type || "alert";
            const meta = JSON.stringify(data);

            // Team 노드 생성 및 Event 노드 생성 및 연결
            await run(
                `MERGE (t:Team {id: $teamId})
                 ON CREATE SET t.createdAt = $ts
                 MERGE (ev:Event {id: $eid})
                 ON CREATE SET ev.type = $type, ev.ts = $ts, ev.meta = $meta
                 ON MATCH SET ev.type = $type, ev.ts = $ts, ev.meta = $meta
                 MERGE (ev)-[:AFFECTS]->(t)`,
                { teamId, eid: alertId, type, ts: ts.toISOString(), meta }
            );

            // Report 연결 (있는 경우)
            if (data.reportId) {
                await run(
                    `MERGE (r:Report {id: $reportId})
                     ON CREATE SET r.createdAt = $ts
                     MERGE (ev:Event {id: $eid})
                     MERGE (ev)-[:AFFECTS]->(r)`,
                    { reportId: data.reportId, eid: alertId, ts: ts.toISOString() }
                );
            }

            // 정책/승인 정보 연결 (있는 경우)
            if (data.policyId) {
                await run(
                    `MERGE (p:PolicyRule {id: $pid})
                     ON CREATE SET p.name = $pid, p.createdAt = $ts
                     MERGE (ev:Event {id: $eid})
                     MERGE (p)-[:FIRED_ON]->(ev)`,
                    { pid: data.policyId, eid: alertId, ts: ts.toISOString() }
                );
            }

            // Action 트리거 (있는 경우)
            if (data.actionId) {
                await run(
                    `MERGE (ev:Event {id: $eid})
                     MERGE (a:Action {id: $actionId})
                     MERGE (ev)-[:TRIGGERED]->(a)`,
                    { eid: alertId, actionId: data.actionId }
                );
            }

            logger.info("✅ 알람을 Knowledge Graph에 수집 완료:", { teamId, alertId });
        } catch (error: any) {
            logger.error("❌ 알람 수집 오류:", error);
            // 에러는 재시도 가능하므로 예외 전파하지 않음
        }
    }
);

