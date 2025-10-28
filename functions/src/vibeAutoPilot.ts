import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

// ✅ Firestore 컬렉션 'logs'에 새 문서가 생성될 때 실행
export const vibeAutoPilot = onDocumentCreated("logs/{logId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const logId = event.params.logId;

    console.log("🧠 vibeAutoPilot 실행됨:", logId, data);

    // 예시: n8n 또는 AI 엔진으로 자동 분석 트리거
    const summary = `🔥 [AutoPilot] ${data.user || "unknown"}가 남긴 로그 분석 완료`;

    await admin.firestore().collection("analysis").doc(logId).set({
        summary,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ 분석 결과 저장 완료");
});

