import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fetch from "node-fetch";
import * as nodemailer from "nodemailer";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const MAIL_USER = process.env.SMTP_USER;
const MAIL_PASS = process.env.SMTP_PASS;
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || process.env.MAIL_TO || "admin@yago-vibe.com";

// 중복 알림 방지 캐시 (메모리 기반, 실제 운영에서는 Redis/Spanner 사용 권장)
const recentAlerts = new Map<string, number>();
const ALERT_CACHE_TTL = 5 * 60 * 1000; // 5분

/**
 * Step 46: 이상 이벤트 수신 및 처리
 * Pub/Sub: yago-anomaly-events → Firestore + Slack/Email 발송
 */
export const ingestAnomalyAlert = onMessagePublished(
    {
        topic: "yago-anomaly-events",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            // Pub/Sub 메시지 파싱
            const messageData = event.data.message.data;
            const payload = JSON.parse(Buffer.from(messageData, 'base64').toString('utf8'));

            const { team_id, report_id, event_ts, alerts, window } = payload;

            if (!team_id || !alerts || alerts.length === 0) {
                logger.warn("⚠️ 잘못된 이상 이벤트 데이터:", payload);
                return;
            }

            // 중복 알림 방지 체크
            const cacheKey = `${team_id}-${window.end}-${alerts.map((a: any) => a.type).join(',')}`;
            const now = Date.now();
            const lastSent = recentAlerts.get(cacheKey);

            if (lastSent && (now - lastSent) < ALERT_CACHE_TTL) {
                logger.info(`⏭️ 중복 알림 스킵: ${cacheKey}`);
                return;
            }

            recentAlerts.set(cacheKey, now);

            // TTL이 지난 캐시 정리
            for (const [key, timestamp] of recentAlerts.entries()) {
                if (now - timestamp > ALERT_CACHE_TTL) {
                    recentAlerts.delete(key);
                }
            }

            // 팀 문서에서 임계치 및 알림 설정 가져오기
            const teamDoc = await db.collection("teams").doc(team_id).get();
            const teamData = teamDoc.data();
            const teamName = teamData?.name || team_id;

            // 알림 수신 대상 가져오기
            const alertTargets = teamData?.alertTargets || {};
            const emails = alertTargets.emails || [ALERT_EMAIL_TO];
            const slackChannel = alertTargets.slackChannel; // 팀별 Slack 채널 (선택적)

            // Firestore 로그 기록
            await db.collection("teams").doc(team_id).collection("alerts").add({
                createdAt: new Date(),
                type: "anomaly",
                reportId: report_id,
                eventTs: event_ts,
                window,
                messages: alerts.map((a: any) => `${a.type}: ${a.message}`),
                alerts: alerts,
            });

            logger.info(`✅ 이상 이벤트 처리: ${team_id} - ${alerts.length}개 알림`);

            // Slack 메시지 생성
            const alertText = alerts.map((a: any) => `• ${a.type}: ${a.message}`).join("\n");
            const slackText = `🚨 *이상 감지* (팀: ${teamName})\n` +
                `보고서: ${report_id || "N/A"}\n` +
                `시각: ${event_ts}\n` +
                `윈도우: ${window.start} ~ ${window.end} (n=${window.count})\n` +
                `평균: ${window.mean?.toFixed(2) || "N/A"}, 표준편차: ${window.stdev?.toFixed(2) || "N/A"}\n\n` +
                alertText;

            // Slack 발송
            if (SLACK_WEBHOOK || slackChannel) {
                try {
                    const webhook = slackChannel || SLACK_WEBHOOK;
                    await fetch(webhook, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: slackText,
                            channel: slackChannel ? `#${slackChannel}` : undefined,
                        }),
                    });
                    logger.info("✅ Slack 알림 발송 완료");
                } catch (error) {
                    logger.error("❌ Slack 알림 발송 실패:", error);
                }
            }

            // Email 발송
            if (MAIL_USER && MAIL_PASS) {
                try {
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: MAIL_USER,
                            pass: MAIL_PASS,
                        },
                    });

                    for (const email of emails) {
                        await transporter.sendMail({
                            from: MAIL_USER,
                            to: email,
                            subject: `[YAGO] 이상 감지: ${teamName}`,
                            text: slackText.replace(/\*/g, ""), // Slack 마크다운 제거
                        });
                    }
                    logger.info("✅ Email 알림 발송 완료");
                } catch (error) {
                    logger.error("❌ Email 알림 발송 실패:", error);
                }
            }

            // (옵션) Notion 티켓 생성
            const NOTION_TOKEN = process.env.NOTION_TOKEN;
            const NOTION_DB = process.env.NOTION_ANOMALY_DB || process.env.NOTION_DB;

            if (NOTION_TOKEN && NOTION_DB) {
                try {
                    await fetch("https://api.notion.com/v1/pages", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${NOTION_TOKEN}`,
                            "Content-Type": "application/json",
                            "Notion-Version": "2022-06-28",
                        },
                        body: JSON.stringify({
                            parent: { database_id: NOTION_DB },
                            properties: {
                                Title: {
                                    title: [{ text: { content: `이상 감지: ${teamName}` } }],
                                },
                                Team: {
                                    rich_text: [{ text: { content: teamName } }],
                                },
                                Report: {
                                    rich_text: [{ text: { content: report_id || "N/A" } }],
                                },
                                Type: {
                                    select: { name: "Anomaly" },
                                },
                                Status: {
                                    select: { name: "Open" },
                                },
                                "Event Time": {
                                    date: { start: event_ts },
                                },
                            },
                            children: [
                                {
                                    object: "block",
                                    type: "paragraph",
                                    paragraph: {
                                        rich_text: alerts.map((a: any) => ({
                                            type: "text",
                                            text: { content: `${a.type}: ${a.message}\n` },
                                        })),
                                    },
                                },
                            ],
                        }),
                    });
                    logger.info("✅ Notion 티켓 생성 완료");
                } catch (error) {
                    logger.error("❌ Notion 티켓 생성 실패:", error);
                }
            }

            // (옵션) Jira 티켓 생성
            const JIRA_URL = process.env.JIRA_URL;
            const JIRA_USER = process.env.JIRA_USER;
            const JIRA_TOKEN = process.env.JIRA_TOKEN;
            const JIRA_PROJECT = process.env.JIRA_PROJECT;

            if (JIRA_URL && JIRA_USER && JIRA_TOKEN && JIRA_PROJECT) {
                try {
                    const jiraAuth = Buffer.from(`${JIRA_USER}:${JIRA_TOKEN}`).toString('base64');
                    
                    await fetch(`${JIRA_URL}/rest/api/3/issue`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Basic ${jiraAuth}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            fields: {
                                project: { key: JIRA_PROJECT },
                                summary: `이상 감지: ${teamName} - ${alerts[0].type}`,
                                description: {
                                    type: "doc",
                                    version: 1,
                                    content: [
                                        {
                                            type: "paragraph",
                                            content: [
                                                {
                                                    type: "text",
                                                    text: slackText.replace(/\*/g, ""),
                                                },
                                            ],
                                        },
                                    ],
                                },
                                issuetype: { name: "Bug" },
                                labels: ["anomaly", "auto-generated"],
                            },
                        }),
                    });
                    logger.info("✅ Jira 티켓 생성 완료");
                } catch (error) {
                    logger.error("❌ Jira 티켓 생성 실패:", error);
                }
            }

        } catch (error: any) {
            logger.error("❌ 이상 이벤트 처리 오류:", error);
            // 에러를 throw하지 않음 (Pub/Sub는 자동 재시도)
        }
    }
);

