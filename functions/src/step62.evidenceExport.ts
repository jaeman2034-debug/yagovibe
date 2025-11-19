import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 62: Export Audit For Subject - 데이터 주체 요청(DSAR) 대응
 * GET /exportAuditForSubject?uid=USER_UID&format=json|csv
 */
export const exportAuditForSubject = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { uid, format = "json" } = req.query as any;

            if (!uid) {
                res.status(400).json({ error: "uid is required" });
                return;
            }

            logger.info("📦 감사 로그 내보내기:", { uid, format });

            // 해당 사용자와 관련된 모든 로그 조회
            const actorQuery = await db
                .collection("auditLogs")
                .where("actor.uid", "==", uid)
                .orderBy("ts", "desc")
                .limit(1000)
                .get();

            const subjectQuery = await db
                .collection("auditLogs")
                .where("subject.uid", "==", uid)
                .orderBy("ts", "desc")
                .limit(1000)
                .get();

            const allLogs = new Map<string, any>();

            // Actor 로그
            actorQuery.docs.forEach((doc) => {
                const data = doc.data();
                if (data.ts?.toDate) {
                    data.ts = data.ts.toDate();
                }
                allLogs.set(doc.id, { id: doc.id, ...data, relation: "actor" });
            });

            // Subject 로그
            subjectQuery.docs.forEach((doc) => {
                const data = doc.data();
                if (data.ts?.toDate) {
                    data.ts = data.ts.toDate();
                }
                if (!allLogs.has(doc.id)) {
                    allLogs.set(doc.id, { id: doc.id, ...data, relation: "subject" });
                }
            });

            const logs = Array.from(allLogs.values());

            // 형식별 처리
            if (format === "csv") {
                // CSV 형식
                const headers = ["id", "timestamp", "action", "actor.uid", "subject.teamId", "relation"];
                const rows = logs.map((log) => [
                    log.id,
                    log.ts?.toISOString() || "",
                    log.action || "",
                    log.actor?.uid || "",
                    log.subject?.teamId || "",
                    log.relation || "",
                ]);

                const csv = [
                    headers.join(","),
                    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
                ].join("\n");

                res.setHeader("Content-Type", "text/csv");
                res.setHeader("Content-Disposition", `attachment; filename="audit-export-${uid}-${Date.now()}.csv"`);
                res.send(csv);
            } else {
                // JSON 형식 (기본)
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Content-Disposition", `attachment; filename="audit-export-${uid}-${Date.now()}.json"`);
                res.json({
                    uid,
                    exportedAt: new Date().toISOString(),
                    count: logs.length,
                    logs,
                });
            }
        } catch (error: any) {
            logger.error("❌ 감사 로그 내보내기 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

