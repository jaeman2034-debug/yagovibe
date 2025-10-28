import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Firebase Admin 초기화 (중복 초기화 방지)
if (!admin.apps.length) {
    admin.initializeApp();
}

export const vibeLog = functions.https.onRequest(async (req, res) => {
    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    // POST 요청만 처리
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }

    try {
        const body = req.body;

        // 로그 데이터 구조화
        const logData = {
            type: body.type || "unknown",
            command: body.command || "",
            timestamp: body.timestamp || Date.now(),
            result: body.result || false,
            message: body.message || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Firestore 'logs' 컬렉션에 저장
        await admin.firestore().collection("logs").add(logData);

        console.log("✅ 로그 저장 완료:", logData);

        res.status(200).json({
            success: true,
            message: "Log saved successfully"
        });
    } catch (error) {
        console.error("❌ vibeLog 에러:", error);
        res.status(500).json({
            success: false,
            error: String(error)
        });
    }
});

