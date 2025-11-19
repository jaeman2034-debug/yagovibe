import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { run } from "./kg/neo4j";
import OpenAI from "openai";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Cypher 쿼리 안전 검증
 * READ-ONLY 쿼리만 허용 (MATCH/RETURN), 쓰기 작업 차단
 */
function validateCypherQuery(query: string): { valid: boolean; error?: string } {
    const upperQuery = query.toUpperCase().trim();

    // 위험한 키워드 차단
    const dangerousKeywords = [
        "CREATE",
        "DELETE",
        "DROP",
        "SET",
        "REMOVE",
        "MERGE",
        "DETACH",
        "REMOVE",
        "FOREACH",
        "CALL",
        "WITH",
        "UNWIND",
    ];

    // MERGE는 일부 허용하되, CREATE 절이 있는 경우 차단
    if (upperQuery.includes("MERGE") && (upperQuery.includes("CREATE") || upperQuery.includes("SET"))) {
        return { valid: false, error: "MERGE with CREATE/SET is not allowed" };
    }

    // 위험한 키워드 검사
    for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
            return { valid: false, error: `Dangerous keyword "${keyword}" is not allowed. Only READ-ONLY queries (MATCH/RETURN) are permitted.` };
        }
    }

    // MATCH와 RETURN이 포함되어야 함 (READ-ONLY 쿼리)
    if (!upperQuery.includes("MATCH") && !upperQuery.includes("RETURN")) {
        return { valid: false, error: "Query must contain MATCH and RETURN (READ-ONLY only)" };
    }

    return { valid: true };
}

/**
 * 템플릿 기반 Cypher 생성
 */
function generateCypherFromTemplate(intent: string, params: { teamId?: string; days?: number; limit?: number }): string | null {
    const templates: { [key: string]: (p: any) => string } = {
        // 최근 경보 상위 원인
        "top_alerts": (p) => `
            MATCH (p:PolicyRule)-[:FIRED_ON]->(e:Event)
            WHERE datetime(e.ts) > datetime() - duration({days: ${p.days || 7}})
            ${p.teamId ? `MATCH (e)-[:AFFECTS]->(t:Team {id: "${p.teamId}"})` : ""}
            RETURN p.id AS rule, count(*) AS hits, collect(DISTINCT e.type) AS eventTypes
            ORDER BY hits DESC LIMIT ${p.limit || 10}
        `,

        // 팀별 경보→조치 트레이스
        "team_trace": (p) => `
            MATCH (t:Team {id: "${p.teamId || ""}"})<-[:AFFECTS]-(e:Event)
            WHERE datetime(e.ts) > datetime() - duration({days: ${p.days || 7}})
            OPTIONAL MATCH (e)-[:TRIGGERED]->(a:Action)
            OPTIONAL MATCH (a)-[:APPLIED_TO]->(t)
            RETURN e.id AS eventId, e.type AS eventType, e.ts AS eventTime,
                   a.id AS actionId, a.type AS actionType, a.ts AS actionTime
            ORDER BY e.ts DESC LIMIT ${p.limit || 20}
        `,

        // 모델 버전 교체 영향
        "model_impact": (p) => `
            MATCH (v:ModelVersion)-[:DEPLOYED_FOR]->(t:Team)
            ${p.teamId ? `WHERE t.id = "${p.teamId}"` : ""}
            OPTIONAL MATCH (t)<-[:AFFECTS]-(e:Event)
            WHERE datetime(e.ts) > datetime() - duration({days: ${p.days || 7}})
            WITH t, v, e
            RETURN t.id AS team, v.ver AS version, count(e) AS anomalies, collect(DISTINCT e.type) AS eventTypes
            ORDER BY anomalies DESC LIMIT ${p.limit || 10}
        `,

        // 팀별 이벤트 통계
        "team_stats": (p) => `
            MATCH (t:Team)
            ${p.teamId ? `WHERE t.id = "${p.teamId}"` : ""}
            OPTIONAL MATCH (e:Event)-[:AFFECTS]->(t)
            WHERE datetime(e.ts) > datetime() - duration({days: ${p.days || 7}})
            WITH t, e
            RETURN t.id AS team, count(e) AS eventCount, 
                   collect(DISTINCT e.type) AS eventTypes,
                   collect(DISTINCT e.id) AS eventIds
            ORDER BY eventCount DESC LIMIT ${p.limit || 20}
        `,

        // 경보 간 상관관계
        "correlations": (p) => `
            MATCH (e1:Event)-[c:CORRELATED_WITH]->(e2:Event)
            WHERE datetime(e1.ts) > datetime() - duration({days: ${p.days || 7}})
            ${p.teamId ? `
                MATCH (e1)-[:AFFECTS]->(t:Team {id: "${p.teamId}"})
                MATCH (e2)-[:AFFECTS]->(t)
            ` : ""}
            RETURN e1.id AS event1, e2.id AS event2, c.score AS correlation
            ORDER BY c.score DESC LIMIT ${p.limit || 20}
        `,
    };

    return templates[intent] ? templates[intent](params) : null;
}

