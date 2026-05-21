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
 * 🎙️ 매월 1일 오전 9시 자동 실행 - AI 음성 리포트 + PDF 생성 및 Slack 공유
 */
export const generateVoiceAndPdfReport = onSchedule(
    {
        schedule: "0 9 1 * *", // 매월 1일 오전 9시 (Cron 표현식)
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async (event) => {
        logger.info("🎙️ Generating AI voice + PDF report...", { structuredData: true });

        try {
            // 1️⃣ 모든 사용자와 월간 리포트 조회
            const usersSnap = await db.collection("users").get();
            logger.info(`👥 총 ${usersSnap.size}명의 사용자 발견`);

            if (usersSnap.empty) {
                logger.warn("⚠️ 사용자가 없습니다.");
                return;
            }

            const allData: any[] = [];

            // 지난달 월간 리포트 수집
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

            for (const userDoc of usersSnap.docs) {
                const user = userDoc.data();
                const uid = userDoc.id;

                // 월간 리포트 조회
                const monthlyRef = db.collection("monthlyReports").doc(uid).collection("reports");
                const reportsSnap = await monthlyRef.get();

                for (const rep of reportsSnap.docs) {
                    const r = rep.data();
                    const score = extractScoreFromReport(r.report || "");

                    allData.push({
                        uid,
                        nickname: user.nickname || user.name || "이름 없음",
                        email: user.email || "",
                        month: rep.id,
                        score,
                        report: r.report,
                        totalActivities: r.totalActivities || 0,
                        totalDuration: r.totalDuration || 0,
                    });
                }
            }

            if (allData.length === 0) {
                logger.warn(`⚠️ ${monthKey}월 리포트 데이터가 없습니다.`);
                return;
            }

            // 2️⃣ 최신 월 기준으로 데이터 필터링
            const months = [...new Set(allData.map((d) => d.month))].sort();
            const latestMonth = months[months.length - 1] || monthKey;
            const monthlyData = allData.filter((d) => d.month === latestMonth);

            logger.info(`📅 분석 대상 월: ${latestMonth} (${monthlyData.length}명)`);

            // 3️⃣ 통계 계산
            const avgScore = (
                monthlyData.reduce((a, b) => a + b.score, 0) / (monthlyData.length || 1)
            ).toFixed(1);
            const maxScore = Math.max(...monthlyData.map((d) => d.score));
            const minScore = Math.min(...monthlyData.map((d) => d.score));
            const top3 = monthlyData
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map((t) => t.nickname);

            logger.info(`📊 평균 점수: ${avgScore}점 | 최고: ${maxScore}점 | 최저: ${minScore}점`);
            logger.info(`🏅 상위 3명: ${top3.join(", ")}`);

            // 4️⃣ 🎙️ AI 음성 리포트 생성 (OpenAI TTS)
            let audioUrl: string | null = null;
            const ttsText = `${latestMonth}월 YAGO SPORTS 팀 리포트입니다. 
팀 평균 점수는 ${avgScore}점입니다. 
최고 점수는 ${maxScore}점, 최저 점수는 ${minScore}점입니다.
상위 3명은 ${top3.join(", ")} 입니다.
총 ${monthlyData.length}명의 팀원이 참여했습니다.
모두 수고하셨습니다!`;

            const openaiApiKey = process.env.OPENAI_API_KEY;
            if (openaiApiKey) {
                try {
                    logger.info("🎤 OpenAI TTS API 호출 중...");

                    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
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

                    if (!ttsResponse.ok) {
                        const errorText = await ttsResponse.text();
                        throw new Error(`OpenAI TTS API 오류: ${ttsResponse.status} ${errorText}`);
                    }

                    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

                    // 5️⃣ MP3 파일 Storage 업로드
                    const audioPath = `autoReports/VoiceReport_${latestMonth}.mp3`;
                    const audioFile = getDefaultStorageBucket().file(audioPath);

                    await audioFile.save(audioBuffer, {
                        contentType: "audio/mpeg",
                        metadata: {
                            metadata: {
                                month: latestMonth,
                                createdAt: new Date().toISOString(),
                                type: "voice-report",
                            },
                        },
                    });

                    logger.info(`✅ 음성 리포트 업로드 완료: ${audioPath}`);

                    // 공개 URL 생성 (7일 유효)
                    const [signedAudioUrl] = await audioFile.getSignedUrl({
                        action: "read",
                        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
                    });

                    audioUrl = signedAudioUrl;
                    logger.info(`🎧 음성 리포트 URL: ${audioUrl}`);
                } catch (ttsError) {
                    logger.error("❌ TTS 생성 중 오류:", ttsError);
                    logger.warn("⚠️ 음성 리포트 생성을 건너뛰고 PDF만 생성합니다.");
                }
            } else {
                logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않아 음성 리포트 생성을 건너뜁니다.");
            }

            // 6️⃣ PDF 리포트 생성 (jspdf 지연 로드)
            const { default: jsPDF } = await import("jspdf");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = 210;
            const margin = 20;
            let y = margin;

            // 헤더
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(20);
            pdf.text("📊 YAGO SPORTS AI 월간 리포트", pdfWidth / 2, y, { align: "center" });
            y += 15;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(14);
            pdf.text(`📅 월: ${latestMonth}`, margin, y);
            y += 10;

            // 통계 정보
            pdf.setFontSize(12);
            pdf.text(`평균 점수: ${avgScore}점`, margin, y);
            y += 8;
            pdf.text(`최고 점수: ${maxScore}점`, margin, y);
            y += 8;
            pdf.text(`최저 점수: ${minScore}점`, margin, y);
            y += 8;
            pdf.text(`참여 인원: ${monthlyData.length}명`, margin, y);
            y += 8;

            pdf.setFont("helvetica", "bold");
            pdf.text(`🏅 상위 3명: ${top3.join(", ")}`, margin, y);
            y += 12;

            // 구분선
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, pdfWidth - margin, y);
            y += 10;

            // 팀원별 점수 리스트
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.text("팀원별 점수", margin, y);
            y += 8;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);

            monthlyData
                .sort((a, b) => b.score - a.score)
                .slice(0, 20) // 최대 20명까지 표시
                .forEach((d, i) => {
                    if (y > 270) {
                        // 페이지 넘김
                        pdf.addPage();
                        y = margin;
                    }

                    const rankBadge = i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`;
                    pdf.text(`${rankBadge} ${d.nickname} - ${d.score}점`, margin + 5, y);
                    y += 7;
                });

            // 푸터
            pdf.setFontSize(8);
            pdf.text(
                `생성일: ${new Date().toLocaleString("ko-KR")}`,
                pdfWidth / 2,
                290,
                { align: "center" }
            );
            pdf.text("© 2025 YAGO SPORTS · Powered by AI", pdfWidth / 2, 295, { align: "center" });

            // 7️⃣ PDF 파일 Storage 업로드
            const pdfPath = `autoReports/TeamReport_${latestMonth}.pdf`;
            const pdfFile = getDefaultStorageBucket().file(pdfPath);
            const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

            await pdfFile.save(pdfBuffer, {
                contentType: "application/pdf",
                metadata: {
                    metadata: {
                        month: latestMonth,
                        avgScore,
                        participantCount: monthlyData.length.toString(),
                        createdAt: new Date().toISOString(),
                    },
                },
            });

            logger.info(`✅ PDF 리포트 업로드 완료: ${pdfPath}`);

            // 공개 URL 생성 (7일 유효)
            const [pdfUrl] = await pdfFile.getSignedUrl({
                action: "read",
                expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
            });

            logger.info(`📎 PDF 리포트 URL: ${pdfUrl}`);

            // 8️⃣ n8n Webhook 호출 (Slack 공유)
            const webhookUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.yagovibe.ai/webhook/ai-report";

            const payload: any = {
                month: latestMonth,
                avgScore,
                top3: top3.join(", "),
                pdfUrl,
                participantCount: monthlyData.length,
                maxScore,
                minScore,
                createdAt: new Date().toISOString(),
            };

            // 음성 리포트 URL이 있으면 추가
            if (audioUrl) {
                payload.audioUrl = audioUrl;
            }

            logger.info(`🤖 n8n Webhook 호출 중: ${webhookUrl}`);

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Webhook 호출 실패: ${response.status} ${errorText}`);
            }

            logger.info(`✅ 음성 + PDF 리포트 생성 및 Slack 공유 완료! (${latestMonth})`);
        } catch (error) {
            logger.error("❌ 음성 리포트 생성 중 오류:", error);
            throw error;
        }
    }
);

