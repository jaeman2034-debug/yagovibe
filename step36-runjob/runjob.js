import fetch from "node-fetch";
import admin from "firebase-admin";

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.PROJECT_ID;
const LOCATION = process.env.LOCATION || "asia-northeast3";
const FUNCTIONS_ORIGIN = process.env.FUNCTIONS_ORIGIN || `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net`;
const SERVICE_ACCOUNT = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// 기준: 최근 24시간 내 업데이트되었고, lastProcessedAt이 없거나 오래된 리포트 수집
const SINCE_MS = 24 * 60 * 60 * 1000;

async function main() {
    const now = Date.now();
    const since = new Date(now - SINCE_MS);
    const snap = await db.collection("reports").where("createdAt", ">=", since).get();

    const candidates = [];
    snap.forEach(doc => {
        const d = doc.data();
        const need = !d.lastProcessedAt || 
            (d.lastProcessedAt.toMillis ? 
                (now - d.lastProcessedAt.toMillis()) > SINCE_MS : 
                (now - new Date(d.lastProcessedAt).getTime()) > SINCE_MS);
        if (need) candidates.push(doc.id);
    });

    if (candidates.length === 0) {
        console.log("No candidates. Exit.");
        return;
    }

    const url = `${FUNCTIONS_ORIGIN}/enqueueReportProcessing`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds: candidates })
    });

    if (!res.ok) {
        console.error("enqueue failed", await res.text());
        process.exit(2);
    }

    console.log("enqueued", candidates.length, "reports");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

