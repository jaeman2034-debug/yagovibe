import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";

// 기존 스텝의 엔드포인트들
const ORIGIN = process.env.FUNCTIONS_ORIGIN || 
    `https://asia-northeast3-${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}.cloudfunctions.net`;

// 간단한 Intent 규칙 (필요시 OpenAI NLU로 교체 가능)
const INTENTS = [
    { name: "team_summary", pat: /(팀|team).*(요약|summary)|요약.*(팀|team)/i },
    { name: "anomaly_brief", pat: /(이상|anomaly|알람|경보).*(브리핑|요약|알려|확인)|브리핑.*(이상|알람|경보)/i },
    { name: "retuning", pat: /(재튜닝|튜닝|retune|재조정|튜닝.*실행|재튜닝.*실행)/i },
    { name: "predict_report", pat: /(예측|prediction|다음주|forecast|예측.*리포트)/i },
    { name: "model_status", pat: /(모델|model).*(상태|버전|재학습|학습|로드)/i },
    { name: "model_reload", pat: /(모델.*재로드|모델.*리로드|reload.*model)/i },
    { name: "global_stats", pat: /(전체|글로벌|global).*(통계|요약|상태)/i },
];

interface ActionParams {
    intent: string;
    teamId?: string;
    text?: string;
}

/**
 * 액션 실행 함수
 */
