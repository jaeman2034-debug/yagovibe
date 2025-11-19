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
 * Step 70: A/B Testing Framework
 * Post-Launch SRE & Growth Experiments
 */

/**
 * A/B 라우터
 * GET /abRouter?exp=EXPERIMENT_ID&userId=USER_ID
 */
export const abRouter = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { exp, userId } = req.query as any;

            if (!exp || !userId) {
                res.status(400).json({ error: "exp and userId are required" });
                return;
            }

            // 기존 할당 확인
            const assignRef = db.doc(`experiments/${exp}/assign/${userId}`);
            const assignSnap = await assignRef.get();

            if (assignSnap.exists) {
                const data = assignSnap.data();
                setSecurityHeaders(res);
                res.json({
                    group: data?.group,
                    assignedAt: data?.ts?.toDate ? data.ts.toDate() : data?.ts,
                });
                return;
            }

            // 랜덤 할당 (50/50)
            const group = Math.random() < 0.5 ? "A" : "B";

            await assignRef.set({
                group,
                ts: Timestamp.now(),
            });

            logger.info(`✅ A/B 테스트 할당: ${exp} - ${userId} → ${group}`);

            setSecurityHeaders(res);
            res.json({ group, assignedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error("❌ A/B 라우터 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * A/B 분석
 * 매일 01:30 실행
 */
export const abAnalysis = onSchedule(
    {
        schedule: "every day 01:30",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("📊 A/B 분석 시작...");

            const experimentsSnap = await db.collection("experiments").get();

            if (experimentsSnap.empty) {
                logger.info("⚠️ 실험 데이터가 없습니다.");
                return;
            }

            for (const expDoc of experimentsSnap.docs) {
                const expId = expDoc.id;
                const exp = expDoc.data() as any;

                // 실험 상태 확인
                if (exp.status === "archived" || exp.status === "completed") {
                    continue;
                }

                // 텔레메트리 데이터에서 실험 그룹별 데이터 조회
                const telemetrySnap = await db
                    .collection("telemetryDaily")
                    .where("meta.exp", "==", expId)
                    .get();

                if (telemetrySnap.empty) {
                    logger.warn(`⚠️ 실험 ${expId}에 대한 텔레메트리 데이터가 없습니다.`);
                    continue;
                }

                // 그룹별 분리
                const groupA: any[] = [];
                const groupB: any[] = [];

                telemetrySnap.docs.forEach((doc) => {
                    const data = doc.data();
                    if (data.meta?.group === "A") {
                        groupA.push(data);
                    } else if (data.meta?.group === "B") {
                        groupB.push(data);
                    }
                });

                // 평균 계산 헬퍼
                const avg = (arr: any[], key: string): number => {
                    if (arr.length === 0) return 0;
                    const sum = arr.reduce((s, x) => s + (x[key] || 0), 0);
                    return sum / arr.length;
                };

                // 결과 계산
                const results = {
                    A: {
                        p95: avg(groupA, "p95"),
                        errorRate: avg(groupA, "errorRate"),
                        approvalRate: avg(groupA, "approvalRate"),
                        offlineSuccess: avg(groupA, "offlineSuccess"),
                        count: groupA.length,
                    },
                    B: {
                        p95: avg(groupB, "p95"),
                        errorRate: avg(groupB, "errorRate"),
                        approvalRate: avg(groupB, "approvalRate"),
                        offlineSuccess: avg(groupB, "offlineSuccess"),
                        count: groupB.length,
                    },
                };

                // 통계적 유의성 검사 (간단한 t-test 근사)
                const calculatePValue = (a: number[], b: number[], metric: string): number => {
                    // TODO: 실제 t-test 구현
                    // 여기서는 간단히 차이의 절대값으로 판단
                    const avgA = a.length > 0 ? a.reduce((s, x) => s + (x[metric] || 0), 0) / a.length : 0;
                    const avgB = b.length > 0 ? b.reduce((s, x) => s + (x[metric] || 0), 0) / b.length : 0;
                    const diff = Math.abs(avgA - avgB);
                    const threshold = avgA * 0.05; // 5% 차이 기준

                    // 간단한 근사: 차이가 5% 이상이면 유의미
                    return diff > threshold ? 0.01 : 0.5;
                };

                // 결과 저장
                await db.collection("experiments").doc(expId).set(
                    {
                        results,
                        updatedAt: Timestamp.now(),
                    },
                    { merge: true }
                );

                logger.info(`✅ A/B 분석 완료: ${expId}`, { results });
            }

            logger.info("✅ A/B 분석 완료");
        } catch (error: any) {
            logger.error("❌ A/B 분석 오류:", error);
        }
    }
);

/**
 * List Experiments
 * GET /listExperiments?status=active
 */
export const listExperiments = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { status } = req.query as any;

            let query: any = db.collection("experiments");

            if (status) {
                query = query.where("status", "==", status);
            }

            const qs = await query.orderBy("updatedAt", "desc").limit(50).get();

            const items = qs.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                };
            });

            setSecurityHeaders(res);
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 실험 목록 조회 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

