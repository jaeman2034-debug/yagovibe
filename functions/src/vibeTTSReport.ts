import { onDocumentCreated } from "firebase-functions/v2/firestore";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

/**
 * 🎤 TTS 리포트 자동 낭독 함수
 * 리포트가 생성될 때 자동으로 TTS 변환
 */
export const vibeTTSReport = onDocumentCreated(
    "auto_reports/{reportId}",
    async (event) => {
        const snap = event.data;
        if (!snap) return;
        const data = snap.data();
        if (!data?.report) {
            console.log("⚠️ 리포트 텍스트가 없습니다.");
            return;
        }

        console.log("🎤 [TTS] 리포트 낭독 생성 중...");

        try {
            // OpenAI TTS API 호출
            const response = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "tts-1",
                    voice: "alloy",
                    input: `이번 주 YAGO SPORTS 리포트입니다. ${data.report}`,
                }),
            });

            if (!response.ok) {
                throw new Error(`TTS API 오류: ${response.status}`);
            }

            // 오디오 버퍼 변환
            const audioBuffer = Buffer.from(await response.arrayBuffer());
            const filename = `reports/audio/${snap.id}.mp3`;

            // Firebase Storage 업로드
            const bucket = admin.storage().bucket();
            const file = bucket.file(filename);
            await file.save(audioBuffer, {
                metadata: { contentType: "audio/mpeg" },
            });

            // 다운로드 URL 생성
            await file.makePublic();
            const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;

            // Firestore 업데이트
            await snap.ref.update({ audioUrl: url });

            console.log("✅ [TTS] 오디오 생성 완료:", url);
        } catch (err) {
            console.error("❌ TTS 생성 실패:", err);
            // 실패해도 리포트는 정상 작동하도록 에러 로그만 기록
        }
    }
);

