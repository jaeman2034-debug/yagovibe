import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin } from "./lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import fetch from "node-fetch";
import { getDefaultStorageBucket } from "./lib/defaultStorageBucket";

const db = getFirestore();

/**
 * AI 리포트에서 점수 추출 (휴리스틱)
 */
const extractScoreFromReport = (report: string): number => {
    if (!report) return 75; // 기본값

    // 패턴 1: "85점", "90점" 형태
    const scoreMatch1 = report.match(/([0-9]{1,3})점/g);
    if (scoreMatch1) {
        const scores = scoreMatch1.map((m) => parseInt(m.replace("점", "")));
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore >= 0 && avgScore <= 100) return Math.round(avgScore);
    }

    // 패턴 2: "85%", "90%" 형태
    const scoreMatch2 = report.match(/([0-9]{1,3})%/g);
    if (scoreMatch2) {
        const scores = scoreMatch2.map((m) => parseInt(m.replace("%", "")));
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore >= 0 && avgScore <= 100) return Math.round(avgScore);
    }

    // 패턴 3: 긍정/부정 키워드 기반 점수 계산
    const positiveKeywords = ["좋", "향상", "증가", "개선", "활발", "우수", "훌륭", "성공"];
    const negativeKeywords = ["감소", "부족", "개선 필요", "주의", "낮음"];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveKeywords.forEach((keyword) => {
        const matches = report.match(new RegExp(keyword, "g"));
        if (matches) positiveCount += matches.length;
    });

    negativeKeywords.forEach((keyword) => {
        const matches = report.match(new RegExp(keyword, "g"));
        if (matches) negativeCount += matches.length;
    });

    let score = 75;
    score += positiveCount * 3;
    score -= negativeCount * 5;
    score = Math.max(60, Math.min(95, score)); // 60-95 범위로 제한

    return Math.round(score);
};

/**
 * 🏃 매월 1일 오전 9시 자동 실행 - 개인별 선수 리포트 + AI 피드백 생성 및 Slack 공유
 */
