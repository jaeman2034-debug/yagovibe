import { onDocumentWritten, onSchedule } from "firebase-functions/v2/firestore";
import { onSchedule as onScheduleV1 } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import * as nodemailer from "nodemailer";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// 환경 변수
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const MAIL_USER = process.env.SMTP_USER;
const MAIL_PASS = process.env.SMTP_PASS;
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || process.env.MAIL_TO || "admin@yago-vibe.com";

// SMS (Twilio) - 선택적
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_PHONE;
const ALERT_PHONE = process.env.ALERT_PHONE;

// 기본 임계치
const DEFAULT_THRESH = {
    scoreDrop: 0.1,      // 점수 급락 임계치
    coverageMin: 0.9,    // 커버리지 최소값
    gapMax: 10,          // Gaps 최대값
    overlapMax: 8,       // Overlaps 최대값
};

/**
 * Step 44: 팀별 품질 리포트 생성 시 집계 및 알림
 * teams/{teamId}/reports/{reportId}/qualityReports/{ts} 생성 시 트리거
 */
export const onTeamQualityCreated = onDocumentWritten(
    {
        document: "teams/{teamId}/reports/{reportId}/qualityReports/{timestamp}",
        region: "asia-northeast3",
    },
    async (event) => {
        const teamId = event.params.teamId;
        const after = event.data?.after?.data();

        if (!after) {
            logger.info("⚠️ 문서가 삭제되었습니다.");
            return;
        }

        try {
            logger.info(`📊 팀별 집계 시작: ${teamId}`);

            // 팀 임계치 설정 가져오기 (있으면 우선 적용)
            const teamDoc = await db.collection("teams").doc(teamId).get();
            const teamData = teamDoc.data();
            const thresholds = teamData?.thresholds || DEFAULT_THRESH;

            // 최근 24시간 데이터 집계
            const since24h = new Date();
            since24h.setHours(since24h.getHours() - 24);

            const q24 = await db.collectionGroup("qualityReports")
                .where("createdAt", ">=", since24h)
                .get();

            let scoreSum = 0;
            let covSum = 0;
            let gaps = 0;
            let overlaps = 0;
            let cnt = 0;

            q24.forEach((d) => {
                const refPath = d.ref.path;
                if (!refPath.includes(`teams/${teamId}/`)) return;

                const m = (d.data() as any)?.metrics || {};
                scoreSum += Number(m.overallScore || 0);
                covSum += Number(m.coverage || 0);
                gaps += Number(m.gaps || 0);
                overlaps += Number(m.overlaps || 0);
                cnt++;
            });

            const avgScore24 = cnt ? scoreSum / cnt : 0;
            const avgCov24 = cnt ? covSum / cnt : 0;

            // 전일 대비 계산 (최근 7일)
            const since7d = new Date();
            since7d.setDate(since7d.getDate() - 7);

            const q7 = await db.collectionGroup("qualityReports")
                .where("createdAt", ">=", since7d)
                .get();

            let byDay: Record<string, { score: number; n: number }> = {};

            q7.forEach((d) => {
                const refPath = d.ref.path;
                if (!refPath.includes(`teams/${teamId}/`)) return;

                const m = (d.data() as any)?.metrics || {};
                const createdAt = (d.data() as any)?.createdAt;
                let dt: string;

                if (createdAt?.toDate) {
                    dt = createdAt.toDate().toISOString().slice(0, 10);
                } else if (createdAt?._seconds) {
                    dt = new Date(createdAt._seconds * 1000).toISOString().slice(0, 10);
                } else {
                    dt = new Date().toISOString().slice(0, 10);
                }

                byDay[dt] = byDay[dt] || { score: 0, n: 0 };
                byDay[dt].score += Number(m.overallScore || 0);
                byDay[dt].n++;
            });

            const days = Object.keys(byDay).sort();
            const today = days[days.length - 1];
            const prev = days[days.length - 2];

            const todayAvg = today && byDay[today].n > 0 ? byDay[today].score / byDay[today].n : 0;
            const prevAvg = prev && byDay[prev].n > 0 ? byDay[prev].score / byDay[prev].n : 0;
            const drop = prevAvg > 0 ? Math.max(0, prevAvg - todayAvg) : 0;

            // 알림 조건 판단
            const alerts: string[] = [];

            if (drop >= thresholds.scoreDrop) {
                alerts.push(`점수 급락: -${drop.toFixed(2)} (전일 ${prevAvg.toFixed(2)} → 금일 ${todayAvg.toFixed(2)})`);
            }

            if (avgCov24 < thresholds.coverageMin) {
                alerts.push(`커버리지 저하: ${(avgCov24 * 100).toFixed(1)}% (< ${(thresholds.coverageMin * 100).toFixed(0)}%)`);
            }

            if (gaps > thresholds.gapMax) {
                alerts.push(`Gaps 과다: ${gaps} (> ${thresholds.gapMax})`);
            }

            if (overlaps > thresholds.overlapMax) {
                alerts.push(`Overlaps 과다: ${overlaps} (> ${thresholds.overlapMax})`);
            }

            // 팀 문서에 집계 업데이트
            await db.collection("teams").doc(teamId).set({
                metrics: {
                    lastScore: todayAvg || avgScore24,
                    lastCoverage: avgCov24,
                    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                rollup24h: {
                    avgScore: avgScore24,
                    avgCoverage: avgCov24,
                    gaps,
                    overlaps,
                    count: cnt,
                },
            }, { merge: true });

            // 알림 발송
            if (alerts.length > 0) {
                const teamName = teamData?.name || teamId;
                const text = `🚨 *팀 알림* (${teamName})\n` + alerts.map((a) => `• ${a}`).join("\n");

                // 팀별 알림 수신 대상 가져오기
                const alertTargets = teamData?.alertTargets || {};
                const emails = alertTargets.emails || [ALERT_EMAIL_TO];
                const phones = alertTargets.phones || [ALERT_PHONE].filter(Boolean);

                // Slack 발송
                if (SLACK_WEBHOOK) {
                    try {
                        await fetch(SLACK_WEBHOOK, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text }),
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
                                subject: `[YAGO] 팀 알림: ${teamName}`,
                                text: text.replace(/\*/g, ""), // Slack 마크다운 제거
                            });
                        }
                        logger.info("✅ Email 알림 발송 완료");
                    } catch (error) {
                        logger.error("❌ Email 알림 발송 실패:", error);
                    }
                }

                // SMS 발송 (Twilio)
                if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && phones.length > 0) {
                    try {
                        const authHeader = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
                        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;

                        for (const phone of phones) {
                            const body = new URLSearchParams({
                                To: phone,
                                From: TWILIO_FROM,
                                Body: text.replace(/\*/g, "").replace(/•/g, "-"),
                            });

                            await fetch(url, {
                                method: "POST",
                                headers: {
                                    "Authorization": `Basic ${authHeader}`,
                                    "Content-Type": "application/x-www-form-urlencoded",
                                },
                                body: body.toString(),
                            });
                        }
                        logger.info("✅ SMS 알림 발송 완료");
                    } catch (error) {
                        logger.error("❌ SMS 알림 발송 실패:", error);
                    }
                }

                // 팀 감사 로그 기록
                await db.collection("teams").doc(teamId).collection("alerts").add({
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: "threshold",
                    messages: alerts,
                    snapshot: {
                        todayAvg,
                        prevAvg,
                        avgCov24,
                        gaps,
                        overlaps,
                    },
                });

                logger.info(`✅ 알림 발송 완료: ${alerts.length}개 알림`);
            }

        } catch (error: any) {
            logger.error("❌ 팀별 집계 오류:", error);
            throw error;
        }
    }
);

