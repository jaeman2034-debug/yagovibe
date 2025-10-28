import * as functions from "firebase-functions";
import fetch from "node-fetch";

export const slackShare = functions.https.onRequest(async (req, res) => {
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
        const { text } = req.body;
        const url = functions.config().slack?.webhook;

        if (!url) {
            throw new Error("Slack webhook missing");
        }

        console.log("📱 Slack 전송:", text);

        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });

        res.status(200).json({
            success: true,
            message: "Slack message sent successfully"
        });
    } catch (err) {
        console.error("❌ slackShare 에러:", err);
        res.status(500).json({
            success: false,
            error: String(err)
        });
    }
});

