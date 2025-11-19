import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 55: QA Aggregator - 일별 통계 집계
 * 매일 자정에 실행되어 qaResults를 집계하여 governance 컬렉션에 저장
 */
export const qaAggregator = onSchedule(
    {
        schedule: "every 24 hours",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("📊 QA Aggregator 시작...");

            // 최근 10개 빌드 결과 가져오기
            const qaSnap = await db
                .collection("qaResults")
                .orderBy("timestamp", "desc")
                .limit(10)
                .get();

            if (qaSnap.empty) {
                logger.info("⚠️ qaResults 데이터가 없습니다.");
                return;
            }

            const items = qaSnap.docs.map((d) => d.data());

            // 통계 계산
            const pass = items.reduce((a, b) => a + (b.testsPassed || 0), 0);
            const fail = items.reduce((a, b) => a + (b.testsFailed || 0), 0);
            const total = pass + fail;
            const rate = total > 0 ? pass / total : 0;

            const lat = items.length > 0
                ? items.reduce((a, b) => a + (b.avgLatencyMs || 0), 0) / items.length
                : 0;

            // 회귀 테스트 실패 항목 수집
            const regressions = [...new Set(items.flatMap((i) => i.regressions || []))];

            // Top Fail Cases (반복 실패 발생 명령)
            const failCases: { [key: string]: number } = {};
            items.forEach((item) => {
                const failures = item.failCases || [];
                failures.forEach((fc: string) => {
                    failCases[fc] = (failCases[fc] || 0) + 1;
                });
            });

            const topFailCases = Object.entries(failCases)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([key]) => key);

            // Copilot 신뢰지수 계산 (실패율의 역수)
            const copilotReliability = total > 0 ? 1 - fail / total : 1;

            // 오늘 날짜 (YYYY-MM-DD 형식)
            const today = new Date().toISOString().substring(0, 10);

            const doc = {
                date: today,
                passRate: Math.round(rate * 1000) / 1000, // 소수점 3자리
                regressionCount: regressions.length,
                avgLatency: Math.round(lat),
                topFailCases,
                copilotReliability: Math.round(copilotReliability * 1000) / 1000,
                lastUpdated: Timestamp.now(),
                testCount: total,
                testsPassed: pass,
                testsFailed: fail,
                regressions: regressions.slice(0, 10), // 최대 10개
            };

            await db.collection("governance").doc(doc.date).set(doc, { merge: true });

            logger.info("✅ QA Aggregator 완료:", {
                date: doc.date,
                passRate: `${(doc.passRate * 100).toFixed(1)}%`,
                reliability: `${(doc.copilotReliability * 100).toFixed(1)}%`,
                regressions: doc.regressionCount,
            });
        } catch (error: any) {
            logger.error("❌ QA Aggregator 오류:", error);
            throw error;
        }
    }
);

