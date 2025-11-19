import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

const PREDICTOR_URL = process.env.PREDICTOR_URL || 
    "https://quality-predictor-asia-northeast3-xxxxx.run.app";
const MODEL_BUCKET = process.env.MODEL_BUCKET || "yago-models";

/**
 * Step 51: AI Control Actions - 액션 트리거 API
 * POST /triggerActions
 * Body: { action: "retuning" | "reloadModel" | "runSimulation" | "clearAlerts", teamId?: string }
 */
export const triggerActions = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { action, teamId } = req.body || {};

            if (!action) {
                res.status(400).json({ error: "action is required" });
                return;
            }

            logger.info(`🎮 AI Control Action: ${action}`, { teamId });

            switch (action) {
                case "retuning": {
                    // 팀별 재튜닝 트리거
                    if (!teamId) {
                        res.status(400).json({ error: "teamId is required for retuning" });
                        return;
                    }

                    // tuningLogs 문서 생성하여 Step 48 트리거
                    const teamDoc = await db.doc(`teams/${teamId}`).get();
                    if (!teamDoc.exists) {
                        res.status(404).json({ error: "Team not found" });
                        return;
                    }

                    const teamData = teamDoc.data();
                    const latestRootCause = teamData?.latestRootCause;

                    if (!latestRootCause || !latestRootCause.causes || latestRootCause.causes.length === 0) {
                        res.status(400).json({ error: "No root cause found for retuning" });
                        return;
                    }

                    // 튜닝 로그 생성 (Step 48의 tuningLoop는 스케줄러이므로, 수동 트리거를 위해 로그 생성)
                    await db.collection("tuningLogs").add({
                        teamId,
                        createdAt: new Date(),
                        decisions: latestRootCause.causes.map((c: any) => ({
                            action: {
                                module: "ASR",
                                param: "auto",
                                value: "retune",
                            },
                            score: c.score || 0.5,
                            timestamp: new Date(),
                        })),
                        triggeredBy: "manual",
                        triggeredAt: new Date(),
                    });

                    logger.info(`✅ 재튜닝 트리거: 팀 ${teamId}`);
                    res.json({ ok: true, message: `재튜닝 트리거 완료: ${teamId}` });
                    break;
                }

                case "reloadModel": {
                    // 모델 재로드
                    const modelUrl = req.body.modelUrl as string | undefined;

                    if (modelUrl) {
                        // 특정 모델 URL로 재로드
                        const reloadRes = await fetch(`${PREDICTOR_URL}/reload-model`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ model_url: modelUrl }),
                            timeout: 60000,
                        });

                        if (!reloadRes.ok) {
                            throw new Error(`모델 재로드 실패: ${reloadRes.statusText}`);
                        }

                        logger.info(`✅ 모델 재로드 완료: ${modelUrl}`);
                        res.json({ ok: true, message: `모델 재로드 완료: ${modelUrl}` });
                    } else {
                        // GCS에서 최신 모델 찾아서 재로드
                        const listUrl = `https://storage.googleapis.com/storage/v1/b/${MODEL_BUCKET}/o?prefix=quality-predictor/model_`;
                        const listRes = await fetch(listUrl);
                        const listJson = await listRes.json();
                        const items = listJson.items || [];

                        if (items.length === 0) {
                            res.status(404).json({ error: "No model found" });
                            return;
                        }

                        const latest = items.sort((a: any, b: any) =>
                            new Date(b.updated).getTime() - new Date(a.updated).getTime()
                        )[0];
                        const modelUrl = `gs://${MODEL_BUCKET}/${latest.name}`;

                        const reloadRes = await fetch(`${PREDICTOR_URL}/reload-model`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ model_url: modelUrl }),
                            timeout: 60000,
                        });

                        if (!reloadRes.ok) {
                            throw new Error(`모델 재로드 실패: ${reloadRes.statusText}`);
                        }

                        logger.info(`✅ 최신 모델 재로드 완료: ${latest.name}`);
                        res.json({ ok: true, message: `최신 모델 재로드 완료: ${latest.name}` });
                    }
                    break;
                }

                case "runSimulation": {
                    // 예측 시뮬레이션 실행
                    if (!teamId) {
                        res.status(400).json({ error: "teamId is required for simulation" });
                        return;
                    }

                    // 최근 튜닝 로그 가져오기
                    const tuningLogsSnap = await db
                        .collection("tuningLogs")
                        .where("teamId", "==", teamId)
                        .orderBy("createdAt", "desc")
                        .limit(1)
                        .get();

                    if (tuningLogsSnap.empty) {
                        res.status(404).json({ error: "No tuning log found" });
                        return;
                    }

                    // Step 49의 digitalTwinSimulator가 자동으로 실행되므로,
                    // 여기서는 수동으로 트리거할 수 있도록 로그 재생성
                    const logData = tuningLogsSnap.docs[0].data();
                    await db.collection("tuningLogs").add({
                        ...logData,
                        createdAt: new Date(),
                        triggeredBy: "manual",
                        triggeredAt: new Date(),
                    });

                    logger.info(`✅ 시뮬레이션 트리거: 팀 ${teamId}`);
                    res.json({ ok: true, message: `시뮬레이션 트리거 완료: ${teamId}` });
                    break;
                }

                case "clearAlerts": {
                    // 알림 초기화
                    if (!teamId) {
                        res.status(400).json({ error: "teamId is required for clearAlerts" });
                        return;
                    }

                    // 알림 문서 삭제 (선택적, 실제로는 상태만 변경하는 것이 안전)
                    const alertsSnap = await db
                        .collection(`teams/${teamId}/alerts`)
                        .where("status", "!=", "resolved")
                        .get();

                    const batch = db.batch();
                    alertsSnap.docs.forEach((doc) => {
                        batch.update(doc.ref, { status: "resolved", resolvedAt: new Date() });
                    });
                    await batch.commit();

                    logger.info(`✅ 알림 해결: 팀 ${teamId}, ${alertsSnap.docs.length}개`);
                    res.json({ ok: true, message: `알림 해결 완료: ${teamId}`, count: alertsSnap.docs.length });
                    break;
                }

                default:
                    res.status(400).json({ error: `Unknown action: ${action}` });
            }
        } catch (error: any) {
            logger.error("❌ AI Control Action 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

