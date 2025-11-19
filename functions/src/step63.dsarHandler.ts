import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * Step 63: DSAR Handler - 데이터 주체 요청 자동화
 * POST /dsarHandler
 * Body: { uid: string, token: string, type: 'access' | 'delete' | 'portability' }
 */
export const dsarHandler = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { uid, token, type = "access" } = req.body || {};

            if (!uid || !token) {
                res.status(400).json({ error: "missing uid/token" });
                return;
            }

            logger.info("📋 DSAR 요청 수신:", { uid, type });

            // 토큰 검증 (OAuth/Email Code)
            const valid = await verifyToken(uid, token);
            if (!valid) {
                res.status(403).json({ error: "invalid token" });
                return;
            }

            // DSAR 요청 기록
            const exportJob = await db.collection("dsarRequests").add({
                uid,
                type,
                status: "pending",
                createdAt: Timestamp.now(),
                verifiedAt: Timestamp.now(),
            });

            logger.info("✅ DSAR 요청 기록:", { requestId: exportJob.id });

            // 타입별 처리
            let result: any = {};

            if (type === "access" || type === "portability") {
                // 데이터 접근/이식권: complianceExporter 호출
                const functionsOrigin =
                    process.env.FUNCTIONS_ORIGIN ||
                    `https://asia-northeast3-${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}.cloudfunctions.net`;

                const exportResponse = await fetch(
                    `${functionsOrigin}/complianceExporter?uid=${uid}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${process.env.FUNCTIONS_INVOKE_TOKEN || ""}`,
                        },
                    }
                );

                if (exportResponse.ok) {
                    result = await exportResponse.json();
                } else {
                    throw new Error("Export failed");
                }
            } else if (type === "delete") {
                // 삭제권(망각권): retentionCleaner에 삭제 요청 추가
                await db.collection("deletionRequests").add({
                    uid,
                    requestedAt: Timestamp.now(),
                    status: "pending",
                    dsarRequestId: exportJob.id,
                });
                result = { message: "Deletion request queued" };
            }

            // 완료 상태 업데이트
            await exportJob.update({
                status: "done",
                result,
                completedAt: Timestamp.now(),
            });

            // Slack 알림 (선택)
            if (process.env.SLACK_WEBHOOK_URL) {
                try {
                    const slackMessage =
                        `📁 DSAR Export Completed\n\n` +
                        `UID: ${uid}\n` +
                        `Type: ${type}\n` +
                        `Request ID: ${exportJob.id}\n` +
                        (result.publicUrl ? `File: ${result.publicUrl}` : "Status: Queued");

                    await fetch(process.env.SLACK_WEBHOOK_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: slackMessage }),
                    });
                } catch (error) {
                    logger.warn("⚠️ Slack 알림 실패:", error);
                }
            }

            // Email 알림 (선택)
            if (process.env.SMTP_USER) {
                try {
                    const user = await auth.getUser(uid);
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS,
                        },
                    });

                    await transporter.sendMail({
                        from: process.env.SMTP_USER,
                        to: user.email || process.env.MAIL_TO || "admin@yago-vibe.com",
                        subject: `[YAGO VIBE] DSAR Request Completed - ${type}`,
                        text: `Your data subject access request has been completed.\n\nRequest ID: ${exportJob.id}\nType: ${type}\n\n${result.publicUrl ? `Download: ${result.publicUrl}` : "Status: Queued"}`,
                    });
                } catch (error) {
                    logger.warn("⚠️ Email 알림 실패:", error);
                }
            }

            logger.info("✅ DSAR 처리 완료:", { requestId: exportJob.id, type });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                ok: true,
                message: "DSAR export completed",
                requestId: exportJob.id,
                result,
            });
        } catch (error: any) {
            logger.error("❌ DSAR 처리 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * 토큰 검증 (OAuth/Email Code)
 * 실제 프로덕션에서는 OAuth/JWT 서명 검증 필요
 */
async function verifyToken(uid: string, token: string): Promise<boolean> {
    try {
        // 간단한 검증 (실제로는 OAuth/JWT 검증 필요)
        if (token.startsWith("auth_") || token.startsWith("email_")) {
            // 추가 검증 로직 (예: Firestore에 토큰 저장 후 확인)
            const tokenDoc = await db.collection("dsarTokens").doc(token).get();
            if (tokenDoc.exists) {
                const data = tokenDoc.data();
                if (data?.uid === uid && data?.expiresAt?.toDate() > new Date()) {
                    return true;
                }
            }
        }

        // 관리자 토큰 (임시)
        if (token === process.env.ADMIN_TOKEN) {
            return true;
        }

        return false;
    } catch (error) {
        logger.error("토큰 검증 오류:", error);
        return false;
    }
}

