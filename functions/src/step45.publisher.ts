import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PubSub } from "@google-cloud/pubsub";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const pubsub = new PubSub();
const TOPIC = process.env.PUBSUB_TOPIC || "yago-quality-events";

/**
 * Step 45: Firestore → Pub/Sub Publisher
 * teams/{teamId}/reports/{reportId}/qualityReports/{ts} 생성 시
 * Pub/Sub 토픽으로 이벤트 발행
 */
export const publishQualityEvent = onDocumentWritten(
    {
        document: "teams/{teamId}/reports/{reportId}/qualityReports/{ts}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const { teamId, reportId, ts } = event.params;
            const after = event.data?.after?.data();

            // 삭제 이벤트는 무시
            if (!after || !after.metrics) {
                logger.info("⚠️ 문서 삭제 또는 metrics 없음, 무시");
                return;
            }

            // createdAt 추출
            let createdAt: Date;
            if (after.createdAt?.toDate) {
                createdAt = after.createdAt.toDate();
            } else if (after.createdAt?._seconds) {
                createdAt = new Date(after.createdAt._seconds * 1000);
            } else {
                createdAt = new Date();
            }

            const m = after.metrics || {};

            // idempotent key 생성
            const insert_id = `${teamId}-${reportId}-${ts}`;

            // Pub/Sub 페이로드 구성
            const payload = {
                insert_id,
                team_id: teamId,
                report_id: reportId,
                event_ts: createdAt.toISOString(),
                overallScore: Number(m.overallScore || 0),
                coverage: Number(m.coverage || 0),
                gaps: Number(m.gaps || 0),
                overlaps: Number(m.overlaps || 0),
                avgDur: Number(m.avgDur || 0),
                source: "stream",
            };

            // Pub/Sub 메시지 발행
            const dataBuffer = Buffer.from(JSON.stringify(payload));
            const messageId = await pubsub.topic(TOPIC).publishMessage({
                data: dataBuffer,
                attributes: {
                    insert_id,
                    team_id: teamId,
                    report_id: reportId,
                },
            });

            logger.info(`✅ Pub/Sub 메시지 발행 완료: ${insert_id} (messageId: ${messageId})`);
        } catch (error: any) {
            logger.error("❌ Pub/Sub 메시지 발행 실패:", error);
            // 에러를 throw하지 않음 (Firestore 트리거는 재시도하지 않으므로)
            // 대신 DLQ로 처리되도록 함
        }
    }
);

