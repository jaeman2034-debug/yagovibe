import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 68: Gap To Backlog - 텔레메트리 임계치 미달 항목을 백로그에 추가
 * 매일 01:00에 실행
 */
export const gapToBacklog = onSchedule(
    {
        schedule: "every day 01:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("📋 개선 백로그 생성 시작");

            const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const qs = await db.collection("telemetryDaily").where("day", "==", day).get();

            if (qs.empty) {
                logger.info("⚠️ 텔레메트리 데이터가 없습니다.");
                return;
            }

            let backlogCount = 0;

            for (const d of qs.docs) {
                const x: any = d.data();
                const gaps: string[] = [];

                // KPI 임계치 검사
                if (x.p95 > 900) {
                    gaps.push(`GraphAsk latency > 900ms (현재: ${x.p95}ms)`);
                }

                if (x.errorRate > 0.01) {
                    gaps.push(`Error rate > 1% (현재: ${(x.errorRate * 100).toFixed(1)}%)`);
                }

                if (x.approvalRate < 0.7) {
                    gaps.push(`Approval rate < 70% (현재: ${(x.approvalRate * 100).toFixed(1)}%)`);
                }

                if (x.alertPrecision < 0.8) {
                    gaps.push(`Alert precision < 80% (현재: ${(x.alertPrecision * 100).toFixed(1)}%)`);
                }

                if (x.offlineSuccess < 0.99) {
                    gaps.push(`Offline success < 99% (현재: ${(x.offlineSuccess * 100).toFixed(1)}%)`);
                }

                // 백로그 항목 생성
                for (const gap of gaps) {
                    // 중복 체크 (같은 팀, 같은 날, 같은 gap이 이미 있는지)
                    const existing = await db
                        .collection("improvements")
                        .where("teamId", "==", x.teamId)
                        .where("day", "==", day)
                        .where("gap", "==", gap)
                        .where("status", "in", ["todo", "in_progress"])
                        .limit(1)
                        .get();

                    if (existing.empty) {
                        await db.collection("improvements").add({
                            teamId: x.teamId,
                            day,
                            gap,
                            status: "todo",
                            priority: "medium",
                            createdAt: Timestamp.now(),
                        });
                        backlogCount++;
                    }
                }
            }

            logger.info("✅ 개선 백로그 생성 완료:", { day, backlogCount });
        } catch (error: any) {
            logger.error("❌ 개선 백로그 생성 오류:", error);
        }
    }
);

