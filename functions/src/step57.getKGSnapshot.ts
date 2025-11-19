import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { run } from "./kg/neo4j";

if (!getApps().length) {
    initializeApp();
}

/**
 * Step 57: Knowledge Graph Snapshot API
 * GET /getKGSnapshot?team=SOHEUL_FC&limit=50
 */
export const getKGSnapshot = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const team = req.query.team as string | undefined;
            const limit = parseInt(req.query.limit as string) || 50;
            const days = parseInt(req.query.days as string) || 7;

            logger.info("📊 Knowledge Graph Snapshot 조회:", { team, limit, days });

            const where = team ? "WHERE t.id = $team" : "";
            const timeFilter = `WHERE datetime(e.ts) > datetime() - duration({days: $days})`;

            const query = `
                MATCH (t:Team) ${where}
                OPTIONAL MATCH (e:Event)-[:AFFECTS]->(t) ${timeFilter}
                OPTIONAL MATCH (a:Action)-[:APPLIED_TO]->(t)
                OPTIONAL MATCH (p:PolicyRule)-[:FIRED_ON]->(e)
                OPTIONAL MATCH (v:ModelVersion)-[:DEPLOYED_FOR]->(t)
                OPTIONAL MATCH (r:Report)<-[:AFFECTS]-(e)
                OPTIONAL MATCH (e)-[:TRIGGERED]->(a)
                WITH t, e, a, p, v, r
                LIMIT $limit
                RETURN 
                    collect(DISTINCT {id: t.id, label: t.id, group: 'Team'}) AS teams,
                    collect(DISTINCT {id: e.id, label: e.type || 'Event', group: 'Event', meta: e.meta}) AS events,
                    collect(DISTINCT {id: a.id, label: a.type || 'Action', group: 'Action', meta: a.meta}) AS actions,
                    collect(DISTINCT {id: p.id, label: p.name || p.id, group: 'Policy'}) AS policies,
                    collect(DISTINCT {id: v.id, label: v.ver || 'Model', group: 'Model'}) AS models,
                    collect(DISTINCT {id: r.id, label: r.id, group: 'Report'}) AS reports,
                    collect(DISTINCT {
                        id: 'ae-' + e.id + '-' + t.id,
                        source: e.id,
                        target: t.id,
                        label: 'AFFECTS',
                        group: 'EventToTeam'
                    }) AS e_edges,
                    collect(DISTINCT {
                        id: 'aa-' + a.id + '-' + t.id,
                        source: a.id,
                        target: t.id,
                        label: 'APPLIED_TO',
                        group: 'ActionToTeam'
                    }) AS a_edges,
                    collect(DISTINCT {
                        id: 'pf-' + p.id + '-' + e.id,
                        source: p.id,
                        target: e.id,
                        label: 'FIRED_ON',
                        group: 'PolicyToEvent'
                    }) AS p_edges,
                    collect(DISTINCT {
                        id: 'vd-' + v.id + '-' + t.id,
                        source: v.id,
                        target: t.id,
                        label: 'DEPLOYED_FOR',
                        group: 'ModelToTeam'
                    }) AS v_edges,
                    collect(DISTINCT {
                        id: 'et-' + e.id + '-' + a.id,
                        source: e.id,
                        target: a.id,
                        label: 'TRIGGERED',
                        group: 'EventToAction'
                    }) AS trigger_edges`;

            const result = await run(query, { team, limit, days });

            if (result.records.length === 0) {
                res.setHeader("Access-Control-Allow-Origin", "*");
                return res.json({ nodes: [], edges: [] });
            }

            const first = result.records[0];
            const teams = first.get("teams") || [];
            const events = first.get("events") || [];
            const actions = first.get("actions") || [];
            const policies = first.get("policies") || [];
            const models = first.get("models") || [];
            const reports = first.get("reports") || [];

            // 노드 중복 제거
            const nodeMap = new Map<string, any>();
            [...teams, ...events, ...actions, ...policies, ...models, ...reports].forEach((n: any) => {
                if (n && n.id) {
                    nodeMap.set(n.id, n);
                }
            });
            const nodes = Array.from(nodeMap.values());

            // 엣지 수집
            const e_edges = first.get("e_edges") || [];
            const a_edges = first.get("a_edges") || [];
            const p_edges = first.get("p_edges") || [];
            const v_edges = first.get("v_edges") || [];
            const trigger_edges = first.get("trigger_edges") || [];

            // 엣지 중복 제거
            const edgeMap = new Map<string, any>();
            [...e_edges, ...a_edges, ...p_edges, ...v_edges, ...trigger_edges].forEach((e: any) => {
                if (e && e.id) {
                    edgeMap.set(e.id, e);
                }
            });
            const edges = Array.from(edgeMap.values());

            logger.info("✅ Knowledge Graph Snapshot 조회 완료:", {
                nodes: nodes.length,
                edges: edges.length,
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ nodes, edges, meta: { team, limit, days, timestamp: new Date().toISOString() } });
        } catch (error: any) {
            logger.error("❌ Knowledge Graph Snapshot 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 57: Knowledge Graph 쿼리 API
 * POST /queryKG
 * Body: { query: "Cypher 쿼리", params: {...} }
 */
export const queryKG = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { query, params } = req.body;

            if (!query) {
                res.status(400).json({ error: "query is required" });
                return;
            }

            logger.info("🔍 Knowledge Graph 쿼리 실행:", { query: query.substring(0, 100) + "..." });

            const result = await run(query, params || {});

            const records = result.records.map((record: any) => {
                const obj: any = {};
                record.keys.forEach((key: string) => {
                    obj[key] = record.get(key);
                });
                return obj;
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ records, count: records.length });
        } catch (error: any) {
            logger.error("❌ Knowledge Graph 쿼리 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

