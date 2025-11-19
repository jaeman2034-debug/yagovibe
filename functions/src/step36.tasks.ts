import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Cloud Tasks Client는 동적 import로 로드
let tasksClient: any = null;
async function getTasksClient() {
    if (!tasksClient) {
        const { CloudTasksClient } = await import("@google-cloud/tasks");
        tasksClient = new CloudTasksClient();
    }
    return tasksClient;
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || "yago-vibe-spt";
const LOCATION = "asia-northeast3";
const QUEUE_NAME = "report-processing";
const FUNCTIONS_ORIGIN = `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net`;

/**
 * Step 36: 리포트 처리 큐 등록
 * POST /enqueueReportProcessing
 * Body: { reportIds: string[] }
 */
export const enqueueReportProcessing = onRequest(
    {
        region: LOCATION,
        cors: true,
    },
    async (req, res) => {
        try {
            const { reportIds } = req.body || {};
            
            if (!Array.isArray(reportIds) || reportIds.length === 0) {
                res.status(400).json({ error: "reportIds array is required" });
                return;
            }

            logger.info("📥 큐 등록 시작:", { count: reportIds.length });

            const client = await getTasksClient();
            const queuePath = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

            const tasks = [];
            for (const reportId of reportIds) {
                const task = {
                    httpRequest: {
                        httpMethod: "POST" as const,
                        url: `${FUNCTIONS_ORIGIN}/processReportTask`,
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: Buffer.from(JSON.stringify({ reportId })).toString("base64"),
                    },
                };

                const [response] = await client.createTask({
                    parent: queuePath,
                    task,
                });

                tasks.push(response.name);
                logger.info(`✅ Task 생성: ${reportId}`, { taskName: response.name });
            }

            res.status(200).json({
                ok: true,
                enqueued: tasks.length,
                tasks,
            });
        } catch (e: any) {
            logger.error("큐 등록 오류:", e);
            res.status(500).json({ error: e?.message || "enqueue error" });
        }
    }
);

/**
 * Step 36: 리포트 처리 작업 핸들러
 * POST /processReportTask
 * Body: { reportId: string }
 */
export const processReportTask = onRequest(
    {
        region: LOCATION,
        cors: true,
    },
    async (req, res) => {
        try {
            const { reportId } = req.body || {};
            
            if (!reportId) {
                res.status(400).json({ error: "reportId is required" });
                return;
            }

            logger.info("📊 리포트 처리 시작:", { reportId });

            // Firestore에서 리포트 데이터 가져오기
            const reportDoc = await db.collection("reports").doc(reportId).get();
            
            if (!reportDoc.exists) {
                res.status(404).json({ error: "Report not found" });
                return;
            }

            const reportData = reportDoc.data();
            const content = reportData?.content || reportData?.summary || "";
            const sentenceTimestamps = reportData?.sentenceTimestamps || [];

            if (!content) {
                res.status(400).json({ error: "Content is required" });
                return;
            }

            // 품질 측정
            const metrics = computeQualityMetrics(content, sentenceTimestamps);

            // 결과 저장: reports/{id}/qualityReports/{ts}
            const ts = Date.now();
            await db.collection("reports").doc(reportId).collection("qualityReports").doc(String(ts)).set({
                createdAt: new Date(ts),
                metrics,
                status: "OK",
            });

            // 최종 인덱스 필드 업데이트(최근 스코어)
            await db.collection("reports").doc(reportId).set({
                lastQualityScore: metrics.overallScore,
                lastProcessedAt: new Date(ts),
            }, { merge: true });

            logger.info("✅ 처리 완료:", { reportId, score: metrics.overallScore });

            res.status(200).json({ ok: true, metrics });
        } catch (e: any) {
            logger.error("처리 오류:", e);
            res.status(500).json({ error: e?.message || "process error" });
        }
    }
);

// ===== 간단 품질 측정 로직 =====
function computeQualityMetrics(content: string, stamps: Array<{start: number; end: number}>) {
    const sentences = splitSentences(content);
    const n = sentences.length;
    const m = stamps.length;

    const coverage = n === 0 ? 0 : Math.min(m / n, 1);
    let gaps = 0, overlaps = 0, totalDur = 0, segs = 0;
    let prevEnd = 0;

    for (let i = 0; i < m; i++) {
        const s = stamps[i];
        if (s.end < s.start) overlaps += 1; // 역전도 overlap 카운트에 포함
        if (s.start > prevEnd + 0.4) gaps += 1; // 0.4s 이상 공백
        if (i > 0 && s.start < prevEnd) overlaps += 1;
        totalDur += Math.max(0, s.end - s.start);
        prevEnd = Math.max(prevEnd, s.end);
        segs += 1;
    }

    const avgDur = segs ? totalDur / segs : 0;

    // 간단 점수: 커버리지 60%, 겹침/갭 패널티 30%, 평균 길이 안정성 10%
    let score = 0.6 * coverage;
    const penalty = Math.min(1, (gaps + overlaps) / Math.max(1, m));
    score += 0.4 * (1 - penalty);
    const ideal = 2.5; // 이상적인 문장 길이(초)
    const stable = Math.max(0, 1 - Math.abs(avgDur - ideal) / ideal);
    score = score * 0.9 + stable * 0.1;

    return {
        sentences: n,
        segments: m,
        coverage: round2(coverage),
        gaps,
        overlaps,
        avgDur: round2(avgDur),
        overallScore: round2(score)
    };
}

function splitSentences(content: string) {
    return (content || "")
        .replace(/\n+/g, "\n")
        .trim()
        .split(/(?<=[.!?。！？]|\n|다\.|요\.|죠\.|습니다\.|됨\.|됨\?|함\.|함\?|임\.|임\?|함니다\.|까\?|니\?|요\?|죠\?)\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function round2(x: number) {
    return Math.round(x * 100) / 100;
}

