import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 68: Pilot Rollback Check - 파일럿 성공/실패 기준 검사 및 롤백
 * 매일 02:00에 실행
 */
export const pilotRollbackCheck = onSchedule(
    {
        schedule: "every day 02:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("🔍 파일럿 롤백 검사 시작");

            // 최근 5일간 텔레메트리 데이터 조회
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
            const qs = await db
                .collection("telemetryDaily")
                .where("createdAt", ">=", Timestamp.fromDate(fiveDaysAgo))
                .get();

            if (qs.empty) {
                logger.info("⚠️ 텔레메트리 데이터가 없습니다.");
                return;
            }

            const byTeam: Record<string, any[]> = {};

            // 팀별로 그룹화
            qs.docs.forEach((doc) => {
                const data = doc.data();
                const teamId = data.teamId || "unknown";
                if (!byTeam[teamId]) {
                    byTeam[teamId] = [];
                }
                byTeam[teamId].push(data);
            });

            // 팀별 KPI 검사
            for (const [teamId, days] of Object.entries(byTeam)) {
                if (days.length < 5) {
                    logger.info(`⚠️ 팀 ${teamId}: 5일 데이터 부족 (${days.length}일)`);
                    continue;
                }

                // 5일 연속 KPI 충족 여부
                const allPassed = days.every((day) => {
                    return (
                        day.p95 <= 900 &&
                        day.errorRate <= 0.01 &&
                        day.approvalRate >= 0.7 &&
                        day.alertPrecision >= 0.8 &&
                        day.offlineSuccess >= 0.99
                    );
                });

                if (allPassed) {
                    logger.info(`✅ 팀 ${teamId}: 5일 연속 KPI 충족`);
                    
                    // Step 64 rolloutAdvance 호출 (rollout.percent 증가)
                    try {
                        const functionsOrigin = process.env.FUNCTIONS_ORIGIN || 
                            "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
                        
                        await fetch(`${functionsOrigin}/rolloutAdvance`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                approvedBy: "pilot-system",
                                reason: `팀 ${teamId} 5일 연속 KPI 충족`,
                            }),
                        });
                        
                        logger.info(`✅ 팀 ${teamId}: 롤아웃 진행 요청`);
                    } catch (error) {
                        logger.error(`❌ 팀 ${teamId}: 롤아웃 진행 실패`, error);
                    }
                } else {
                    // 부분 실패: 특정 팀에서만 KPI 미달
                    const failedDays = days.filter((day) => {
                        return (
                            day.p95 > 900 ||
                            day.errorRate > 0.01 ||
                            day.approvalRate < 0.7 ||
                            day.alertPrecision < 0.8 ||
                            day.offlineSuccess < 0.99
                        );
                    });

                    if (failedDays.length > 0) {
                        logger.warn(`⚠️ 팀 ${teamId}: KPI 미달 (${failedDays.length}일)`);
                        
                        // 팀 단위 롤백 & 개선 태스크 발행
                        await db.collection("pilotRollbacks").add({
                            teamId,
                            reason: "KPI 미달",
                            failedDays: failedDays.length,
                            createdAt: Timestamp.now(),
                        });

                        // 개선 태스크 발행
                        await db.collection("improvements").add({
                            teamId,
                            day: new Date().toISOString().slice(0, 10),
                            gap: `팀 ${teamId} KPI 미달 - 롤백 필요`,
                            status: "todo",
                            priority: "high",
                            createdAt: Timestamp.now(),
                        });
                    }
                }
            }

            // 전체 실패 검사: 전반 KPI 미달
            const allTeamsFailed = Object.values(byTeam).every((days) => {
                if (days.length < 5) return false;
                return days.some((day) => {
                    return (
                        day.p95 > 900 ||
                        day.errorRate > 0.01 ||
                        day.approvalRate < 0.7 ||
                        day.alertPrecision < 0.8 ||
                        day.offlineSuccess < 0.99
                    );
                });
            });

            if (allTeamsFailed) {
                logger.error("❌ 전체 실패: 전반 KPI 미달");
                
                // 카나리아 중단
                await db.doc("policies/rollout").update({
                    paused: true,
                    pausedReason: "전반 KPI 미달",
                    pausedAt: Timestamp.now(),
                });

                // 원인 분석 태스크 발행
                await db.collection("improvements").add({
                    teamId: "all",
                    day: new Date().toISOString().slice(0, 10),
                    gap: "전반 KPI 미달 - 카나리아 중단 및 원인 분석 필요",
                    status: "todo",
                    priority: "critical",
                    createdAt: Timestamp.now(),
                });
            }

            logger.info("✅ 파일럿 롤백 검사 완료");
        } catch (error: any) {
            logger.error("❌ 파일럿 롤백 검사 오류:", error);
        }
    }
);

