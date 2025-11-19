import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 60: Publish Insight - 승인/반려
 * POST /publishInsight
 * Body: { id: string, decision: 'approve' | 'reject', reviewer: { uid: string, name: string }, comment?: string }
 */
export const publishInsight = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { id, decision, reviewer, comment } = req.body || {};

            if (!id || !decision) {
                res.status(400).json({ error: "Missing parameters: id and decision are required" });
                return;
            }

            if (decision !== "approve" && decision !== "reject") {
                res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
                return;
            }

            logger.info("📋 인사이트 승인/반려:", { id, decision, reviewer });

            const ref = db.collection("insightReports").doc(id);
            const snap = await ref.get();

            if (!snap.exists) {
                res.status(404).json({ error: "Report not found" });
                return;
            }

            const data = snap.data()!;
            const now = new Date();

            // 상태 결정
            let status: "draft" | "approved" | "rejected" | "published" = "draft";
            if (decision === "approve") {
                status = "approved";
            } else if (decision === "reject") {
                status = "rejected";
            }

            // 리뷰 히스토리 추가
            const reviewEntry = {
                action: decision,
                uid: reviewer?.uid || "system",
                name: reviewer?.name || "System",
                ts: Timestamp.now(),
                comment: comment || null,
            };

            const reviewHistory = [...(data.reviewHistory || []), reviewEntry];

            // 업데이트
            await ref.set(
                {
                    status,
                    reviewer: reviewer || null,
                    reviewHistory,
                    updatedAt: Timestamp.now(),
                },
                { merge: true }
            );

            // 코멘트 추가 (반려 시)
            if (decision === "reject" && comment) {
                const comments = [...(data.comments || []), {
                    uid: reviewer?.uid || "system",
                    name: reviewer?.name || "System",
                    text: comment,
                    createdAt: Timestamp.now(),
                }];

                await ref.set({ comments }, { merge: true });
            }

            // 승인 시 자동 배포
            if (status === "approved") {
                logger.info("✅ 인사이트 승인됨, 배포 시작:", { id });

                // 배포 로직 (Slack + Email)
                const channels = data.subscription?.channels || {};

                // Slack
                if (channels.slack && process.env.SLACK_WEBHOOK_URL) {
                    try {
                        const slackMessage = `📣 [YAGO VIBE 인사이트 승인]\n\n` +
                            `팀: ${data.teamId}\n` +
                            `요약: ${data.summary?.substring(0, 200)}...\n` +
                            `결정: ✅ 승인됨 by ${reviewer?.name || "운영자"} (${now.toLocaleDateString("ko-KR")})\n` +
                            `리포트 ID: ${id}`;

                        await fetch(process.env.SLACK_WEBHOOK_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: slackMessage }),
                        });
                        logger.info("✅ Slack 발송 완료");
                    } catch (error) {
                        logger.error("❌ Slack 발송 실패:", error);
                    }
                }

                // Email
                if (channels.email && process.env.SMTP_USER) {
                    try {
                        const transporter = nodemailer.createTransport({
                            service: "gmail",
                            auth: {
                                user: process.env.SMTP_USER,
                                pass: process.env.SMTP_PASS,
                            },
                        });

                        const emailSubject = `[YAGO VIBE] 인사이트 승인됨 - ${data.teamId}`;
                        const emailText = `인사이트 리포트가 승인되었습니다.\n\n` +
                            `팀: ${data.teamId}\n` +
                            `요약:\n${data.summary}\n\n` +
                            `승인자: ${reviewer?.name || "운영자"}\n` +
                            `승인 시간: ${now.toLocaleString("ko-KR")}\n` +
                            `리포트 ID: ${id}`;

                        await transporter.sendMail({
                            from: process.env.SMTP_USER,
                            to: data.subscription?.emailTo || process.env.MAIL_TO || "admin@yago-vibe.com",
                            subject: emailSubject,
                            text: emailText,
                            html: `<pre>${emailText}</pre>`,
                        });
                        logger.info("✅ Email 발송 완료");
                    } catch (error) {
                        logger.error("❌ Email 발송 실패:", error);
                    }
                }

                // published 상태로 변경
                await ref.set(
                    {
                        status: "published",
                        publishedAt: Timestamp.now(),
                    },
                    { merge: true }
                );

                logger.info("✅ 인사이트 배포 완료:", { id });
            }

            // 반려 시 코멘트 저장은 이미 위에서 처리됨

            logger.info("✅ 인사이트 상태 업데이트 완료:", { id, status });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                ok: true,
                status: status === "approved" ? "published" : status,
                reportId: id,
            });
        } catch (error: any) {
            logger.error("❌ 인사이트 승인/반려 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Step 60: Update Insight - 리비전 생성
 * POST /updateInsight
 * Body: { id: string, summary: string, highlights: any[], reviewer: { uid: string, name: string } }
 * Step 43: Role System 연동 - Owner/Editor만 수정 가능
 */
export const updateInsight = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { id, summary, highlights, alerts, reviewer } = req.body || {};

            if (!id) {
                res.status(400).json({ error: "id is required" });
                return;
            }

            if (!reviewer?.uid) {
                res.status(401).json({ error: "Authentication required" });
                return;
            }

            logger.info("📝 인사이트 수정:", { id });

            const ref = db.collection("insightReports").doc(id);
            const snap = await ref.get();

            if (!snap.exists) {
                res.status(404).json({ error: "Report not found" });
                return;
            }

            const data = snap.data()!;
            const teamId = data.teamId;
            const currentRevision = data.revision || 0;

            // Step 43: 권한 확인 (Owner 또는 Editor)
            const hasPermission = await checkReviewPermission(reviewer.uid, teamId);
            if (!hasPermission) {
                // Editor 권한도 확인
                const roleDoc = await db.doc(`teams/${teamId}/roles/${reviewer.uid}`).get();
                const roleData = roleDoc.data();
                const isEditor = roleData?.role === "editor";
                
                if (!isEditor) {
                    res.status(403).json({ 
                        error: "Permission denied. Only Owner, Editor, or Admin can update insights." 
                    });
                    return;
                }
            }

            // 리비전 생성 (approved → draft)
            const updateData: any = {
                status: "draft",
                revision: currentRevision + 1,
                updatedAt: Timestamp.now(),
            };

            if (summary !== undefined) updateData.summary = summary;
            if (highlights !== undefined) updateData.highlights = highlights;
            if (alerts !== undefined) updateData.alerts = alerts;

            // 리뷰 히스토리 추가
            if (reviewer) {
                const reviewEntry = {
                    action: "updated",
                    uid: reviewer.uid,
                    name: reviewer.name,
                    ts: Timestamp.now(),
                };

                updateData.reviewHistory = [...(data.reviewHistory || []), reviewEntry];
            }

            await ref.set(updateData, { merge: true });

            logger.info("✅ 인사이트 수정 완료:", { id, revision: currentRevision + 1 });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                ok: true,
                reportId: id,
                revision: currentRevision + 1,
            });
        } catch (error: any) {
            logger.error("❌ 인사이트 수정 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

