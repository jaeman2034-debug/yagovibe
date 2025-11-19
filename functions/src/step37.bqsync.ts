import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery();
const DATASET = "yago_reports";
const TABLE = "quality_metrics";

/**
 * Step 37: Firestore → BigQuery 동기화
 * reports/{reportId}/qualityReports/{reportTs} 생성 시 자동으로 BigQuery에 적재
 */
export const syncQualityToBigQuery = onDocumentWritten(
    {
        document: "reports/{reportId}/qualityReports/{reportTs}",
        region: "asia-northeast3",
    },
    async (event) => {
        const reportId = event.params.reportId;
        const reportTs = event.params.reportTs;
        const after = event.data?.after?.data();

        if (!after) {
            console.log("⚠️ 문서가 삭제되었거나 데이터가 없습니다.");
            return;
        }

        try {
            // Firestore Timestamp를 Date로 변환
            let createdAt: Date;
            if (after.createdAt?.toDate) {
                createdAt = after.createdAt.toDate();
            } else if (after.createdAt?._seconds) {
                createdAt = new Date(after.createdAt._seconds * 1000);
            } else if (after.createdAt instanceof Date) {
                createdAt = after.createdAt;
            } else {
                createdAt = new Date();
            }

            const row = {
                report_id: reportId,
                created_at: createdAt,
                coverage: after.metrics?.coverage || 0,
                gaps: after.metrics?.gaps || 0,
                overlaps: after.metrics?.overlaps || 0,
                avgDur: after.metrics?.avgDur || 0,
                overallScore: after.metrics?.overallScore || 0,
                source: "CloudTasks",
            };

            await bq.dataset(DATASET).table(TABLE).insert([row]);
            console.log(`✅ BigQuery inserted: ${reportId} -> ${TABLE}`);
        } catch (error: any) {
            console.error("❌ BigQuery insert 오류:", error);
            // BigQuery 에러는 재시도 가능하므로 로그만 남기고 예외 전파하지 않음
        }
    }
);

