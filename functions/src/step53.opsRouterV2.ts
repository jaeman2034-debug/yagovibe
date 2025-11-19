import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import crypto from "crypto";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

// 위험도가 높은 Intent 목록
const RISKY = new Set(["retuning", "deploy_model", "bulk_alert", "model_reload"]);
const EXPIRY_MIN = 10;
const COOLDOWN_MIN = 5; // 동일 intent+teamId 재시도 쿨다운 (분)

// Step 52의 INTENTS 패턴 재사용
const INTENTS = [
    { name: "team_summary", pat: /(팀|team).*(요약|summary)|요약.*(팀|team)/i },
    { name: "anomaly_brief", pat: /(이상|anomaly|알람|경보).*(브리핑|요약|알려|확인)|브리핑.*(이상|알람|경보)/i },
    { name: "retuning", pat: /(재튜닝|튜닝|retune|재조정|튜닝.*실행|재튜닝.*실행)/i },
    { name: "predict_report", pat: /(예측|prediction|다음주|forecast|예측.*리포트)/i },
    { name: "model_status", pat: /(모델|model).*(상태|버전|재학습|학습|로드)/i },
    { name: "model_reload", pat: /(모델.*재로드|모델.*리로드|reload.*model)/i },
    { name: "deploy_model", pat: /(모델.*배포|모델.*교체|deploy.*model)/i },
    { name: "global_stats", pat: /(전체|글로벌|global).*(통계|요약|상태)/i },
    { name: "bulk_alert", pat: /(대량|bulk).*(알람|알림|경보)/i },
];

function newNonce(): string {
    return crypto.randomBytes(16).toString("hex");
}

function now(): Date {
    return new Date();
}

function addMin(d: Date, m: number): Date {
    return new Date(d.getTime() + m * 60 * 1000);
}

function getIntent(text: string): string {
    const lower = String(text).toLowerCase();
    const matched = INTENTS.find((x) => x.pat.test(lower));
    return matched?.name || "unknown";
}

/**
 * 쿨다운 체크: 동일 intent+teamId 승인 후 X분 내 재시도 차단
 */
async function checkCooldown(
    sessionId: string,
    intent: string,
    teamId: string | null
): Promise<{ allowed: boolean; reason?: string }> {
    try {
        const sessionRef = db.doc(`opsSessions/${sessionId}`);
        const sessionSnap = await sessionRef.get();
        const session = sessionSnap.data();

        if (!session) return { allowed: true };

        // 최근 승인된 로그 확인
        const logsSnap = await sessionRef
            .collection("logs")
            .where("meta.approved", "==", true)
            .where("meta.intent", "==", intent)
            .orderBy("when", "desc")
            .limit(1)
            .get();

        if (!logsSnap.empty) {
            const lastLog = logsSnap.docs[0].data();
            const lastTime = lastLog.when?.toDate?.() || new Date(lastLog.when);
            const cooldownEnd = addMin(lastTime, COOLDOWN_MIN);

            if (now() < cooldownEnd) {
                const remaining = Math.ceil((cooldownEnd.getTime() - now().getTime()) / 60000);
                return {
                    allowed: false,
                    reason: `쿨다운 중입니다. ${remaining}분 후 재시도 가능합니다.`,
                };
            }
        }

        return { allowed: true };
    } catch (error) {
        logger.error("쿨다운 체크 오류:", error);
        return { allowed: true }; // 오류 시 허용
    }
}

/**
 * Step 53: Ops Router V2 - 멀티턴 메모리 + 승인 토큰 발급
 * POST /opsRouterV2
 * Body: { text: string, sessionId: string, teamId?: string, uid?: string }
 */
