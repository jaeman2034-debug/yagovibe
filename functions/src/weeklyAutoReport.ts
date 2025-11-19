import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import OpenAI from "openai";

/**
 * 🕘 주간 자동 리포트 생성
 * 매주 월요일 오전 9시에 자동으로 실행
 * - Firestore 로그 분석
 * - OpenAI 요약 생성
 * - TTS 음성 생성
 * - Firebase Storage 업로드
 * - Slack 알림 발송
 */
export const weeklyAutoReport = functions.scheduler.onSchedule(
    {
        schedule: "0 9 * * 1", // 매주 월요일 09:00
        timeZone: "Asia/Seoul",
    },
    async (event) => {
        console.log("🕘 [AutoReport] 매주 월요일 리포트 생성 시작...");
        console.log("⏰ 실행 시간:", event.scheduleTime);

        try {
            // 1️⃣ Firebase Admin 초기화 (이미 초기화되어 있음)
            const db = admin.firestore();
            const bucket = admin.storage().bucket();

            // 2️⃣ 지난 주 로그 수집
            const logsQuery = db.collection("logs")
                .orderBy("timestamp", "desc")
                .limit(100);
            const logsSnap = await logsQuery.get();
            const logs = logsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`📊 수집된 로그: ${logs.length}개`);

            // 3️⃣ OpenAI API 키 확인
            const openaiKey = process.env.OPENAI_API_KEY;
            if (!openaiKey) {
                throw new Error("OpenAI API 키가 설정되지 않았습니다.");
            }

            const openai = new OpenAI({ apiKey: openaiKey });

            // 4️⃣ OpenAI 요약 생성
            const logsText = logs.slice(0, 50).map((log: any) =>
                `- ${log.text || ""} (${log.intent || "미확인"})`
            ).join("\n");

            const prompt = `다음은 YAGO VIBE 지난 주 사용자 활동 로그입니다:

${logsText}

行业内주간 리포트를 작성해주세요:
1. 주간 활동 요약
2. 주요 인사이트
3. 향후 추천 액션

한국어로 3-5문장으로 작성하세요.`;

            console.log("🤖 OpenAI 요약 생성 중...");
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "당신은 YAGO VIBE 주간 리포트 요약 분석 전문가입니다."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const summary = completion.choices[0]?.message?.content || "요약 생성 실패";
            console.log("✅ 요약 생성 완료:", summary.slice(0, 100));

            // 5️⃣ Firestore에 리포트 저장
            const reportDate = new Date().toISOString().split('T')[0];
            const reportRef = await db.collection("auto_reports").add({
                date: reportDate,
                report: summary,
                success: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                logCount: logs.length
            });

            console.log("📝 Firestore 저장 완료:", reportRef.id);

            // 6️⃣ TTS 음성 생성
            console.log("🎤 TTS 음성 생성 중...");
            const ttsResponse = await openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: `이번 주 YAGO VIBE 주간 리포트입니다. ${summary}`
            });

            const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
            const audioFilename = `weekly/audio/${reportDate}.mp3`;
            const audioFile = bucket.file(audioFilename);

            await audioFile.save(audioBuffer, {
                metadata: { contentType: "audio/mpeg" }
            });

            // 7️⃣ Storage URL 생성
            await audioFile.makePublic();
            const audioUrl = `https://storage.googleapis.com/${bucket.name}/${audioFilename}`;

            // 8️⃣ Firestore에 audioUrl 업데이트
            await reportRef.update({ audioUrl });

            console.log("🎧 음성 파일 업로드 완료:", audioUrl);

            // 9️⃣ Slack 알림 발송
            const slackWebhook = process.env.SLACK_WEBHOOK_URL || process.env.VITE_SLACK_WEBHOOK_URL;
            if (slackWebhook) {
                console.log("📱 Slack 알림 발송 중...");
                await fetch(slackWebhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: "📊 *이번 주 YAGO VIBE AI 자동 리포트가 도착했습니다!*",
                        attachments: [
                            {
                                color: "#36a64f",
                                fields: [
                                    {
                                        title: "📅 리포트 날짜",
                                        value: reportDate,
                                        short: true
                                    },
                                    {
                                        title: "📝 로그 분석 수",
                                        value: `${logs.length}개`,
                                        short: true
                                    },
                                    {
                                        title: "📄 요약",
                                        value: summary.slice(0, 400) + (summary.length > 400 ? "..." : ""),
                                        short: false
                                    },
                                    {
                                        title: "🎧 음성 브리핑 듣기",
                                        value: `<${audioUrl}|클릭하여 듣기>`,
                                        short: false
                                    }
                                ]
                            }
                        ]
                    })
                });
                console.log("✅ Slack 전송 완료");
            } else {
                console.warn("⚠️ Slack Webhook이 설정되지 않았습니다.");
            }

            console.log("🎉 [AutoReport] 모든 작업 완료!");
            // v2 scheduler는 void 반환 필요

        } catch (error) {
            console.error("❌ [AutoReport] 오류 발생:", error);

            // 에러 발생 시 Slack 알림
            const slackWebhook = process.env.SLACK_WEBHOOK_URL || process.env.VITE_SLACK_WEBHOOK_URL;
            if (slackWebhook) {
                try {
                    await fetch(slackWebhook, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: "🚨 *YAGO VIBE 자동 리포트 생성 실패!*",
                            attachments: [
                                {
                                    color: "#ff0000",
                                    fields: [
                                        {
                                            title: "오류",
                                            value: error instanceof Error ? error.message : String(error),
                                            short: false
                                        }
                                    ]
                                }
                            ]
                        })
                    });
                } catch (slackError) {
                    console.error("Slack 에러 전송 실패:", slackError);
                }
            }

            throw error;
        }
    }
);

