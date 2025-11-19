import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

// 각 모듈의 API 엔드포인트 (환경 변수로 설정 가능)
const ASR_API_URL = process.env.ASR_API_URL || "https://asr-service.example.com/config/asr";
const TTS_API_URL = process.env.TTS_API_URL || "https://tts-service.example.com/config/tts";
const NLU_API_URL = process.env.NLU_API_URL || "https://nlu-service.example.com/config/nlu";

interface TuningAction {
    module: "ASR" | "TTS" | "NLU";
    param: string;
    value: string;
    reason?: string;
}

interface TuningDecision {
    action: TuningAction;
    score: number;
    timestamp: Date;
}

interface TuningLog {
    teamId: string;
    createdAt: Date;
    decisions: TuningDecision[];
    policyId?: string;
    reinforcementScore?: number;
}

/**
 * Step 48: Closed-Loop Tuning (자동 보정 루프)
 * 6시간마다 실행하여 Root Cause 결과를 바탕으로 ASR/TTS/NLU 파라미터를 자동 최적화
 */
export const tuningLoop = onSchedule(
    {
        schedule: "every 6 hours",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("🔧 Closed-Loop Tuning 시작...");

            // 모든 팀 조회
            const teams = await db.collection("teams").get();

            if (teams.empty) {
                logger.info("팀이 없습니다.");
                return;
            }

            // 기본 정책 가져오기 (또는 팀별 정책)
            const policyDoc = await db.collection("policies").doc("default").get();
            const policy = policyDoc.exists ? policyDoc.data() : getDefaultPolicy();

            for (const t of teams.docs) {
                const teamId = t.id;
                const teamData = t.data();
                const latestRootCause = teamData.latestRootCause;

                if (!latestRootCause || !latestRootCause.causes || latestRootCause.causes.length === 0) {
                    logger.info(`팀 ${teamId}: Root Cause 없음, 스킵`);
                    continue;
                }

                logger.info(`팀 ${teamId}: Root Cause 분석 중...`, {
                    causes: latestRootCause.causes.length,
                });

                const causes = latestRootCause.causes || [];
                const decisions: TuningDecision[] = [];
                const policyId = teamData.policyId || policy.policyId || "default";

                // 각 Root Cause에 대해 보정 액션 결정
                for (const c of causes) {
                    const label = c.label;
                    const score = c.score || 0;

                    // 정책 기반 액션 결정
                    const action = determineAction(label, policy, score);

                    if (action) {
                        decisions.push({
                            action,
                            score,
                            timestamp: new Date(),
                        });
                    }
                }

                if (decisions.length === 0) {
                    logger.info(`팀 ${teamId}: 보정 액션 없음, 스킵`);
                    continue;
                }

                // 보정 액션 실행
                const appliedActions: TuningAction[] = [];
                for (const decision of decisions) {
                    try {
                        await applyTuningAction(teamId, decision.action);
                        appliedActions.push(decision.action);
                        logger.info(`✅ 보정 적용: ${decision.action.module}.${decision.action.param} = ${decision.action.value}`);
                    } catch (error) {
                        logger.error(`❌ 보정 적용 실패: ${decision.action.module}.${decision.action.param}`, error);
                    }
                }

                // 튜닝 로그 저장
                const tuningLog: TuningLog = {
                    teamId,
                    createdAt: new Date(),
                    decisions,
                    policyId,
                };

                await db.collection("tuningLogs").add(tuningLog);

                // 팀 문서 업데이트
                await db.doc(`teams/${teamId}`).set(
                    {
                        lastTuning: {
                            decisions: appliedActions,
                            appliedAt: new Date(),
                        },
                        lastTunedAt: new Date(),
                    },
                    { merge: true }
                );

                logger.info(`✅ 팀 ${teamId}: ${appliedActions.length}개 보정 적용 완료`);
            }

            logger.info("✅ Closed-Loop Tuning 완료");
        } catch (error: any) {
            logger.error("❌ Closed-Loop Tuning 오류:", error);
            throw error;
        }
    }
);

/**
 * Root Cause 라벨에 따라 보정 액션 결정
 */
function determineAction(
    label: string,
    policy: any,
    score: number
): TuningAction | null {
    // 정책의 actions 객체에서 매칭
    const actions = policy.actions || {};

    // 노이즈/SNR 문제
    if (/노이즈|SNR|snr/i.test(label)) {
        return actions.snr_low || {
            module: "ASR",
            param: "noise_suppression",
            value: "strong",
            reason: "SNR 저하 감지",
        };
    }

    // 발화 속도 과다
    if (/발화 속도 과다|과속|blocks.*>.*180/i.test(label)) {
        return actions.speed_high || {
            module: "ASR",
            param: "vad_aggressiveness",
            value: "high",
            reason: "발화 속도 과다",
        };
    }

    // 발화 속도 저하
    if (/발화 속도 저하|저하|blocks.*<.*60/i.test(label)) {
        return actions.speed_low || {
            module: "ASR",
            param: "vad_aggressiveness",
            value: "low",
            reason: "발화 속도 저하",
        };
    }

    // 키워드 편중
    if (/키워드 편중|인식 불균형/i.test(label)) {
        return actions.keyword_bias || {
            module: "NLU",
            param: "entity_weight_balance",
            value: "rebalance",
            reason: "키워드 편중 감지",
        };
    }

    // 무성 구간 과다
    if (/무성 구간|gaps.*>.*10/i.test(label)) {
        return actions.silence_high || {
            module: "TTS",
            param: "silence_trim",
            value: "enable",
            reason: "무성 구간 과다",
        };
    }

    // 타임스탬프 중첩
    if (/타임스탬프.*중첩|overlaps.*>.*8/i.test(label)) {
        return actions.overlap_high || {
            module: "TTS",
            param: "timestamp_alignment",
            value: "strict",
            reason: "타임스탬프 중첩 감지",
        };
    }

    return null;
}