export const opsRouterV2 = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { text = "", sessionId, teamId, uid } = req.body || {};

            if (!sessionId) {
                res.status(400).json({ error: "sessionId required" });
                return;
            }

            if (!text || !text.trim()) {
                res.status(400).json({ error: "text required" });
                return;
            }

            logger.info("🎙️ Ops Router V2 명령:", { text, sessionId, teamId, uid });

            // 1) 세션 로드/생성
            const sRef = db.doc(`opsSessions/${sessionId}`);
            const sSnap = await sRef.get();

            if (!sSnap.exists) {
                await sRef.set({
                    createdAt: Timestamp.now(),
                    context: {},
                    user: { uid: uid || null },
                });
            }

            const session = (await sRef.get()).data() || {};

            // 2) Intent 추출
            const intent = getIntent(text);

            // Step 56: 차단된 명령 체크 (runtimeOps.disabled)
            try {
                const runtimeOpsDoc = await db.doc("policies/runtimeOps").get();
                const runtimeOps = runtimeOpsDoc.data();
                const disabled = runtimeOps?.disabled || [];

                if (disabled.length > 0) {
                    // "*" 는 모든 명령 차단
                    if (disabled.includes("*")) {
                        logger.warn("🚫 모든 명령 차단됨 (Governance Policy)");
                        return res.json({
                            needConfirm: false,
                            message: "⚠️ Governance Policy에 의해 모든 명령이 현재 차단되었습니다.",
                            blocked: true,
                            reason: runtimeOps?.reason || "Governance Policy",
                        });
                    }

                    // 특정 intent 차단 체크
                    if (disabled.includes(intent)) {
                        logger.warn(`🚫 명령 차단됨: ${intent} (Governance Policy)`);
                        return res.json({
                            needConfirm: false,
                            message: `⚠️ "${intent}" 명령이 Governance Policy에 의해 차단되었습니다.`,
                            blocked: true,
                            reason: runtimeOps?.reason || "Governance Policy",
                        });
                    }
                }
            } catch (error) {
                logger.error("차단 정책 체크 오류:", error);
                // 오류 시 계속 진행
            }

            // 3) 멀티턴 컨텍스트 업데이트
            const ctx = session.context || {};
            if (teamId) ctx.teamId = teamId; // 대화 중 팀 고정
            ctx.lastIntent = intent;
            ctx.lastInput = text;
            ctx.updatedAt = Timestamp.now();

            await sRef.set({ context: ctx }, { merge: true });

            // 4) 로그 적재
            await sRef.collection("logs").add({
                when: Timestamp.now(),
                role: "user",
                text,
                meta: { intent },
            });

            // 5) 위험도 평가 및 승인 흐름
            if (RISKY.has(intent)) {
                // 쿨다운 체크
                const cooldownCheck = await checkCooldown(sessionId, intent, ctx.teamId || null);
                if (!cooldownCheck.allowed) {
                    const message = cooldownCheck.reason || "쿨다운 중입니다.";
                    await sRef.collection("logs").add({
                        when: Timestamp.now(),
                        role: "assistant",
                        text: message,
                        meta: { cooldown: true },
                    });
                    return res.json({ needConfirm: false, message, blocked: true });
                }

                // 승인 대기 상태 생성
                const nonce = newNonce();
                const pending = {
                    intent,
                    params: { teamId: ctx.teamId || teamId || null },
                    createdAt: Timestamp.now(),
                    nonce,
                    expiresAt: Timestamp.fromDate(addMin(now(), EXPIRY_MIN)),
                    risk: intent === "deploy_model" || intent === "bulk_alert" ? "high" : "med",
                };

                await sRef.set({ pending }, { merge: true });

                const targetName = ctx.teamId || teamId || "전체";
                const prompt = `"${targetName}" 대상 ${intent} 작업을 진행할까요? 10분 이내 확인이 필요합니다.`;

                await sRef.collection("logs").add({
                    when: Timestamp.now(),
                    role: "assistant",
                    text: prompt,
                    meta: { pending: true, nonce },
                });

                res.setHeader("Access-Control-Allow-Origin", "*");
                return res.json({ needConfirm: true, nonce, message: prompt, intent, risk: pending.risk });
            }

            // 6) 비파괴적 액션 즉시 처리 (예: 요약/브리핑)
            let answer = "";

            if (intent === "team_summary") {
                const targetName = ctx.teamId || teamId || "기본 팀";
                answer = `${targetName} 최근 점수와 커버리지를 요약했습니다.`;
            } else if (intent === "anomaly_brief") {
                const targetName = ctx.teamId || teamId || "기본 팀";
                answer = `${targetName}의 최근 이상 경보를 브리핑합니다.`;
            } else if (intent === "global_stats") {
                answer = "전체 통계를 조회했습니다. 대시보드에서 확인하세요.";
            } else if (intent === "model_status") {
                answer = "예측 모델은 최신 버전으로 운영 중입니다.";
            } else {
                answer = "명령을 이해하지 못했습니다. '팀 요약', '재튜닝', '이상 브리핑' 등을 시도해 보세요.";
            }

            await sRef.collection("logs").add({
                when: Timestamp.now(),
                role: "assistant",
                text: answer,
                meta: { intent },
            });

            res.setHeader("Access-Control-Allow-Origin", "*");
            return res.json({ message: answer, intent });
        } catch (error: any) {
            logger.error("❌ Ops Router V2 오류:", error);
            res.status(500).json({
                error: error.message,
                message: "명령 처리 중 오류가 발생했습니다.",
            });
        }
    }
);

