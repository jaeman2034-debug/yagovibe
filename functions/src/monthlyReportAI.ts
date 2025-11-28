import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin } from "./lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
// 🔥 Lazy import: 무거운 모듈들은 함수 내부에서 동적 import
// import { openai } from "./lib/openaiClient";
// import { sendReportEmail } from "./lib/gmailMailer";
// import jsPDF from "jspdf";

const db = getFirestore();

/**
 * 매월 1일 오전 9시 (서울 시간) 자동 실행되는 AI 월간 리포트 생성 + 이메일 발송 작업
 */
export const generateMonthlyReportAndEmail = onSchedule(
    {
        schedule: "1 of month 09:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async (event) => {
        logger.info("📆 Generating AI Monthly Reports...", { structuredData: true });

        try {
            // 🔥 Lazy import: 무거운 모듈들을 함수 실행 시점에 동적으로 로드
            const { getOpenAIClient } = await import("./lib/openaiClient");
            const openai = getOpenAIClient();
            const { sendReportEmail } = await import("./lib/gmailMailer");
            const jsPDF = (await import("jspdf")).default;
            // 1️⃣ 모든 사용자 가져오기
            const usersSnap = await db.collection("users").get();
            logger.info(`👥 총 ${usersSnap.size}명의 사용자 발견`);

            if (usersSnap.empty) {
                logger.warn("⚠️ 사용자가 없습니다.");
                return;
            }

            // 지난달 기간 계산 (이번 달 1일이면 지난달 1일~마지막일)
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

            const monthStartTimestamp = Timestamp.fromDate(lastMonth);
            const monthEndTimestamp = Timestamp.fromDate(lastMonthEnd);

            const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

            logger.info(
                `📅 분석 기간 (지난달): ${lastMonth.toISOString().split("T")[0]} ~ ${lastMonthEnd.toISOString().split("T")[0]}`
            );

            let successCount = 0;
            let errorCount = 0;
            let emailSentCount = 0;

            // 2️⃣ 각 사용자별로 월간 리포트 생성 및 이메일 발송
            for (const userDoc of usersSnap.docs) {
                try {
                    const userData = userDoc.data();
                    const uid = userDoc.id;

                    // 이메일이 없으면 스킵
                    if (!userData.email) {
                        logger.info(`⚠️ 사용자 ${uid}의 이메일이 없어 스킵합니다.`);
                        continue;
                    }

                    logger.info(`🔄 사용자 처리 중: ${userData.nickname || uid}`);

                    // 지난달 주간 리포트 가져오기
                    const weeklyReportsSnap = await db
                        .collection("reports")
                        .doc(uid)
                        .collection("weekly")
                        .where("periodStart", ">=", monthStartTimestamp)
                        .where("periodStart", "<=", monthEndTimestamp)
                        .orderBy("periodStart", "asc")
                        .get();

                    if (weeklyReportsSnap.empty) {
                        logger.info(`   ⚠️ 지난달 주간 리포트가 없습니다.`);
                        continue;
                    }

                    const weeklyReports = weeklyReportsSnap.docs.map((doc) => {
                        const data = doc.data();
                        return {
                            date: doc.id,
                            report: data.report || "",
                            activitiesCount: data.activitiesCount || 0,
                            totalDuration: data.totalDuration || 0,
                        };
                    });

                    logger.info(`   📊 지난달 주간 리포트 ${weeklyReports.length}건 발견`);

                    // 주간 리포트 텍스트 결합
                    const combinedText = weeklyReports
                        .map((wr) => {
                            return `[${wr.date}] 주간 리포트:\n${wr.report}\n활동 횟수: ${wr.activitiesCount}회, 총 시간: ${wr.totalDuration}분`;
                        })
                        .join("\n\n---\n\n");

                    // 🧠 OpenAI 월간 요약 생성
                    const prompt = `
당신은 전문 운동 코치입니다.
아래는 지난 한 달간(4주)의 주간 리포트들입니다.
이 데이터를 종합해 월간 요약 리포트를 작성하세요.

[출력 형식]
---
1. 한줄 요약 (30자 내외)
2. 월간 총평 (200자 내외)
3. 주요 강점 (리스트 3개)
4. 개선 포인트 (리스트 3개)
5. 다음달 목표 (100자 내외)
---

[주간 리포트 데이터]
${combinedText}

한국어로 작성해주세요.
`;

                    let monthlySummary = "월간 리포트 생성 실패";
                    try {
                        const completion = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: [
                                {
                                    role: "system",
                                    content:
                                        "당신은 전문 스포츠 코치입니다. 4주치 주간 리포트를 종합하여 월간 총평과 목표를 제시합니다.",
                                },
                                { role: "user", content: prompt },
                            ],
                            temperature: 0.7,
                            max_tokens: 800,
                        });

                        monthlySummary = completion.choices[0].message?.content || monthlySummary;
                        logger.info(`   ✅ AI 월간 리포트 생성 완료`);
                    } catch (aiError: any) {
                        logger.error(`   ❌ OpenAI 분석 실패:`, aiError.message);
                        // 기본 월간 리포트 생성
                        const totalActivities = weeklyReports.reduce((sum, wr) => sum + wr.activitiesCount, 0);
                        const totalDuration = weeklyReports.reduce((sum, wr) => sum + wr.totalDuration, 0);
                        monthlySummary = `---\n1. 한줄 요약: 지난 한 달간 ${totalActivities}회 운동하며 총 ${totalDuration}분 활동했습니다.\n2. 월간 총평: 꾸준한 노력이 인상적입니다.\n3. 주요 강점: - 꾸준한 운동 습관\n4. 개선 포인트: - 더 많은 종목 시도\n5. 다음달 목표: 이번 달 페이스를 유지하면서 운동의 질을 높여보세요.\n---`;
                    }

                    // 🔖 Firestore 저장
                    const reportRef = db.collection("monthlyReports").doc(uid).collection("reports").doc(monthKey);

                    const nickname = userData.nickname || userData.name || "사용자";

                    await reportRef.set({
                        uid,
                        nickname,
                        report: monthlySummary,
                        weeklyReportsCount: weeklyReports.length,
                        totalActivities: weeklyReports.reduce((sum, wr) => sum + wr.activitiesCount, 0),
                        totalDuration: weeklyReports.reduce((sum, wr) => sum + wr.totalDuration, 0),
                        periodStart: monthStartTimestamp,
                        periodEnd: monthEndTimestamp,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    logger.info(`   💾 월간 리포트 저장 완료: monthlyReports/${uid}/reports/${monthKey}`);

                    // 📄 PDF 생성
                    try {
                        const pdf = new jsPDF({ unit: "pt", format: "a4" });
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();

                        let y = 60;

                        // 헤더
                        pdf.setFont("helvetica", "bold");
                        pdf.setFontSize(18);
                        pdf.text("YAGO VIBE · AI 월간 리포트", 40, y);
                        y += 25;

                        pdf.setFont("helvetica", "normal");
                        pdf.setFontSize(11);
                        pdf.text(`사용자: ${nickname}`, 40, y);
                        y += 18;
                        pdf.text(
                            `기간: ${lastMonth.toLocaleDateString("ko-KR")} ~ ${lastMonthEnd.toLocaleDateString("ko-KR")}`,
                            40,
                            y
                        );
                        y += 18;
                        pdf.text(`월간 리포트 건수: ${weeklyReports.length}주`, 40, y);
                        y += 25;

                        // 구분선
                        pdf.setDrawColor(200, 200, 200);
                        pdf.line(40, y, pageWidth - 40, y);
                        y += 20;

                        // 월간 요약 텍스트
                        const cleanSummary = monthlySummary.replaceAll("---", "").trim();
                        const lines = pdf.splitTextToSize(cleanSummary, pageWidth - 80);

                        pdf.setFontSize(10);
                        for (const line of lines) {
                            if (y > pageHeight - 60) {
                                pdf.addPage();
                                y = 40;
                            }
                            pdf.text(line, 40, y);
                            y += 15;
                        }

                        // 주간 리포트 요약 (2페이지)
                        pdf.addPage();
                        y = 40;
                        pdf.setFont("helvetica", "bold");
                        pdf.setFontSize(14);
                        pdf.text("주간 리포트 요약", 40, y);
                        y += 25;

                        pdf.setFont("helvetica", "normal");
                        pdf.setFontSize(9);

                        for (const wr of weeklyReports) {
                            if (y > pageHeight - 60) {
                                pdf.addPage();
                                y = 40;
                            }

                            pdf.setFont("helvetica", "bold");
                            pdf.text(`[${wr.date}] 주간 리포트`, 40, y);
                            y += 15;

                            pdf.setFont("helvetica", "normal");
                            pdf.text(`활동: ${wr.activitiesCount}회, 총 시간: ${wr.totalDuration}분`, 50, y);
                            y += 15;

                            const weekLines = pdf.splitTextToSize(wr.report.replaceAll("---", "").trim(), pageWidth - 100);
                            for (const line of weekLines.slice(0, 3)) {
                                if (y > pageHeight - 60) {
                                    pdf.addPage();
                                    y = 40;
                                }
                                pdf.text(line, 50, y);
                                y += 12;
                            }
                            y += 10;
                        }

                        const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
                        logger.info(`   📄 PDF 생성 완료`);

                        // ✉️ 이메일 발송
                        const emailSubject = `📊 YAGO VIBE ${monthKey} AI 월간 리포트`;
                        const emailBody = `
안녕하세요 ${nickname}님,

AI 코치가 지난 한 달(${monthKey})의 활동 데이터를 분석했습니다.

지난달에는 총 ${weeklyReports.length}주간의 리포트를 생성했으며,
월간 종합 분석 결과를 첨부드리니 확인해 주세요.

${cleanSummary.split("\n").slice(0, 3).join("\n")}

감사합니다.
YAGO VIBE AI Team
`;

                        await sendReportEmail(userData.email, emailSubject, emailBody, pdfBuffer);
                        logger.info(`   📧 이메일 발송 완료: ${userData.email}`);
                        emailSentCount++;

                        // 발송 로그 저장
                        await db.collection("reportEmails").add({
                            uid,
                            email: userData.email,
                            nickname,
                            reportType: "monthly",
                            reportDate: monthKey,
                            sentAt: admin.firestore.FieldValue.serverTimestamp(),
                            subject: emailSubject,
                            status: "success",
                        });

                        logger.info(`   ✅ 처리 완료`);
                    } catch (emailError: any) {
                        logger.error(`   ❌ PDF 생성 또는 이메일 발송 실패:`, emailError.message);

                        // 실패 로그 저장
                        await db.collection("reportEmails").add({
                            uid,
                            email: userData.email,
                            nickname,
                            reportType: "monthly",
                            reportDate: monthKey,
                            sentAt: admin.firestore.FieldValue.serverTimestamp(),
                            subject: `📊 YAGO VIBE ${monthKey} AI 월간 리포트`,
                            status: "error",
                            error: emailError.message,
                        });
                    }

                    successCount++;
                } catch (userError: any) {
                    logger.error(`   ❌ 사용자 ${userDoc.id} 처리 실패:`, userError.message);
                    errorCount++;
                }
            }

            logger.info(
                `🎉 모든 월간 리포트 생성 및 이메일 전송 완료! 성공: ${successCount}건, 실패: ${errorCount}건, 이메일 발송: ${emailSentCount}건`
            );
        } catch (err: any) {
            logger.error("❌ 월간 리포트 생성 및 이메일 전송 작업 실패:", err.message, err.stack);
            throw err;
        }
    }
);