/**
 * 보정 액션을 실제 서비스에 적용
 */
async function applyTuningAction(teamId: string, action: TuningAction): Promise<void> {
    let apiUrl: string;
    const payload = {
        teamId,
        param: action.param,
        value: action.value,
    };

    switch (action.module) {
        case "ASR":
            apiUrl = ASR_API_URL;
            break;
        case "TTS":
            apiUrl = TTS_API_URL;
            break;
        case "NLU":
            apiUrl = NLU_API_URL;
            break;
        default:
            throw new Error(`알 수 없는 모듈: ${action.module}`);
    }

    // 실제 API 호출 (옵션: 환경 변수로 비활성화 가능)
    if (process.env.ENABLE_TUNING_API === "true") {
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                timeout: 10000,
            });

            if (!response.ok) {
                throw new Error(`API 호출 실패: ${response.statusText}`);
            }
        } catch (error) {
            logger.warn(`⚠️ ${action.module} API 호출 실패 (계속 진행):`, error);
            // API 호출 실패해도 로그는 저장 (나중에 수동 적용 가능)
        }
    } else {
        logger.info(`📝 ${action.module} 보정 액션 기록 (API 호출 비활성화):`, payload);
    }
}

/**
 * 기본 정책 반환
 */
function getDefaultPolicy(): any {
    return {
        policyId: "default",
        thresholds: {
            snr: 12,
            speed_high: 180,
            speed_low: 60,
            gaps: 10,
            overlaps: 8,
        },
        actions: {
            snr_low: {
                module: "ASR",
                param: "noise_suppression",
                value: "strong",
            },
            speed_high: {
                module: "ASR",
                param: "vad_aggressiveness",
                value: "high",
            },
            speed_low: {
                module: "ASR",
                param: "vad_aggressiveness",
                value: "low",
            },
            keyword_bias: {
                module: "NLU",
                param: "entity_weight_balance",
                value: "rebalance",
            },
            silence_high: {
                module: "TTS",
                param: "silence_trim",
                value: "enable",
            },
            overlap_high: {
                module: "TTS",
                param: "timestamp_alignment",
                value: "strict",
            },
        },
    };
}

/**
 * Step 48.1: 피드백 학습 (reinforcement score 계산)
 * 품질 리포트 생성 시 자동으로 이전 보정의 효과를 평가
 */
export const evaluateTuningFeedback = async (
    teamId: string,
    reportId: string,
    currentScore: number
): Promise<void> => {
    try {
        // 최근 튜닝 로그 가져오기
        const tuningLogs = await db
            .collection("tuningLogs")
            .where("teamId", "==", teamId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        if (tuningLogs.empty) {
            return; // 튜닝 이력이 없으면 스킵
        }

        const lastTuning = tuningLogs.docs[0].data();
        const lastTuningTime = lastTuning.createdAt?.toDate?.() || new Date(lastTuning.createdAt);

        // 튜닝 이후 생성된 리포트들의 평균 점수 계산
        const reportsAfterTuning = await db
            .collectionGroup("qualityReports")
            .where("teamId", "==", teamId)
            .where("createdAt", ">", lastTuningTime)
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

        if (reportsAfterTuning.empty) {
            return;
        }

        const scores = reportsAfterTuning.docs.map((doc) => {
            const metrics = doc.data().metrics || {};
            return metrics.overallScore || 0;
        });

        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // 튜닝 이전 점수 (또는 기준 점수)
        const baselineScore = lastTuning.baselineScore || 0.7;
        const deltaScore = avgScore - baselineScore;

        // Reinforcement score 계산: 개선 시 +1, 악화 시 -1
        let reinforcementScore = 0;
        if (deltaScore > 0.05) {
            reinforcementScore = 1; // 개선
        } else if (deltaScore < -0.05) {
            reinforcementScore = -1; // 악화
        }

        // 튜닝 로그에 피드백 추가
        await db.collection("tuningLogs").doc(tuningLogs.docs[0].id).set(
            {
                feedback: {
                    deltaScore,
                    avgScore,
                    baselineScore,
                    reinforcementScore,
                    evaluatedAt: new Date(),
                },
            },
            { merge: true }
        );

        logger.info(`📊 튜닝 피드백 평가: deltaScore=${deltaScore.toFixed(3)}, reinforcementScore=${reinforcementScore}`);
    } catch (error) {
        logger.error("❌ 튜닝 피드백 평가 오류:", error);
    }
};

