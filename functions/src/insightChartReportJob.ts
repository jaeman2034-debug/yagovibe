import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin } from "./lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getDefaultStorageBucket } from "./lib/defaultStorageBucket";
import fetch from "node-fetch";
// 🔥 Lazy import: chartjs-node-canvas는 함수 내부에서 동적 import
// import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import type { ChartConfiguration } from "chart.js";

// 🔥 Firebase Admin 초기화는 index.ts에서 중앙 집중식으로 처리
// if (!admin.apps.length) {
//     admin.initializeApp();
// }

const db = getFirestore();
const messaging = getMessaging();

// 🔥 Chart.js 설정은 함수 내부에서 lazy initialization

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
 * 📊 매월 1일 오전 9시 자동 실행 - AI 차트 인사이트 리포트 생성 및 Slack 공유
 */
export const generateInsightChartReport = onSchedule(
    {
        schedule: "0 9 1 * *", // 매월 1일 오전 9시 (Cron 표현식)
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async (event) => {
        logger.info("📈 Generating AI chart report...", { structuredData: true });

        try {
            // TTS 음성 리포트 URL (선언을 위로 이동)
            let audioUrl: string | null = null;
            
            // 1️⃣ 모든 사용자와 월간 리포트 조회
            const usersSnap = await db.collection("users").get();
            logger.info(`👥 총 ${usersSnap.size}명의 사용자 발견`);

            if (usersSnap.empty) {
                logger.warn("⚠️ 사용자가 없습니다.");
                return;
            }

            const allData: any[] = [];

            for (const userDoc of usersSnap.docs) {
                const user = userDoc.data();
                const uid = userDoc.id;

                // 월간 리포트 조회
                const reportsRef = db.collection("monthlyReports").doc(uid).collection("reports");
                const reportsSnap = await reportsRef.get();

                for (const rep of reportsSnap.docs) {
                    const r = rep.data();
                    const score = extractScoreFromReport(r.report || "");
                    allData.push({
                        uid,
                        nickname: user.nickname || user.name || "이름 없음",
                        month: rep.id,
                        score,
                    });
                }
            }

            if (allData.length === 0) {
                logger.warn("⚠️ 리포트 데이터가 없습니다.");
                return;
            }

            // 2️⃣ 최근 6개월 데이터 추출
            const months = [...new Set(allData.map((d) => d.month))].sort();
            const latestMonth = months[months.length - 1];
            const prevMonths = months.slice(-6); // 최근 6개월 추이

            if (prevMonths.length < 2) {
                logger.warn("⚠️ 최소 2개월 이상의 데이터가 필요합니다.");
                return;
            }

            logger.info(`📅 분석 대상: 최근 ${prevMonths.length}개월 (${prevMonths[0]} ~ ${latestMonth})`);

            // 월별 평균 점수 계산
            const monthlyAverages = prevMonths.map((m) => {
                const monthData = allData.filter((d) => d.month === m);
                const avg = monthData.length > 0
                    ? (monthData.reduce((a, b) => a + b.score, 0) / monthData.length).toFixed(1)
                    : "0";
                return {
                    month: m,
                    avg: parseFloat(avg),
                    count: monthData.length,
                };
            });

            const avgScore = monthlyAverages[monthlyAverages.length - 1].avg.toFixed(1);
            const prevAvg = monthlyAverages.length >= 2
                ? monthlyAverages[monthlyAverages.length - 2].avg
                : monthlyAverages[0].avg;
            const diff = (parseFloat(avgScore) - prevAvg).toFixed(1);
            const diffNum = Number(diff);
            const trend = diffNum > 0 ? "상승" : diffNum < 0 ? "하락" : "유지";

            logger.info(`📊 평균 점수: ${avgScore}점 (${trend} ${Math.abs(diffNum)}점)`);

            // 3️⃣ 🧠 GPT 분석 코멘트 생성
            let insight = "데이터 부족으로 AI 코멘트를 생성하지 못했습니다.";
            const openaiApiKey = process.env.OPENAI_API_KEY;

            if (openaiApiKey) {
                try {
                    const prompt = `
당신은 스포츠 팀의 AI 코치입니다.
최근 ${prevMonths.length}개월간 팀 평균 점수는 ${monthlyAverages.map((m) => `${m.month}: ${m.avg}점`).join(", ")}입니다.
최근 추세는 ${trend}이며, 이번 달(${latestMonth}) 평균은 ${avgScore}점입니다.
변화량: ${diffNum > 0 ? "+" : ""}${diff}점

스포츠 코치처럼 간결하고 구체적인 분석 코멘트를 2-3문장으로 작성해주세요.
팀의 강점과 개선 포인트를 포함해주세요.
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
                                    content: "당신은 스포츠 팀의 코치입니다. 간결하고 구체적으로 분석하세요.",
                                },
                                { role: "user", content: prompt },
                            ],
                            max_tokens: 200,
                            temperature: 0.7,
                        }),
                    });

                    if (gptRes.ok) {
                        const gptJson = await gptRes.json() as any;
                        insight =
                            gptJson.choices?.[0]?.message?.content?.trim() ||
                            "AI 코멘트를 불러올 수 없습니다.";
                        logger.info("✅ GPT 분석 코멘트 생성 완료");
                    } else {
                        const errorText = await gptRes.text();
                        logger.error(`GPT 분석 실패: ${gptRes.status} ${errorText}`);
                    }
                } catch (gptError) {
                    logger.error("GPT 분석 중 오류:", gptError);
                }
            }

            // 4️⃣ 📊 차트 이미지 생성
            logger.info("📊 차트 이미지 생성 중...");

            // 🔥 Lazy import: chartjs-node-canvas를 함수 실행 시점에 동적으로 로드
            // optionalDependencies이므로 try-catch로 처리
            let ChartJSNodeCanvas: any;
            try {
                // @ts-ignore - optionalDependencies이므로 타입 선언이 없을 수 있음
                const chartModule = await import("chartjs-node-canvas");
                ChartJSNodeCanvas = chartModule.ChartJSNodeCanvas;
            } catch (err) {
                logger.warn("⚠️ chartjs-node-canvas를 로드할 수 없습니다. 차트 생성이 건너뜁니다.");
                return; // onSchedule은 void를 반환해야 함
            }
            
            // Chart.js 설정
            const width = 800;
            const height = 400;
            const chartJSNodeCanvas = new ChartJSNodeCanvas({
                width,
                height,
                backgroundColour: "white",
            });

            const minScore = Math.min(...monthlyAverages.map((m) => m.avg));
            const maxScore = Math.max(...monthlyAverages.map((m) => m.avg));

            const chartConfiguration: ChartConfiguration<"line"> = {
                type: "line",
                data: {
                    labels: prevMonths,
                    datasets: [
                        {
                            label: "팀 평균 점수",
                            data: monthlyAverages.map((m) => m.avg),
                            borderColor: "rgba(54, 162, 235, 1)",
                            backgroundColor: "rgba(54, 162, 235, 0.2)",
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3,
                            pointRadius: 6,
                            pointBackgroundColor: "rgba(54, 162, 235, 1)",
                            pointBorderColor: "#fff",
                            pointBorderWidth: 2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: "top",
                            labels: {
                                font: {
                                    size: 14,
                                },
                            },
                        },
                        title: {
                            display: true,
                            text: "최근 6개월 팀 평균 점수 추이",
                            font: {
                                size: 16,
                                weight: "bold",
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: Math.max(0, minScore - 10),
                            max: Math.min(100, maxScore + 10),
                            ticks: {
                                font: {
                                    size: 12,
                                },
                            },
                            title: {
                                display: true,
                                text: "점수",
                                font: {
                                    size: 14,
                                },
                            },
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: 12,
                                },
                            },
                            title: {
                                display: true,
                                text: "월",
                                font: {
                                    size: 14,
                                },
                            },
                        },
                    },
                },
            };

            const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfiguration);
            logger.info("✅ 차트 이미지 생성 완료");

            // 5️⃣ 🧾 PDF 리포트 생성 (jspdf는 실행 시점에만 로드)
            const { default: jsPDF } = await import("jspdf");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = 210;
            const margin = 20;
            let y = margin;

            // 헤더
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.text("📊 YAGO SPORTS AI 인사이트 리포트", pdfWidth / 2, y, { align: "center" });
            y += 15;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(12);
            pdf.text(`📅 기준월: ${latestMonth}`, margin, y);
            y += 10;

            // 통계 정보
            pdf.setFontSize(11);
            pdf.text(`평균 점수: ${avgScore}점 (${trend} ${diffNum > 0 ? "+" : ""}${diff}점)`, margin, y);
            y += 8;
            pdf.text(`참여 인원: ${monthlyAverages[monthlyAverages.length - 1].count}명`, margin, y);
            y += 12;

            // AI 코멘트
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.text("💬 AI 코치 분석:", margin, y);
            y += 8;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            const insightLines = insight.split("\n");
            insightLines.forEach((line: string) => {
                if (y > 250) {
                    pdf.addPage();
                    y = margin;
                }
                pdf.text(line.trim(), margin + 5, y, { maxWidth: pdfWidth - margin * 2 - 10 });
                y += 6;
            });
            y += 10;

            // 차트 이미지 삽입
            const chartWidth = pdfWidth - margin * 2;
            const chartHeight = (height * chartWidth) / width;
            pdf.addImage(imageBuffer, "PNG", margin, y, chartWidth, chartHeight);
            y += chartHeight + 10;

            // 월별 상세 데이터
            if (y > 250) {
                pdf.addPage();
                y = margin;
            }

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.text("📈 월별 상세 데이터", margin, y);
            y += 10;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            monthlyAverages.forEach((m) => {
                if (y > 270) {
                    pdf.addPage();
                    y = margin;
                }
                pdf.text(`${m.month}: ${m.avg.toFixed(1)}점 (참여: ${m.count}명)`, margin + 5, y);
                y += 7;
            });

            // 푸터
            y = 285;
            pdf.setFontSize(8);
            pdf.text(
                `생성일: ${new Date().toLocaleString("ko-KR")}`,
                pdfWidth / 2,
                y,
                { align: "center" }
            );
            pdf.text("© 2025 YAGO SPORTS · Powered by AI", pdfWidth / 2, y + 5, { align: "center" });

            // 6️⃣ PDF 파일 Storage 업로드
            const pdfPath = `chartReports/InsightReport_${latestMonth}.pdf`;
            const pdfFile = getDefaultStorageBucket().file(pdfPath);
            const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

            await pdfFile.save(pdfBuffer, {
                contentType: "application/pdf",
                metadata: {
                    metadata: {
                        month: latestMonth,
                        avgScore,
                        trend,
                        createdAt: new Date().toISOString(),
                    },
                },
            });

            logger.info(`✅ PDF 리포트 업로드 완료: ${pdfPath}`);

            const [pdfUrl] = await pdfFile.getSignedUrl({
                action: "read",
                expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
            });

            // 6-1️⃣ 대시보드 실시간 갱신용 요약 스냅샷 저장
            await db.collection("reportSummaries").doc("latest").set(
                {
                    month: latestMonth,
                    avgScore: parseFloat(avgScore),
                    trend,
                    diff: parseFloat(diff),
                    insight,
                    pdfUrl,
                    audioUrl: audioUrl || null,
                    participantCount: monthlyAverages[monthlyAverages.length - 1].count,
                    monthlyAverages: monthlyAverages.map((m) => ({
                        month: m.month,
                        avg: m.avg,
                        count: m.count,
                    })),
                    updatedAt: Timestamp.now(),
                    createdAt: Timestamp.now(),
                },
                { merge: true }
            );
            logger.info("✅ 리포트 요약 스냅샷 저장 완료 (reportSummaries/latest)");

            // 7️⃣ 🎙️ TTS 음성 리포트 생성

            if (openaiApiKey) {
                try {
                    const ttsText = `이번 달 ${latestMonth} 팀 평균 점수는 ${avgScore}점으로 지난달 대비 ${trend}했습니다. ${insight}`;

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

                        const audioPath = `chartReports/InsightVoice_${latestMonth}.mp3`;
                        const audioFile = getDefaultStorageBucket().file(audioPath);
                        await audioFile.save(audioBuffer, {
                            contentType: "audio/mpeg",
                            metadata: {
                                metadata: {
                                    month: latestMonth,
                                    createdAt: new Date().toISOString(),
                                    type: "voice-insight",
                                },
                            },
                        });

                        const [signedAudioUrl] = await audioFile.getSignedUrl({
                            action: "read",
                            expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
                        });

                        audioUrl = signedAudioUrl;
                        logger.info(`✅ 음성 리포트 업로드 완료`);
                    } else {
                        const errorText = await ttsResp.text();
                        logger.error(`TTS 생성 실패: ${ttsResp.status} ${errorText}`);
                    }
                } catch (ttsError) {
                    logger.error("TTS 생성 중 오류:", ttsError);
                }
            }

            // 8️⃣ 🤖 Slack 전송 (n8n Webhook)
            const webhookUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.yagovibe.ai/webhook/ai-report";

            const payload: any = {
                title: "📈 YAGO SPORTS AI 차트 인사이트 리포트",
                month: latestMonth,
                avgScore,
                trend,
                diff,
                insight,
                pdfUrl,
                participantCount: monthlyAverages[monthlyAverages.length - 1].count,
                createdAt: new Date().toISOString(),
            };

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
                logger.warn(`⚠️ Webhook 호출 실패: ${response.status} ${errorText}`);
                // Webhook 실패해도 계속 진행
            } else {
                logger.info(`✅ Slack 공유 완료`);
            }

            // 9️⃣ 🔔 FCM 푸시 알림 발송 (관리자 토픽)
            try {
                await messaging.send({
                    topic: "admins",
                    notification: {
                        title: `📊 ${latestMonth} AI 리포트 생성 완료`,
                        body: `평균 ${avgScore}점 • ${trend} ${diffNum > 0 ? "+" : ""}${diff}점 • 클릭해서 확인`,
                        imageUrl: undefined,
                    },
                    data: {
                        month: latestMonth,
                        avgScore,
                        trend,
                        diff,
                        pdfUrl: pdfUrl || "",
                        audioUrl: audioUrl || "",
                        type: "monthly-report",
                    },
                    android: {
                        priority: "high",
                        notification: {
                            channelId: "yago_vibe_reports",
                            sound: "default",
                        },
                    },
                    apns: {
                        payload: {
                            aps: {
                                sound: "default",
                                badge: 1,
                            },
                        },
                    },
                });
                logger.info("✅ FCM 푸시 알림 발송 완료 (admins 토픽)");
            } catch (fcmError) {
                logger.error("❌ FCM 푸시 발송 중 오류:", fcmError);
                // FCM 실패해도 리포트 생성은 성공으로 처리
            }

            logger.info(`✅ AI 차트 인사이트 리포트 생성 및 Slack 공유 완료! (${latestMonth})`);
        } catch (error) {
            logger.error("❌ 차트 리포트 생성 중 오류:", error);
            throw error;
        }
    }
);

