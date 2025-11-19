import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * reports/weekly 문서가 갱신될 때 해당 스냅샷을
 * reports/weekly/history/{YYYY-MM-DD}에 백업 저장
 */
export const backupWeeklyReport = onDocumentUpdated(
    {
        document: "reports/weekly",
        region: "asia-northeast3",
    },
    async (event) => {
        const before = event.data?.before?.data() || {};
        const after = event.data?.after?.data() || {};

        // 내용 변화 없으면 skip
        if (JSON.stringify(after) === JSON.stringify(before)) {
            logger.info("ℹ️ 변경 사항이 없어 백업을 생략합니다.");
            return;
        }

        try {
            const dateKey = new Date().toISOString().split("T")[0]; // ex) 2025-11-03
            const historyRef = event.data!.after!.ref.collection("history").doc(dateKey);

            await historyRef.set({
                ...after,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(`✅ 리포트 백업 완료 → reports/weekly/history/${dateKey}`);
        } catch (err: any) {
            logger.error("❌ 리포트 백업 중 오류:", err.message, err.stack);
            throw err;
        }
    }
);


