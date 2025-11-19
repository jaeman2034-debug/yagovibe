import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

const ORIGIN = process.env.FUNCTIONS_ORIGIN || 
    `https://asia-northeast3-${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}.cloudfunctions.net`;

/**
 * 역할 조회 (Step 43 기반)
 */
async function getRole(teamId: string, uid?: string): Promise<string> {
    if (!uid) return "viewer";

    try {
        // teams/{teamId}/roles/{uid} 또는 teams/{teamId}/members/{uid} 확인
        const roleRef = db.doc(`teams/${teamId}/roles/${uid}`);
        const roleSnap = await roleRef.get();

        if (roleSnap.exists) {
            const roleData = roleSnap.data();
            return roleData?.role || "viewer";
        }

        // 대체: members 컬렉션 확인
        const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
        const memberSnap = await memberRef.get();

        if (memberSnap.exists) {
            const memberData = memberSnap.data();
            return memberData?.role || "viewer";
        }

        // Firestore custom claims 확인 (전역 관리자)
        // 실제 구현 시 getAuth().getUser(uid)로 custom claims 확인

        return "viewer";
    } catch (error) {
        logger.error("역할 조회 오류:", error);
        return "viewer";
    }
}

/**
 * Step 53: Ops Confirm - 승인/거부 + 역할 검증 + 실행
 * POST /opsConfirm
 * Body: { sessionId: string, nonce: string, decision: 'approve'|'reject', uid?: string }
 */
export const opsConfirm = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { sessionId, nonce, decision, uid } = req.body || {};

            if (!sessionId || !nonce) {
                res.status(400).json({ error: "sessionId/nonce required" });
                return;
            }

            if (decision !== "approve" && decision !== "reject") {
                res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
                return;
            }

            logger.info("✅ Ops Confirm 요청:", { sessionId, nonce, decision, uid });

            const sRef = db.doc(`opsSessions/${sessionId}`);
            const sSnap = await sRef.get();

            if (!sSnap.exists) {
                res.status(404).json({ error: "session not found" });
                return;
            }

            const s = sSnap.data() as any;

            if (!s?.pending) {
                res.status(409).json({ error: "no pending action" });
                return;
            }

            const p = s.pending;

            // Nonce 검증
            if (String(p.nonce) !== String(nonce)) {
                res.status(403).json({ error: "invalid nonce" });
                return;
            }

            // 만료 확인
            const expiresAt = p.expiresAt?.toDate?.() || new Date(p.expiresAt);
            if (expiresAt.getTime() < Date.now()) {
                await sRef.set({ pending: null }, { merge: true });
                res.status(410).json({ error: "expired" });
                return;
            }

            // 권한 검증 (Step 43)
            const teamId = p.params?.teamId || "default";
            const role = await getRole(teamId, uid);

            // 고위험 작업은 owner/admin만 가능
            const highRiskIntents = ["deploy_model", "bulk_alert"];
            const isHighRisk = highRiskIntents.includes(p.intent);

            if (isHighRisk) {
                const allowed = ["owner", "admin"].includes(role);
                if (!allowed) {
                    await sRef.collection("logs").add({
                        when: Timestamp.now(),
                        role: "assistant",
                        text: `권한이 부족합니다. (현재 역할: ${role}, 필요: owner/admin)`,
                        meta: { rejected: true, reason: "insufficient_permission" },
                    });
                    res.status(403).json({ error: "forbidden", role, required: "owner/admin" });
                    return;
                }
            } else {
                // 중위험 작업은 owner/coach/editor 가능
                const allowed = ["owner", "coach", "editor", "admin"].includes(role);
                if (!allowed) {
                    await sRef.collection("logs").add({
                        when: Timestamp.now(),
                        role: "assistant",
                        text: `권한이 부족합니다. (현재 역할: ${role})`,
                        meta: { rejected: true, reason: "insufficient_permission" },
                    });
                    res.status(403).json({ error: "forbidden", role });
                    return;
                }
            }

            // 거부 처리
            if (decision !== "approve") {
                await sRef.set({ pending: null }, { merge: true });
                await sRef.collection("logs").add({
                    when: Timestamp.now(),
                    role: "assistant",
                    text: "작업이 취소되었습니다.",
                    meta: { rejected: true, reason: "user_cancelled" },
                });

                // 감사 로그
                if (p.params?.teamId) {
                    await db.collection("teams").doc(p.params.teamId).collection("auditLogs").add({
                        createdAt: Timestamp.now(),
                        type: "approval_rejected",
                        intent: p.intent,
                        userId: uid,
                        reason: "user_cancelled",
                    });
                }

                res.setHeader("Access-Control-Allow-Origin", "*");
                return res.json({ ok: true, message: "취소됨" });
            }

            // 승인 처리 - 실제 실행
            logger.info("🚀 액션 실행:", { intent: p.intent, teamId: p.params?.teamId });

            try {
                if (p.intent === "retuning") {
                    // Step 51의 triggerActions 호출
                    const url = `${ORIGIN}/triggerActions`;
                    await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "retuning", teamId: p.params?.teamId }),
                    });
                } else if (p.intent === "model_reload") {
                    // Step 51의 triggerActions 호출
                    const url = `${ORIGIN}/triggerActions`;
                    await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "reloadModel" }),
                    });
                } else if (p.intent === "deploy_model") {
                    // Step 50의 deployUpdatedModel 호출
                    const url = `${ORIGIN}/deployUpdatedModel`;
                    await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                    });
                } else if (p.intent === "bulk_alert") {
                    // 대량 알림 발송 (추후 구현)
                    logger.warn("bulk_alert는 아직 구현되지 않았습니다.");
                }

                // 승인 로그 기록
                await sRef.collection("logs").add({
                    when: Timestamp.now(),
                    role: "assistant",
                    text: "요청한 작업을 시작했습니다.",
                    meta: { approved: true, intent: p.intent },
                });

                // 감사 로그 (팀 레벨)
                if (p.params?.teamId) {
                    await db.collection("teams").doc(p.params.teamId).collection("auditLogs").add({
                        createdAt: Timestamp.now(),
                        type: "approval_approved",
                        intent: p.intent,
                        userId: uid,
                        nonce: p.nonce,
                    });

                    // 알림도 기록 (선택사항)
                    await db.collection("teams").doc(p.params.teamId).collection("alerts").add({
                        createdAt: Timestamp.now(),
                        type: "approval",
                        message: `${p.intent} started by ${uid}`,
                        meta: { sessionId, nonce },
                    });
                }

                // pending 상태 제거
                await sRef.set({ pending: null }, { merge: true });

                res.setHeader("Access-Control-Allow-Origin", "*");
                return res.json({ ok: true, message: "실행 시작" });
            } catch (actionError: any) {
                logger.error("액션 실행 오류:", actionError);
                await sRef.collection("logs").add({
                    when: Timestamp.now(),
                    role: "assistant",
                    text: `작업 실행 중 오류가 발생했습니다: ${actionError.message}`,
                    meta: { error: true, intent: p.intent },
                });
                res.status(500).json({ error: "action_execution_failed", message: actionError.message });
            }
        } catch (error: any) {
            logger.error("❌ Ops Confirm 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

