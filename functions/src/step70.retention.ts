import { onSchedule } from "firebase-functions/v2/scheduler";
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
 * Step 70: Retention & Onboarding Experiments
 * Post-Launch SRE & Growth Experiments
 */

/**
 * 리텐션 계산
 * 매일 02:00 실행
 */
export const calculateRetention = onSchedule(
    {
        schedule: "every day 02:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("📊 리텐션 계산 시작...");

            const today = new Date();
            const todayStr = today.toISOString().slice(0, 10);

            // D+7 리텐션 계산
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

            // 7일 전 세션 조회
            const sessions7Snap = await db
                .collection("sessions")
                .where("day", "==", sevenDaysAgoStr)
                .get();

            if (sessions7Snap.empty) {
                logger.info("⚠️ 7일 전 세션 데이터가 없습니다.");
                return;
            }

            // 재방문 확인
            const userIds = sessions7Snap.docs.map((doc) => doc.id);
            let returningCount = 0;

            for (const userId of userIds) {
                // 최근 7일 내 재방문 확인
                const recentSessions = await db
                    .collection("sessions")
                    .doc(userId)
                    .collection("visits")
                    .where("day", ">=", sevenDaysAgoStr)
                    .where("day", "<=", todayStr)
                    .get();

                if (!recentSessions.empty) {
                    returningCount++;
                }
            }

            const retention7 = sessions7Snap.size > 0 ? returningCount / sessions7Snap.size : 0;

            // 리텐션 데이터 저장
            await db.collection("retention").add({
                day: sevenDaysAgoStr,
                retention7,
                cohortSize: sessions7Snap.size,
                returningUsers: returningCount,
                calculatedAt: Timestamp.now(),
            });

            logger.info(`✅ D+7 리텐션 계산 완료: ${(retention7 * 100).toFixed(2)}%`, {
                cohortSize: sessions7Snap.size,
                returningUsers: returningCount,
            });

            // D+30 리텐션 계산 (30일 전 세션)
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

            const sessions30Snap = await db
                .collection("sessions")
                .where("day", "==", thirtyDaysAgoStr)
                .get();

            if (!sessions30Snap.empty) {
                const userIds30 = sessions30Snap.docs.map((doc) => doc.id);
                let returningCount30 = 0;

                for (const userId of userIds30) {
                    const recentSessions = await db
                        .collection("sessions")
                        .doc(userId)
                        .collection("visits")
                        .where("day", ">=", thirtyDaysAgoStr)
                        .where("day", "<=", todayStr)
                        .get();

                    if (!recentSessions.empty) {
                        returningCount30++;
                    }
                }

                const retention30 =
                    sessions30Snap.size > 0 ? returningCount30 / sessions30Snap.size : 0;

                await db.collection("retention").add({
                    day: thirtyDaysAgoStr,
                    retention30,
                    cohortSize: sessions30Snap.size,
                    returningUsers: returningCount30,
                    calculatedAt: Timestamp.now(),
                });

                logger.info(`✅ D+30 리텐션 계산 완료: ${(retention30 * 100).toFixed(2)}%`);
            }
        } catch (error: any) {
            logger.error("❌ 리텐션 계산 오류:", error);
        }
    }
);

/**
 * Get Retention Metrics
 * GET /getRetention?days=7
 */
export const getRetention = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const days = parseInt((req.query.days as string) || "7");

            const qs = await db
                .collection("retention")
                .orderBy("calculatedAt", "desc")
                .limit(30)
                .get();

            const items = qs.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    day: data.day,
                    retention7: data.retention7 || 0,
                    retention30: data.retention30 || 0,
                    cohortSize: data.cohortSize || 0,
                    returningUsers: data.returningUsers || 0,
                    calculatedAt: data.calculatedAt?.toDate
                        ? data.calculatedAt.toDate()
                        : data.calculatedAt,
                };
            });

            setSecurityHeaders(res);
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 리텐션 조회 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

