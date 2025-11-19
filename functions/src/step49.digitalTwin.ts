import { onDocumentCreated } from "firebase-functions/v2/firestore";
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

interface TuningDecision {
    action: {
        module: string;
        param: string;
        value: string;
    };
    score: number;
    timestamp: Date;
}

interface SimulationResult {
    createdAt: Date;
    params: Record<string, string>;
    payload: {
        snr_db: number;
        speech_blocks_per_min: number;
        coverage: number;
        gaps: number;
        overlaps: number;
        vad_aggressiveness: string;
        noise_suppression: string;
    };
    predicted: {
        predicted_score: number;
        confidence?: number;
        model_used?: string;
    };
    rootRef?: any;
}

/**
 * Step 49: Digital Twin Simulator
 * tuningLogs 문서 생성 시 트리거되어 품질 예측 시뮬레이션 실행
 */
export const digitalTwinSimulator = onDocumentCreated(
    {
        document: "tuningLogs/{logId}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const log = event.data?.data();
            const logId = event.params.logId;

            if (!log || !log.decisions || log.decisions.length === 0) {
                logger.info(`튜닝 로그 ${logId}: decisions가 없어 스킵`);
                return;
            }

            const teamId = log.teamId;
            if (!teamId) {
                logger.warn(`튜닝 로그 ${logId}: teamId가 없어 스킵`);
                return;
            }

            logger.info(`🔮 Digital Twin 시뮬레이션 시작: 팀 ${teamId}`);

            // 팀 문서에서 최근 Root Cause 가져오기
            const teamSnap = await db.doc(`teams/${teamId}`).get();
            if (!teamSnap.exists) {
                logger.warn(`팀 ${teamId} 문서가 없습니다`);
                return;
            }

            const teamData = teamSnap.data();
            const root = teamData?.latestRootCause;

            if (!root) {
                logger.info(`팀 ${teamId}: Root Cause가 없어 스킵`);
                return;
            }

            const audio = root.audio || {};
            const metrics = root.metrics || {};

            // 현재 튜닝 파라미터 중 주요 항목만 추출
            const params: Record<string, string> = {};
            for (const d of log.decisions as TuningDecision[]) {
                if (d.action?.param && d.action?.value) {
                    params[d.action.param] = d.action.value;
                }
            }

            // ML 예측 API에 전달할 페이로드 구성
            const payload = {
                snr_db: audio.snr_db || 15,
                speech_blocks_per_min: audio.speech_blocks_per_min || 100,
                coverage: metrics.coverage || 0.95,
                gaps: metrics.gaps || 3,
                overlaps: metrics.overlaps || 2,
                vad_aggressiveness: params.vad_aggressiveness || "medium",
                noise_suppression: params.noise_suppression || "normal",
            };

            logger.info(`📊 예측 API 호출:`, payload);

            // ML 예측 API 호출
            let result: any = { predicted_score: 0 };
            try {
                const response = await fetch(`${PREDICTOR_URL}/predict`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    timeout: 10000,
                });

                if (response.ok) {
                    result = await response.json();
                    logger.info(`✅ 예측 완료: predicted_score=${result.predicted_score}`);
                } else {
                    logger.error(`❌ 예측 API 호출 실패: ${response.statusText}`);
                }
            } catch (error) {
                logger.error(`❌ 예측 API 호출 오류:`, error);
                // API 호출 실패해도 기본값으로 시뮬레이션 결과 저장
            }

            // 시뮬레이션 결과 저장
            const simulation: SimulationResult = {
                createdAt: new Date(),
                params,
                payload,
                predicted: result,
                rootRef: {
                    reportId: root.reportId,
                    summary: root.summary,
                    causes: root.causes,
                },
            };

            await db.collection(`teams/${teamId}/simulations`).add(simulation);

            // 팀 문서에 최근 시뮬레이션 요약 저장
            await db.doc(`teams/${teamId}`).set(
                {
                    latestSimulation: {
                        predictedScore: result.predicted_score,
                        confidence: result.confidence || 0.7,
                        createdAt: new Date(),
                    },
                },
                { merge: true }
            );

            logger.info(`✅ Digital Twin 시뮬레이션 완료: 팀 ${teamId}, 예상 점수=${result.predicted_score?.toFixed(2)}`);

        } catch (error: any) {
            logger.error("❌ Digital Twin 시뮬레이션 오류:", error);
            // 에러를 throw하지 않음 (트리거가 실패해도 다른 프로세스에 영향 없도록)
        }
    }
);

