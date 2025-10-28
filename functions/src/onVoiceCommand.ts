import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

// Firebase Admin 초기화
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * 🎤 onVoiceCommand (OpenAI 연동 버전)
 * Firestore의 voice_commands/{commandId} 문서가 생성될 때마다 실행됨
 */
export const onVoiceCommand = onDocumentCreated(
    "voice_commands/{commandId}",
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const data = snap.data();
        const { text, userId } = data;
        const commandId = event.params.commandId;

        console.log("🎧 음성 명령 수신:", text);

        try {
            // ✅ OpenAI API 호출
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "당신은 YAGO VIBE 스포츠 어시스턴트입니다. 사용자의 음성 명령을 분석하고 간결하게 답변하세요.",
                        },
                        {
                            role: "user",
                            content: text,
                        },
                    ],
                    temperature: 0.7,
                }),
            });

            const result: any = await response.json();
            const summary = result.choices?.[0]?.message?.content || "AI 응답 없음";

            // ✅ Firestore에 결과 저장
            await admin.firestore().collection("voice_analysis").doc(commandId).set({
                userId,
                originalText: text,
                aiResult: { summary },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log("✅ AI 응답 저장 완료:", summary);
        } catch (err) {
            console.error("❌ onVoiceCommand 오류:", err);
        }
    }
);