export const generatePlayerInsightReports = onSchedule(
    {
        schedule: "0 9 1 * *", // 매월 1일 오전 9시 (Cron 표현식)
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async (event) => {
        logger.info("🏃 Generating player-level AI reports...", { structuredData: true });

        try {
            const usersSnap = await db.collection("users").get();
            logger.info(`👥 총 ${usersSnap.size}명의 선수 발견`);

            if (usersSnap.empty) {
                logger.warn("⚠️ 선수가 없습니다.");
                return;
            }

            const allReports: any[] = [];
            const openaiApiKey = process.env.OPENAI_API_KEY;
            const webhookUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.yagovibe.ai/webhook/ai-report";

            // 지난달 월간 리포트 수집
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

            for (const userDoc of usersSnap.docs) {
                try {
                    const user = userDoc.data();
                    const uid = userDoc.id;
                    const nickname = user.nickname || user.name || "선수";

                    // 월간 리포트 조회
                    const reportsRef = db.collection("monthlyReports").doc(uid).collection("reports");
                    const reportsSnap = await reportsRef.get();

                    const playerReports: any[] = [];
                    for (const rep of reportsSnap.docs) {
                        const r = rep.data();
                        const score = extractScoreFromReport(r.report || "");
                        playerReports.push({ month: rep.id, score, report: r.report });
                    }

                    // 최소 2개월 이상의 데이터가 있어야 비교 가능
                    if (playerReports.length < 2) {
                        logger.info(`⚠️ ${nickname} 선수는 리포트 데이터가 부족합니다. (${playerReports.length}개월)`);
                        continue;
                    }

                    // 월별 정렬
                    const sorted = playerReports.sort((a, b) => a.month.localeCompare(b.month));
                    const latest = sorted[sorted.length - 1];
                    const prev = sorted[sorted.length - 2];

                    const diff = latest.score - prev.score;
                    const trend = diff > 0 ? "상승" : diff < 0 ? "하락" : "유지";
                    const trendEmoji = diff > 0 ? "📈" : diff < 0 ? "📉" : "➡️";

                    logger.info(`🏃 ${nickname} 선수 분석 중... (${prev.month}: ${prev.score}점 → ${latest.month}: ${latest.score}점)`);

                    // 🧠 GPT 피드백 생성
                    let feedback = "데이터 부족으로 피드백을 생성하지 못했습니다.";
                    if (openaiApiKey) {
                        try {
                            const feedbackPrompt = `
당신은 축구팀 AI 코치입니다.
선수 이름: ${nickname}
지난달(${prev.month}) 점수: ${prev.score}점
이번달(${latest.month}) 점수: ${latest.score}점 (${trend} ${Math.abs(diff)}점)
활동 횟수: ${reportsSnap.size}회

아래 형식으로 짧고 구체적으로 피드백을 작성해주세요:
1. 잘한 점 (1개)
2. 개선점 (1개)

최대 100자 이내로 작성해주세요.
`;

                            const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${openaiApiKey}`,
                                },
                                body: JSON.stringify({
                                    model: "gpt-4o-mini",
                                    messages: [
                                        {
                                            role: "system",
                                            content: "당신은 스포츠 코치입니다. 선수에게 친절하고 구체적으로 조언하세요.",
                                        },
                                        { role: "user", content: feedbackPrompt },
                                    ],
                                    max_tokens: 200,
                                    temperature: 0.7,
                                }),
                            });

                            if (gptRes.ok) {
                                const gptJson = await gptRes.json() as any;
                                feedback =
                                    gptJson.choices?.[0]?.message?.content?.trim() ||
                                    "데이터 부족으로 피드백을 생성하지 못했습니다.";
                                logger.info(`✅ ${nickname} 선수 GPT 피드백 생성 완료`);
                            } else {
                                const errorText = await gptRes.text();
                                logger.error(`GPT 피드백 생성 실패 (${nickname}): ${gptRes.status} ${errorText}`);
                            }
                        } catch (gptError) {
                            logger.error(`GPT 피드백 생성 중 오류 (${nickname}):`, gptError);
                        }
                    }

                    // 🧾 PDF 리포트 생성 (jspdf 지연 로드)
                    const { default: jsPDF } = await import("jspdf");
                    const pdf = new jsPDF("p", "mm", "a4");
                    const pdfWidth = 210;
                    const margin = 20;
                    let y = margin;

                    // 헤더
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(18);
                    pdf.text(`⚽ ${nickname} 선수 AI 코치 리포트`, pdfWidth / 2, y, { align: "center" });
                    y += 15;

                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(12);
                    pdf.text(`📅 리포트 월: ${latest.month}`, margin, y);
                    y += 10;

                    // 점수 변화
                    pdf.setFontSize(11);
                    pdf.text(`이번달 점수: ${latest.score}점 ${trendEmoji} (${trend})`, margin, y);
                    y += 8;
                    pdf.text(`지난달 점수: ${prev.score}점`, margin, y);
                    y += 8;
                    pdf.text(`변화: ${diff > 0 ? "+" : ""}${diff}점`, margin, y);
                    y += 15;

                    // AI 피드백
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(12);
                    pdf.text("💬 AI 코치 피드백", margin, y);
                    y += 8;

                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    const feedbackLines = feedback.split("\n");
                    feedbackLines.forEach((line: string) => {
                        if (y > 270) {
                            pdf.addPage();
                            y = margin;
                        }
                        pdf.text(line.trim(), margin + 5, y, { maxWidth: pdfWidth - margin * 2 - 10 });
                        y += 6;
                    });

                    // 푸터
                    y = 280;
                    pdf.setFontSize(8);
                    pdf.text(`생성일: ${new Date().toLocaleString("ko-KR")}`, pdfWidth / 2, y, { align: "center" });
                    pdf.text("© 2025 YAGO SPORTS · Powered by AI", pdfWidth / 2, y + 5, { align: "center" });

                    const pdfPath = `playerReports/${uid}_${nickname}_${latest.month}.pdf`;
                    const pdfFile = getDefaultStorageBucket().file(pdfPath);
                    await pdfFile.save(Buffer.from(pdf.output("arraybuffer")), {
                        contentType: "application/pdf",
                        metadata: {
                            metadata: {
                                uid,
                                nickname,
                                month: latest.month,
                                score: latest.score.toString(),
                                createdAt: new Date().toISOString(),
                            },
                        },
                    });

                    const [pdfUrl] = await pdfFile.getSignedUrl({
                        action: "read",
                        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
                    });

                    logger.info(`✅ ${nickname} 선수 PDF 리포트 업로드 완료`);

                    // 🎧 TTS 음성 생성
                    let audioUrl: string | null = null;
                    if (openaiApiKey) {
                        try {
                            const ttsText = `${nickname} 선수의 이번달 점수는 ${latest.score}점으로 지난달 대비 ${trend}했습니다. ${feedback}`;

                            const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${openaiApiKey}`,
                                },
                                body: JSON.stringify({
                                    model: "tts-1", // tts-1 또는 tts-1-hd
                                    voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer
                                    input: ttsText,
                                }),
                            });

                            if (ttsResp.ok) {
                                const audioBuffer = Buffer.from(await ttsResp.arrayBuffer());

                                const audioPath = `playerReports/${uid}_${nickname}_${latest.month}.mp3`;
                                const audioFile = getDefaultStorageBucket().file(audioPath);
                                await audioFile.save(audioBuffer, {
                                    contentType: "audio/mpeg",
                                    metadata: {
                                        metadata: {
                                            uid,
                                            nickname,
                                            month: latest.month,
                                            createdAt: new Date().toISOString(),
                                            type: "voice-report",
                                        },
                                    },
                                });

                                const [signedAudioUrl] = await audioFile.getSignedUrl({
                                    action: "read",
                                    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
                                });

                                audioUrl = signedAudioUrl;
                                logger.info(`✅ ${nickname} 선수 음성 리포트 업로드 완료`);
                            } else {
                                const errorText = await ttsResp.text();
                                logger.error(`TTS 생성 실패 (${nickname}): ${ttsResp.status} ${errorText}`);
                            }
                        } catch (ttsError) {
                            logger.error(`TTS 생성 중 오류 (${nickname}):`, ttsError);
                        }
                    }

                    allReports.push({
                        name: nickname,
                        uid,
                        month: latest.month,
                        score: latest.score,
                        prevScore: prev.score,
                        trend,
                        trendEmoji,
                        diff,
                        feedback,
                        pdfUrl,
                        audioUrl: audioUrl || undefined,
                    });
                } catch (playerError) {
                    logger.error(`선수 리포트 생성 중 오류 (${userDoc.id}):`, playerError);
                    // 개별 선수 오류는 건너뛰고 계속 진행
                }
            }

            if (allReports.length === 0) {
                logger.warn("⚠️ 생성된 리포트가 없습니다.");
                return;
            }

            // 🤖 Slack (n8n Webhook) 전송
            logger.info(`🤖 Slack으로 ${allReports.length}명의 선수 리포트 전송 중...`);

            const payload = {
                title: "📊 개인별 AI 코치 리포트",
                month: monthKey,
                totalPlayers: allReports.length,
                players: allReports,
                createdAt: new Date().toISOString(),
            };

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Webhook 호출 실패: ${response.status} ${errorText}`);
            }

            logger.info(`✅ 개인별 선수 리포트 생성 및 Slack 공유 완료! (${allReports.length}명)`);
        } catch (error) {
            logger.error("❌ 개인별 리포트 생성 중 오류:", error);
            throw error;
        }
    }
);