/**
 * Step 44: 시간별 팀 집계 및 알림 (선택적)
 * 매 시간마다 실행하여 누락된 알림을 보완
 */
export const hourlyTeamRollupAndAlert = onSchedule(
    {
        schedule: "every 1 hours",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("⏰ 시간별 팀 집계 시작...");

            // 모든 팀 조회
            const teams = await db.collection("teams").get();

            for (const teamDoc of teams.docs) {
                const teamId = teamDoc.id;
                const teamData = teamDoc.data();
                const thresholds = teamData?.thresholds || DEFAULT_THRESH;

                // 최근 24시간 데이터 집계
                const since24h = new Date();
                since24h.setHours(since24h.getHours() - 24);

                const q24 = await db.collectionGroup("qualityReports")
                    .where("createdAt", ">=", since24h)
                    .get();

                let scoreSum = 0;
                let covSum = 0;
                let gaps = 0;
                let overlaps = 0;
                let cnt = 0;

                q24.forEach((d) => {
                    const refPath = d.ref.path;
                    if (!refPath.includes(`teams/${teamId}/`)) return;

                    const m = (d.data() as any)?.metrics || {};
                    scoreSum += Number(m.overallScore || 0);
                    covSum += Number(m.coverage || 0);
                    gaps += Number(m.gaps || 0);
                    overlaps += Number(m.overlaps || 0);
                    cnt++;
                });

                const avgScore24 = cnt ? scoreSum / cnt : 0;
                const avgCov24 = cnt ? covSum / cnt : 0;

                // 전일 대비 계산
                const since7d = new Date();
                since7d.setDate(since7d.getDate() - 7);

                const q7 = await db.collectionGroup("qualityReports")
                    .where("createdAt", ">=", since7d)
                    .get();

                let byDay: Record<string, { score: number; n: number }> = {};

                q7.forEach((d) => {
                    const refPath = d.ref.path;
                    if (!refPath.includes(`teams/${teamId}/`)) return;

                    const m = (d.data() as any)?.metrics || {};
                    const createdAt = (d.data() as any)?.createdAt;
                    let dt: string;

                    if (createdAt?.toDate) {
                        dt = createdAt.toDate().toISOString().slice(0, 10);
                    } else if (createdAt?._seconds) {
                        dt = new Date(createdAt._seconds * 1000).toISOString().slice(0, 10);
                    } else {
                        dt = new Date().toISOString().slice(0, 10);
                    }

                    byDay[dt] = byDay[dt] || { score: 0, n: 0 };
                    byDay[dt].score += Number(m.overallScore || 0);
                    byDay[dt].n++;
                });

                const days = Object.keys(byDay).sort();
                const today = days[days.length - 1];
                const prev = days[days.length - 2];

                const todayAvg = today && byDay[today].n > 0 ? byDay[today].score / byDay[today].n : 0;
                const prevAvg = prev && byDay[prev].n > 0 ? byDay[prev].score / byDay[prev].n : 0;
                const drop = prevAvg > 0 ? Math.max(0, prevAvg - todayAvg) : 0;

                // 알림 조건 판단
                const alerts: string[] = [];

                if (drop >= thresholds.scoreDrop) {
                    alerts.push(`점수 급락: -${drop.toFixed(2)} (전일 ${prevAvg.toFixed(2)} → 금일 ${todayAvg.toFixed(2)})`);
                }

                if (avgCov24 < thresholds.coverageMin) {
                    alerts.push(`커버리지 저하: ${(avgCov24 * 100).toFixed(1)}% (< ${(thresholds.coverageMin * 100).toFixed(0)}%)`);
                }

                if (gaps > thresholds.gapMax) {
                    alerts.push(`Gaps 과다: ${gaps} (> ${thresholds.gapMax})`);
                }

                if (overlaps > thresholds.overlapMax) {
                    alerts.push(`Overlaps 과다: ${overlaps} (> ${thresholds.overlapMax})`);
                }

                // 팀 문서에 집계 업데이트
                await db.collection("teams").doc(teamId).set({
                    metrics: {
                        lastScore: todayAvg || avgScore24,
                        lastCoverage: avgCov24,
                        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    rollup24h: {
                        avgScore: avgScore24,
                        avgCoverage: avgCov24,
                        gaps,
                        overlaps,
                        count: cnt,
                    },
                }, { merge: true });

                // 알림 발송 (알림이 있고, 최근 1시간 내 발송한 적이 없을 때만)
                if (alerts.length > 0) {
                    const oneHourAgo = new Date();
                    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

                    const recentAlerts = await db.collection("teams").doc(teamId).collection("alerts")
                        .where("createdAt", ">=", oneHourAgo)
                        .where("type", "==", "threshold")
                        .limit(1)
                        .get();

                    if (recentAlerts.empty) {
                        const teamName = teamData?.name || teamId;
                        const text = `🚨 *팀 알림* (${teamName})\n` + alerts.map((a) => `• ${a}`).join("\n");

                        const alertTargets = teamData?.alertTargets || {};
                        const emails = alertTargets.emails || [ALERT_EMAIL_TO];
                        const phones = alertTargets.phones || [ALERT_PHONE].filter(Boolean);

                        // Slack, Email, SMS 발송 (위와 동일)
                        if (SLACK_WEBHOOK) {
                            await fetch(SLACK_WEBHOOK, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ text }),
                            });
                        }

                        if (MAIL_USER && MAIL_PASS) {
                            const transporter = nodemailer.createTransport({
                                service: "gmail",
                                auth: { user: MAIL_USER, pass: MAIL_PASS },
                            });

                            for (const email of emails) {
                                await transporter.sendMail({
                                    from: MAIL_USER,
                                    to: email,
                                    subject: `[YAGO] 팀 알림: ${teamName}`,
                                    text: text.replace(/\*/g, ""),
                                });
                            }
                        }

                        if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && phones.length > 0) {
                            const authHeader = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
                            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;

                            for (const phone of phones) {
                                const body = new URLSearchParams({
                                    To: phone,
                                    From: TWILIO_FROM,
                                    Body: text.replace(/\*/g, "").replace(/•/g, "-"),
                                });

                                await fetch(url, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Basic ${authHeader}`,
                                        "Content-Type": "application/x-www-form-urlencoded",
                                    },
                                    body: body.toString(),
                                });
                            }
                        }

                        // 알림 로그 기록
                        await db.collection("teams").doc(teamId).collection("alerts").add({
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            type: "threshold",
                            messages: alerts,
                            snapshot: { todayAvg, prevAvg, avgCov24, gaps, overlaps },
                        });
                    }
                }
            }

            logger.info("✅ 시간별 팀 집계 완료");
        } catch (error: any) {
            logger.error("❌ 시간별 팀 집계 오류:", error);
            throw error;
        }
    }
);