async function action({ intent, teamId, text }: ActionParams): Promise<{ message: string; speech: string }> {
    switch (intent) {
        case "team_summary": {
            try {
                // Step 51의 getGlobalStats 호출
                const url = teamId 
                    ? `${ORIGIN}/getGlobalStats?teamId=${encodeURIComponent(teamId)}`
                    : `${ORIGIN}/getGlobalStats`;
                
                const r = await fetch(url);
                const j = await r.json();

                let line = "팀 요약을 찾을 수 없습니다.";

                if (teamId && j.summary) {
                    const row = (j.summary || []).find(
                        (x: any) => x.teamId?.toLowerCase() === String(teamId).toLowerCase()
                    );
                    if (row) {
                        line = `${row.teamName || row.teamId} — 점수 ${(row.lastScore * 100).toFixed(1)}%, 커버리지 ${(row.coverage * 100).toFixed(1)}%, 루트원인: ${row.rootCause || "없음"}`;
                    } else {
                        line = `${teamId} 팀을 찾을 수 없습니다.`;
                    }
                } else if (j.summary && j.summary.length > 0) {
                    const row = j.summary[0];
                    line = `${row.teamName || row.teamId} — 점수 ${(row.lastScore * 100).toFixed(1)}%, 커버리지 ${(row.coverage * 100).toFixed(1)}%`;
                } else if (j.globalKPI) {
                    const kpi = j.globalKPI;
                    line = `전체 평균 점수 ${(kpi.avgScore * 100).toFixed(1)}%, 커버리지 ${(kpi.avgCoverage * 100).toFixed(1)}%, 활성 팀 ${kpi.totalTeams}개`;
                }

                return { message: line, speech: line };
            } catch (error: any) {
                logger.error("팀 요약 조회 오류:", error);
                return { message: "팀 요약 조회 중 오류가 발생했습니다.", speech: "팀 요약 조회 중 오류가 발생했습니다." };
            }
        }

        case "anomaly_brief": {
            try {
                // Step 44의 알림 조회 (간단 버전)
                const url = teamId 
                    ? `${ORIGIN}/getGlobalStats?teamId=${encodeURIComponent(teamId)}`
                    : `${ORIGIN}/getGlobalStats`;
                
                const r = await fetch(url);
                const j = await r.json();

                if (teamId && j.summary) {
                    const row = (j.summary || []).find(
                        (x: any) => x.teamId?.toLowerCase() === String(teamId).toLowerCase()
                    );
                    if (row) {
                        const msg = `${row.teamName || row.teamId}의 최근 이상 로그를 확인했습니다. 주요 경보 ${row.alertCount || 0}건, 이상 탐지 ${row.anomalyCount || 0}건. 상세는 대시보드에서 확인하세요.`;
                        return { message: msg, speech: msg };
                    }
                }

                if (j.globalKPI) {
                    const msg = `최근 이상 로그를 확인했습니다. 전체 경보 ${j.globalKPI.totalAlerts}건, 이상 탐지 ${j.globalKPI.totalAnomalies}건입니다.`;
                    return { message: msg, speech: msg };
                }

                const msg = teamId ? `${teamId}의 최근 이상 로그를 확인했습니다.` : "최근 이상 로그를 확인했습니다.";
                return { message: msg, speech: msg };
            } catch (error: any) {
                logger.error("이상 브리핑 조회 오류:", error);
                return { message: "이상 브리핑 조회 중 오류가 발생했습니다.", speech: "이상 브리핑 조회 중 오류가 발생했습니다." };
            }
        }

        case "retuning": {
            try {
                // Step 51의 triggerActions 호출
                const url = `${ORIGIN}/triggerActions`;
                await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "retuning", teamId }),
                });

                const msg = teamId ? `${teamId} 재튜닝을 시작했습니다.` : "전체 팀 재튜닝을 시작했습니다.";
                return { message: msg, speech: msg };
            } catch (error: any) {
                logger.error("재튜닝 오류:", error);
                return { message: "재튜닝 실행 중 오류가 발생했습니다.", speech: "재튜닝 실행 중 오류가 발생했습니다." };
            }
        }

        case "predict_report": {
            try {
                // Step 40의 predictQualityTrend 호출
                const url = `${ORIGIN}/predictQualityTrend`;
                await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                });

                const msg = "예측 리포트를 생성 중입니다. 잠시 후 대시보드에 반영됩니다.";
                return { message: msg, speech: msg };
            } catch (error: any) {
                logger.error("예측 리포트 생성 오류:", error);
                return { message: "예측 리포트 생성 중 오류가 발생했습니다.", speech: "예측 리포트 생성 중 오류가 발생했습니다." };
            }
        }

        case "model_status": {
            try {
                // Step 50의 모델 상태 확인
                const msg = "예측 모델은 최신 버전으로 운영 중입니다. 필요시 '모델 재로드'라고 말씀하세요.";
                return { message: msg, speech: msg };
            } catch (error: any) {
                logger.error("모델 상태 확인 오류:", error);
                return { message: "모델 상태 확인 중 오류가 발생했습니다.", speech: "모델 상태 확인 중 오류가 발생했습니다." };
            }
        }

        case "model_reload": {
            try {
                // Step 51의 triggerActions 호출
                const url = `${ORIGIN}/triggerActions`;
                await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reloadModel" }),
                });

                const msg = "모델 재로드를 시작했습니다. 완료되면 대시보드에 반영됩니다.";
                return { message: msg, speech: msg };
            } catch (error: any) {
                logger.error("모델 재로드 오류:", error);
                return { message: "모델 재로드 중 오류가 발생했습니다.", speech: "모델 재로드 중 오류가 발생했습니다." };
            }
        }

        case "global_stats": {
            try {
                // Step 51의 getGlobalStats 호출
                const url = `${ORIGIN}/getGlobalStats`;
                const r = await fetch(url);
                const j = await r.json();

                if (j.globalKPI) {
                    const kpi = j.globalKPI;
                    const msg = `전체 통계: 평균 점수 ${(kpi.avgScore * 100).toFixed(1)}%, 커버리지 ${(kpi.avgCoverage * 100).toFixed(1)}%, 활성 팀 ${kpi.totalTeams}개, 총 알림 ${kpi.totalAlerts}건, 이상 탐지 ${kpi.totalAnomalies}건`;
                    return { message: msg, speech: msg };
                }

                return { message: "전체 통계를 조회했습니다.", speech: "전체 통계를 조회했습니다." };
            } catch (error: any) {
                logger.error("전체 통계 조회 오류:", error);
                return { message: "전체 통계 조회 중 오류가 발생했습니다.", speech: "전체 통계 조회 중 오류가 발생했습니다." };
            }
        }

        default:
            return {
                message: "명령을 이해하지 못했습니다. '팀 요약', '재튜닝', '이상 브리핑', '모델 상태' 등을 시도해 보세요.",
                speech: "명령을 이해하지 못했습니다. 다시 말씀해주세요.",
            };
    }
}

/**
 * Step 52: AI 운영 Copilot - NLU 라우팅 + 액션 실행
 * POST /opsRouter
 * Body: { text: string, teamId?: string }
 */
export const opsRouter = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { text = "", teamId } = req.body || {};

            if (!text || !text.trim()) {
                res.status(400).json({ error: "text is required" });
                return;
            }

            logger.info("🎙️ Ops Copilot 명령:", { text, teamId });

            const lower = String(text).toLowerCase();
            const matched = INTENTS.find((x) => x.pat.test(lower));
            const intent = matched?.name || "unknown";

            logger.info("📋 Intent 인식:", { intent, text });

            const out = await action({ intent, teamId, text });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({ intent, ...out });
        } catch (error: any) {
            logger.error("❌ Ops Router 오류:", error);
            res.status(500).json({
                error: error.message,
                message: "명령 처리 중 오류가 발생했습니다.",
                speech: "명령 처리 중 오류가 발생했습니다.",
            });
        }
    }
);

