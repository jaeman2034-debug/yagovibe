import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { redactPII } from "./trace/pii";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 68: Telemetry Ingest - 텔레메트리 이벤트 수집
 * POST /telemetryIngest
 * Body: { type, teamId, userId, sessionId, perf, meta, ctx, ... }
 */
export const telemetryIngest = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const e = req.body || {};

            if (!e.type) {
                res.status(400).json({ error: "type is required" });
                return;
            }

            logger.info("📊 텔레메트리 이벤트 수집:", { type: e.type, teamId: e.teamId });

            // PII 제거·마스킹 (Step 62)
            if (e.meta && typeof e.meta === "object") {
                if (e.meta.email) {
                    e.meta.email = "[email]";
                }
                // 재귀적으로 PII 마스킹
                const redacted = redactPII(JSON.stringify(e.meta));
                e.meta = JSON.parse(redacted);
            }

            // 이벤트 저장
            e.receivedAt = Timestamp.now();
            const day = new Date().toISOString().slice(0, 10);
            await db.collection(`events/${day}`).add(e);

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ ok: true });
        } catch (error: any) {
            logger.error("❌ 텔레메트리 수집 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 68: Telemetry Daily Rollup - 일일 텔레메트리 집계
 * 매일 00:05에 실행
 */
export const telemetryDailyRollup = onSchedule(
    {
        schedule: "every day 00:05",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("📊 텔레메트리 일일 집계 시작");

            const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const qs = await db.collection(`events/${day}`).get();

            if (qs.empty) {
                logger.info("⚠️ 이벤트 데이터가 없습니다.");
                return;
            }

            const rows = qs.docs.map((d) => d.data() as any);
            const byTeam: Record<string, any> = {};

            for (const r of rows) {
                const k = r.teamId || "unknown";
                if (!byTeam[k]) {
                    byTeam[k] = {
                        count: 0,
                        err: 0,
                        lat: [] as number[],
                        approve: 0,
                        review: 0,
                        alerts: 0,
                        validAlerts: 0,
                        offlineOk: 0,
                        offlineTotal: 0,
                    };
                }

                const b = byTeam[k];
                b.count++;

                if (r.type === "graphask") {
                    b.lat.push(r?.perf?.durMs || 0);
                }

                if (r.type === "insight_approve") {
                    b.approve++;
                    b.review++;
                }

                if (r.type === "insight_reject") {
                    b.review++;
                }

                if (r.type === "policy_alert") {
                    b.alerts++;
                    if (r.meta?.valid) {
                        b.validAlerts++;
                    }
                }

                if (r.type === "offline_submit") {
                    b.offlineTotal++;
                    if (r.meta?.successWithin24h) {
                        b.offlineOk++;
                    }
                }

                if (r.meta?.status >= 400) {
                    b.err++;
                }
            }

            // P95 계산 헬퍼
            const p95 = (arr: number[]): number => {
                if (arr.length === 0) return 0;
                const sorted = arr.sort((x, y) => x - y);
                const i = Math.floor(sorted.length * 0.95);
                return sorted[i] || 0;
            };

            // 팀별 집계 데이터 저장
            for (const [team, b] of Object.entries(byTeam)) {
                await db.collection("telemetryDaily").add({
                    teamId: team,
                    day,
                    count: b.count,
                    errorRate: b.count ? b.err / b.count : 0,
                    p95: p95(b.lat),
                    approvalRate: b.review ? b.approve / b.review : 0,
                    alertPrecision: b.alerts ? b.validAlerts / b.alerts : 0,
                    offlineSuccess: b.offlineTotal ? b.offlineOk / b.offlineTotal : 0,
                    createdAt: Timestamp.now(),
                });

                logger.info("✅ 팀별 집계 완료:", { team, day, count: b.count });
            }

            logger.info("✅ 텔레메트리 일일 집계 완료:", { day, teams: Object.keys(byTeam).length });
        } catch (error: any) {
            logger.error("❌ 텔레메트리 일일 집계 오류:", error);
        }
    }
);

/**
 * Step 68: Get Telemetry Daily - 일일 텔레메트리 조회
 * GET /getTelemetryDaily?limit=14
 */
export const getTelemetryDaily = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const limit = Number(req.query.limit || "14");
            const teamId = req.query.teamId as string | undefined;

            logger.info("📊 텔레메트리 일일 조회:", { limit, teamId });

            let query: any = db.collection("telemetryDaily");

            if (teamId) {
                query = query.where("teamId", "==", teamId);
            }

            const qs = await query.orderBy("createdAt", "desc").limit(limit).get();

            const items = qs.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                };
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 텔레메트리 일일 조회 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