/**
 * NL 입력을 Intent로 변환
 */
function extractIntent(text: string): { intent: string; params: any } {
    const lower = text.toLowerCase();

    // 팀 ID 추출
    const teamMatch = lower.match(/(?:팀|team)\s*[:\s]*([a-z0-9_]+)|([a-z0-9_]+)\s*(?:팀|team)/i);
    const teamId = teamMatch ? (teamMatch[1] || teamMatch[2]) : undefined;

    // 기간 추출
    const daysMatch = lower.match(/(\d+)\s*(?:일|day|days|주|week|weeks)/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 7;

    // Intent 매칭
    if (lower.includes("경보") || lower.includes("알람") || lower.includes("alert") || lower.includes("상위") || lower.includes("원인")) {
        return { intent: "top_alerts", params: { teamId, days, limit: 10 } };
    }
    if (lower.includes("트레이스") || lower.includes("흐름") || lower.includes("trace") || lower.includes("경보") && lower.includes("조치")) {
        return { intent: "team_trace", params: { teamId, days, limit: 20 } };
    }
    if (lower.includes("모델") || lower.includes("버전") || lower.includes("model") || lower.includes("version") || lower.includes("배포")) {
        return { intent: "model_impact", params: { teamId, days, limit: 10 } };
    }
    if (lower.includes("통계") || lower.includes("stats") || lower.includes("이벤트")) {
        return { intent: "team_stats", params: { teamId, days, limit: 20 } };
    }
    if (lower.includes("상관") || lower.includes("correlation") || lower.includes("연관")) {
        return { intent: "correlations", params: { teamId, days, limit: 20 } };
    }

    // 기본값: 팀 통계
    return { intent: "team_stats", params: { teamId, days, limit: 20 } };
}

/**
 * Step 58: Graph-Aware Copilot
 * POST /graphCopilot
 * Body: { text: string, teamId?: string, uid?: string }
 */
export const graphCopilot = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { text, teamId: providedTeamId, uid } = req.body;

            if (!text) {
                res.status(400).json({ error: "text is required" });
                return;
            }

            logger.info("🧠 Graph Copilot 요청:", { text, providedTeamId, uid });

            // 1) Intent 추출 및 템플릿 기반 Cypher 생성
            const { intent, params } = extractIntent(text);
            const templateQuery = generateCypherFromTemplate(intent, {
                ...params,
                teamId: providedTeamId || params.teamId,
            });

            let cypherQuery: string;
            let querySource: "template" | "llm" = "template";

            if (templateQuery) {
                cypherQuery = templateQuery.trim();
                logger.info("✅ 템플릿 기반 Cypher 생성:", { intent, cypherQuery: cypherQuery.substring(0, 100) });
            } else if (openai) {
                // 2) 템플릿 미매칭 시 LLM 백오프 (READ-ONLY 규칙 적용)
                logger.info("🤖 LLM으로 Cypher 생성 시도...");
                const prompt = `You are a Cypher query generator for Neo4j. Generate a READ-ONLY query (MATCH/RETURN only) based on the user's question.

Rules:
- Only use MATCH and RETURN clauses
- Do NOT use CREATE, DELETE, MERGE, SET, DROP, REMOVE, or any write operations
- If teamId is provided, filter by Team {id: teamId}
- Limit results to reasonable size (LIMIT 20-50)
- Return readable results with meaningful column names

User question: "${text}"
${providedTeamId ? `Team filter: ${providedTeamId}` : ""}

Generate ONLY the Cypher query, no explanations:`;

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                    max_tokens: 500,
                });

                cypherQuery = completion.choices[0].message?.content?.trim() || "";
                querySource = "llm";
                logger.info("✅ LLM 기반 Cypher 생성:", { cypherQuery: cypherQuery.substring(0, 100) });
            } else {
                res.status(400).json({
                    error: "No template matched and OpenAI API key is not configured",
                    suggestion: "Please use a supported query format or configure OPENAI_API_KEY",
                });
                return;
            }

            // 3) 안전 검증
            const validation = validateCypherQuery(cypherQuery);
            if (!validation.valid) {
                logger.warn("⚠️ 안전 검증 실패:", validation.error);
                res.status(400).json({
                    error: "Query validation failed",
                    reason: validation.error,
                    query: cypherQuery,
                });
                return;
            }

            // 4) 팀 ACL 검증 (있는 경우)
            if (providedTeamId && uid) {
                // TODO: 팀 접근 권한 검증 로직 추가
                // const hasAccess = await checkTeamAccess(uid, providedTeamId);
                // if (!hasAccess) {
                //     res.status(403).json({ error: "Team access denied" });
                //     return;
                // }
            }

            // 5) Neo4j 쿼리 실행
            logger.info("🔍 Cypher 쿼리 실행:", { cypherQuery: cypherQuery.substring(0, 200) });
            const result = await run(cypherQuery, {});

            // 6) 결과 포맷팅
            const records = result.records.map((record: any) => {
                const obj: any = {};
                record.keys.forEach((key: string) => {
                    const value = record.get(key);
                    // Neo4j 객체를 일반 객체로 변환
                    if (value && typeof value === "object") {
                        if (value.toNumber) {
                            obj[key] = value.toNumber();
                        } else if (value.toString) {
                            obj[key] = value.toString();
                        } else {
                            obj[key] = JSON.parse(JSON.stringify(value));
                        }
                    } else {
                        obj[key] = value;
                    }
                });
                return obj;
            });

            // 7) 요약 생성 (LLM 또는 템플릿)
            let summary: string;
            if (openai && records.length > 0) {
                const summaryPrompt = `Summarize the following query results in Korean:

Query: "${cypherQuery}"
Results: ${JSON.stringify(records.slice(0, 10), null, 2)}

Provide a concise 2-3 sentence summary in Korean:`;

                const summaryCompletion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: summaryPrompt }],
                    temperature: 0.7,
                    max_tokens: 200,
                });

                summary = summaryCompletion.choices[0].message?.content?.trim() || "결과를 확인하세요.";
            } else {
                summary = `${records.length}개의 결과를 찾았습니다.`;
            }

            logger.info("✅ Graph Copilot 완료:", { records: records.length, querySource });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                success: true,
                query: cypherQuery,
                querySource,
                summary,
                records,
                count: records.length,
                intent,
                params: {
                    ...params,
                    teamId: providedTeamId || params.teamId,
                },
            });
        } catch (error: any) {
            logger.error("❌ Graph Copilot 오류:", error);
            res.status(500).json({
                error: error.message || "Graph Copilot execution failed",
            });
        }
    }
);

