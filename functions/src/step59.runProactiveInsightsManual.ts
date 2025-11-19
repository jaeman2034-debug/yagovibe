import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * 그래프 질의: 상위 원인 규칙 Top-N
 */
async function getTopRules(teamId: string, days: number): Promise<any[]> {
    try {
        const functionsOrigin = process.env.FUNCTIONS_ORIGIN || 
            `https://asia-northeast3-${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}.cloudfunctions.net`;

        const response = await fetch(`${functionsOrigin}/graphCopilot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `최근 ${days}일 경보 상위 원인`,
                teamId,
                days,
            }),
        });

        if (!response.ok) {
            logger.error("graphCopilot 호출 실패:", await response.text());
            return [];
        }

        const data = await response.json();
        return data.records || [];
    } catch (error: any) {
        logger.error("getTopRules 오류:", error);
        return [];
    }
}

/**
 * 그래프 질의: 경보→조치 연결률
 */
async function getActionRate(teamId: string, days: number): Promise<any> {
    try {
        const { run } = await import("./kg/neo4j");

        const query = `
            MATCH (t:Team {id: $teamId})
            OPTIONAL MATCH (e:Event)-[:AFFECTS]->(t)
            WHERE datetime(e.ts) > datetime() - duration({days: $days})
            OPTIONAL MATCH (e)-[:TRIGGERED]->(a:Action)
            WITH count(DISTINCT e) AS total, count(DISTINCT a) AS acted
            RETURN total, acted, 
                   (CASE WHEN total=0 THEN 0.0 ELSE 1.0*acted/total END) AS actionRate
        `;

        const result = await run(query, { teamId, days });
        if (result.records.length > 0) {
            const record = result.records[0];
            return {
                total: record.get("total")?.toNumber() || 0,
                acted: record.get("acted")?.toNumber() || 0,
                actionRate: record.get("actionRate")?.toNumber() || 0,
            };
        }
        return { total: 0, acted: 0, actionRate: 0 };
    } catch (error: any) {
        logger.error("getActionRate 오류:", error);
        return { total: 0, acted: 0, actionRate: 0 };
    }
}

/**
 * 그래프 질의: 품질 추세
 */
async function getQualityTrend(teamId: string, days: number): Promise<any> {
    try {
        const reportsRef = db.collection("reports");
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const snap = await reportsRef
            .where("teamId", "==", teamId)
            .where("createdAt", ">=", since)
            .get();

        const scores: number[] = [];
        snap.forEach((doc) => {
            const data = doc.data();
            if (data.qualityScore) {
                scores.push(data.qualityScore);
            }
        });

        const avgScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;

        return {
            avgScore,
            count: scores.length,
            trend: scores.length >= 2 && scores[scores.length - 1] > scores[0] ? "up" : "down",
        };
    } catch (error: any) {
        logger.error("getQualityTrend 오류:", error);
        return { avgScore: 0, count: 0, trend: "stable" };
    }
}

/**
 * 스토리 생성
 */
function makeStory(params: {
    teamId: string;
    days: number;
    topRules: any[];
    actionRate: any;
    qualityTrend?: any;
}): string {
    const { teamId, days, topRules, actionRate, qualityTrend } = params;

    const bullets = topRules.length > 0
        ? topRules.map((r: any) => `• ${r.rule || r.ruleId || "Unknown"}: ${r.hits || r.count || 0}회`).join("\n")
        : "• 데이터 없음";

    const ar = actionRate?.actionRate ? Math.round(actionRate.actionRate * 100) : 0;
    const totalEvents = actionRate?.total || 0;
    const actedEvents = actionRate?.acted || 0;

    let summary = `📊 ${teamId} — 최근 ${days}일 인사이트\n\n`;
    summary += `🔹 조치 연결률: ${ar}% (${actedEvents}/${totalEvents})\n\n`;
    
    if (qualityTrend && qualityTrend.count > 0) {
        const trendIcon = qualityTrend.trend === "up" ? "📈" : qualityTrend.trend === "down" ? "📉" : "➡️";
        summary += `🔹 품질 점수 평균: ${qualityTrend.avgScore.toFixed(2)} ${trendIcon}\n\n`;
    }

    summary += `🔹 상위 원인 규칙:\n${bullets}`;

    return summary;
}

/**
 * 하이라이트 생성
 */
function makeHighlights(params: {
    topRules: any[];
    actionRate: any;
    qualityTrend?: any;
}): any[] {
    const highlights: any[] = [];

    if (params.topRules.length > 0) {
        highlights.push({
            label: "최다 경보 규칙",
            value: params.topRules[0].rule || params.topRules[0].ruleId || "Unknown",
            count: params.topRules[0].hits || params.topRules[0].count || 0,
            trend: "stable",
            severity: params.topRules[0].hits > 10 ? "high" : "medium",
        });
    }

    const ar = params.actionRate?.actionRate || 0;
    highlights.push({
        label: "조치 연결률",
        value: `${Math.round(ar * 100)}%`,
        trend: ar > 0.8 ? "up" : ar < 0.5 ? "down" : "stable",
        severity: ar < 0.5 ? "high" : "medium",
    });

    if (params.qualityTrend && params.qualityTrend.count > 0) {
        highlights.push({
            label: "품질 점수 평균",
            value: params.qualityTrend.avgScore.toFixed(2),
            trend: params.qualityTrend.trend,
            severity: params.qualityTrend.avgScore < 0.7 ? "high" : "medium",
        });
    }

    return highlights;
}

/**
 * Step 59: Proactive Insights - 수동 실행
 * GET /runProactiveInsightsManual?sub=SUBSCRIPTION_ID
 */
export const runProactiveInsightsManual = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const subId = req.query.sub as string;

            if (!subId) {
                res.status(400).json({ error: "sub parameter is required" });
                return;
            }

            logger.info("📬 Proactive Insights 수동 실행:", { subId });

            const subDoc = await db.collection("insightSubs").doc(subId).get();

            if (!subDoc.exists) {
                res.status(404).json({ error: "Subscription not found" });
                return;
            }

            const sub: any = subDoc.data();
            const teamId = sub.teamId;
            const days = sub.windowDays || 7;

            if (!teamId) {
                res.status(400).json({ error: "teamId is required" });
                return;
            }

            // 1) 그래프 질의
            const topRules = await getTopRules(teamId, days);
            const actionRate = await getActionRate(teamId, days);
            const qualityTrend = await getQualityTrend(teamId, days);

            // 2) 스토리 생성
            const summary = makeStory({ teamId, days, topRules, actionRate, qualityTrend });
            const highlights = makeHighlights({ topRules, actionRate, qualityTrend });

            // 3) 리포트 저장 (Step 60: status: 'draft'로 저장)
            const now = new Date();
            const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            const repRef = await db.collection("insightReports").add({
                teamId,
                subscriptionId: subId,
                status: "draft", // Step 60: 승인 대기 상태
                period: {
                    start: Timestamp.fromDate(periodStart),
                    end: Timestamp.now(),
                },
                summary,
                highlights,
                alerts: topRules.map((r: any) => ({
                    rule: r.rule || r.ruleId || "Unknown",
                    hits: r.hits || r.count || 0,
                })),
                actions: [],
                metrics: {
                    actionRate: actionRate.actionRate,
                    totalEvents: actionRate.total,
                    actedEvents: actionRate.acted,
                    qualityScore: qualityTrend.avgScore,
                },
                subscription: sub, // 채널 정보 저장
                reviewHistory: [],
                comments: [],
                revision: 0,
                createdAt: Timestamp.now(),
            });

            // 4) 배포
            const channels = sub.channels || {};

            if (channels.slack && process.env.SLACK_WEBHOOK_URL) {
                await fetch(process.env.SLACK_WEBHOOK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: `📣 *${sub.title || "주간 인사이트"}*\n\n${summary}\n\n(리포트 ID: ${repRef.id})`,
                    }),
                });
            }

            if (channels.email && process.env.SMTP_USER) {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: sub.emailTo || process.env.MAIL_TO || "admin@yago-vibe.com",
                    subject: `[YAGO] ${sub.title || "주간 인사이트"} - ${teamId}`,
                    text: summary,
                    html: `<pre>${summary}</pre>`,
                });
            }

            // 구독 업데이트
            await subDoc.ref.set({ lastRunAt: Timestamp.now() }, { merge: true });

            logger.info("✅ Proactive Insights 수동 실행 완료:", { repRef: repRef.id });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                success: true,
                reportId: repRef.id,
                summary,
                highlights,
            });
        } catch (error: any) {
            logger.error("❌ Proactive Insights 수동 실행 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

