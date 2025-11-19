import { onSchedule } from "firebase-functions/v2/scheduler";
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
 * Step 63: Retention Cleaner - 보존기간 만료 자동 파기
 * 매일 02:00에 실행 (기본 180일 보존)
 */
export const retentionCleaner = onSchedule(
    {
        schedule: "every day 02:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("🧹 Retention Cleaner 시작");

            // 기본 보존 기간: 180일
            const retentionDays = parseInt(process.env.RETENTION_DAYS || "180");
            const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

            logger.info("📅 보존 기간:", { retentionDays, cutoff: cutoff.toISOString() });

            // 삭제 대상 조회
            const auditLogsQuery = await db
                .collection("auditLogs")
                .where("ts", "<", Timestamp.fromDate(cutoff))
                .limit(500) // 한 번에 최대 500개 처리
                .get();

            let deletedCount = 0;

            // 배치 삭제
            const batch = db.batch();
            auditLogsQuery.docs.forEach((doc) => {
                batch.delete(doc.ref);
                deletedCount++;
            });

            if (deletedCount > 0) {
                await batch.commit();
                logger.info("✅ 삭제 완료:", { count: deletedCount });
            }

            // 삭제 요청 처리 (DSAR 삭제권)
            const deletionRequests = await db
                .collection("deletionRequests")
                .where("status", "==", "pending")
                .limit(100)
                .get();

            let deletedUsers = 0;

            for (const reqDoc of deletionRequests.docs) {
                const reqData = reqDoc.data();
                const uid = reqData.uid;

                if (!uid) continue;

                try {
                    // 사용자 관련 데이터 삭제
                    const userAudits = await db
                        .collection("auditLogs")
                        .where("actor.uid", "==", uid)
                        .get();

                    const userReports = await db
                        .collection("insightReports")
                        .where("reviewer.uid", "==", uid)
                        .get();

                    const deleteBatch = db.batch();
                    userAudits.docs.forEach((doc) => deleteBatch.delete(doc.ref));
                    userReports.docs.forEach((doc) => deleteBatch.delete(doc.ref));

                    await deleteBatch.commit();

                    // 삭제 요청 상태 업데이트
                    await reqDoc.ref.update({
                        status: "completed",
                        completedAt: Timestamp.now(),
                        deletedCount: userAudits.size + userReports.size,
                    });

                    deletedUsers++;
                    logger.info("✅ 사용자 데이터 삭제 완료:", { uid, count: userAudits.size + userReports.size });
                } catch (error) {
                    logger.error("❌ 사용자 데이터 삭제 실패:", { uid, error });
                    await reqDoc.ref.update({
                        status: "failed",
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            // 시스템 로그 기록
            await db.collection("systemLogs").add({
                type: "retention_gc",
                deleted: {
                    auditLogs: deletedCount,
                    users: deletedUsers,
                },
                retentionDays,
                cutoff: Timestamp.fromDate(cutoff),
                timestamp: Timestamp.now(),
            });

            // Slack 알림 (선택)
            if (process.env.SLACK_WEBHOOK_URL && (deletedCount > 0 || deletedUsers > 0)) {
                try {
                    const slackMessage =
                        `🧹 Retention Cleaner Completed\n\n` +
                        `Deleted Audit Logs: ${deletedCount}\n` +
                        `Deleted User Data: ${deletedUsers}\n` +
                        `Retention Period: ${retentionDays} days`;

                    await fetch(process.env.SLACK_WEBHOOK_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: slackMessage }),
                    });
                } catch (error) {
                    logger.warn("⚠️ Slack 알림 실패:", error);
                }
            }

            logger.info("✅ Retention Cleaner 완료:", {
                deletedCount,
                deletedUsers,
            });
        } catch (error: any) {
            logger.error("❌ Retention Cleaner 오류:", error);
        }
    }
);

