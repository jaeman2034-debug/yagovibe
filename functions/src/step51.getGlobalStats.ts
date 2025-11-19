import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

interface TeamSummary {
    teamId: string;
    teamName?: string;
    lastScore: number;
    coverage: number;
    lastUpdatedAt: any;
    rootCause: string;
    tuningCount: number;
    lastPredicted: number | null;
    gaps: number;
    overlaps: number;
    alertCount: number;
    anomalyCount: number;
    lastTunedAt: any;
    modelVersion?: string;
}

/**
 * Step 51: Global Quality Command Center - 통합 통계 API
 * 모든 팀의 품질, 튜닝, 예측, 이상 상태를 집계
 * GET /getGlobalStats?teamId=xxx&startDate=xxx&endDate=xxx
 */
export const getGlobalStats = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const teamIdFilter = req.query.teamId as string | undefined;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;
            const modelVersion = req.query.modelVersion as string | undefined;

            logger.info("📊 Global Stats 조회 시작", { teamIdFilter, startDate, endDate, modelVersion });

            // 필터링된 팀 조회
            let teamsQuery = db.collection("teams");
            if (teamIdFilter) {
                teamsQuery = teamsQuery.where("__name__", "==", teamIdFilter) as any;
            }
            const teamsSnap = await teamsQuery.get();

            const summary: TeamSummary[] = [];
            const now = Date.now();

            for (const team of teamsSnap.docs) {
                const d = team.data();
                const teamId = team.id;

                // 기간 필터링 (lastUpdatedAt 기준)
                if (startDate || endDate) {
                    const lastUpdatedAt = d.metrics?.lastUpdatedAt;
                    if (lastUpdatedAt) {
                        const updateTime = lastUpdatedAt.toMillis?.() || lastUpdatedAt._seconds * 1000 || new Date(lastUpdatedAt).getTime();
                        if (startDate && updateTime < new Date(startDate).getTime()) continue;
                        if (endDate && updateTime > new Date(endDate).getTime()) continue;
                    }
                }

                const metrics = d.metrics || {};
                const latestRoot = d.latestRootCause?.summary || "N/A";
                const lastTuning = d.lastTuning?.decisions?.length || 0;

                // 최근 시뮬레이션 결과
                const simSnap = await db
                    .collection(`teams/${teamId}/simulations`)
                    .orderBy("createdAt", "desc")
                    .limit(1)
                    .get();
                const lastSim = simSnap.empty ? null : simSnap.docs[0].data();

                // 최근 알림 수 (이상 탐지 포함)
                const alertsSnap = await db
                    .collection(`teams/${teamId}/alerts`)
                    .orderBy("createdAt", "desc")
                    .limit(100)
                    .get();
                const alerts = alertsSnap.docs.map((doc) => doc.data());
                const anomalyAlerts = alerts.filter((a) => a.type === "anomaly");

                // 최근 품질 리포트 수
                const qualityReportsSnap = await db
                    .collectionGroup("qualityReports")
                    .where("teamId", "==", teamId)
                    .orderBy("createdAt", "desc")
                    .limit(1)
                    .get();

                summary.push({
                    teamId,
                    teamName: d.name || teamId,
                    lastScore: metrics.lastScore ?? 0,
                    coverage: metrics.lastCoverage ?? 0,
                    lastUpdatedAt: metrics.lastUpdatedAt ?? null,
                    rootCause: latestRoot,
                    tuningCount: lastTuning,
                    lastPredicted: lastSim?.predicted?.predicted_score ?? null,
                    gaps: metrics.gaps ?? 0,
                    overlaps: metrics.overlaps ?? 0,
                    alertCount: alerts.length,
                    anomalyCount: anomalyAlerts.length,
                    lastTunedAt: d.lastTunedAt ?? null,
                    modelVersion: d.latestSimulation?.model_used || "unknown",
                });
            }

            // 전역 KPI 계산
            const globalKPI = {
                avgScore: summary.length > 0
                    ? summary.reduce((sum, t) => sum + (t.lastScore || 0), 0) / summary.length
                    : 0,
                avgCoverage: summary.length > 0
                    ? summary.reduce((sum, t) => sum + (t.coverage || 0), 0) / summary.length
                    : 0,
                totalAlerts: summary.reduce((sum, t) => sum + t.alertCount, 0),
                totalAnomalies: summary.reduce((sum, t) => sum + t.anomalyCount, 0),
                totalTeams: summary.length,
                teamsWithTuning: summary.filter((t) => t.tuningCount > 0).length,
                avgPredictedScore: summary.filter((t) => t.lastPredicted !== null).length > 0
                    ? summary
                          .filter((t) => t.lastPredicted !== null)
                          .reduce((sum, t) => sum + (t.lastPredicted || 0), 0) /
                      summary.filter((t) => t.lastPredicted !== null).length
                    : 0,
            };

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                updatedAt: new Date().toISOString(),
                summary,
                globalKPI,
            });
        } catch (error: any) {
            logger.error("❌ Global Stats 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

