import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin } from "./lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
// 🔥 타입은 정적 import (타입은 런타임에 제거되므로 lazy import 불필요)
import type { UserReportData } from "./utils/reportTemplate";
// 🔥 Lazy import: 무거운 모듈들은 함수 내부에서 동적 import
// import { openai } from "./lib/openaiClient";
// import { generateReportPrompt } from "./utils/reportTemplate";
// import { sendReportEmail } from "./lib/gmailMailer";
// import jsPDF from "jspdf";

// 🔥 Firebase Admin 초기화는 index.ts에서 중앙 집중식으로 처리
// if (!admin.apps.length) {
//     admin.initializeApp();
// }

const db = getFirestore();

/**
 * 매주 월요일 오전 9시 (서울 시간) 자동 실행되는 AI 주간 리포트 생성 + 이메일 발송 작업
 */
export const generateWeeklyReportAndEmail = onSchedule(
    {
        schedule: "every monday 09:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async (event) => {
        logger.info("📆 Generating and emailing AI Reports...", { structuredData: true });

        try {
            // 🔥 Lazy import: 무거운 모듈들을 함수 실행 시점에 동적으로 로드
            const { getOpenAIClient } = await import("./lib/openaiClient");
            const openai = getOpenAIClient();
            const { generateReportPrompt } = await import("./utils/reportTemplate");
            const { sendReportEmail } = await import("./lib/gmailMailer");
            const jsPDF = (await import("jspdf")).default;

            // 1️⃣ 모든 사용자 가져오기
            const usersSnap = await db.collection("users").get();
            logger.info(`👥 총 ${usersSnap.size}명의 사용자 발견`);

            if (usersSnap.empty) {
                logger.warn("⚠️ 사용자가 없습니다.");
                return;
            }

            // 지난주 시작일 및 종료일 계산 (지난 월요일 ~ 일요일)
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dayOfWeek = today.getDay();
            const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            // 이번 주 월요일 00:00:00
            const thisMonday = new Date(today);
            thisMonday.setDate(today.getDate() - daysSinceMonday);

            // 지난주 월요일 00:00:00
            const lastMonday = new Date(thisMonday);
            lastMonday.setDate(thisMonday.getDate() - 7);

            // 지난주 일요일 23:59:59
            const lastSunday = new Date(thisMonday);
            lastSunday.setMilliseconds(lastSunday.getMilliseconds() - 1);

            const lastMondayTimestamp = Timestamp.fromDate(lastMonday);
            const lastSundayTimestamp = Timestamp.fromDate(lastSunday);

            logger.info(
                `📅 분석 기간: ${lastMonday.toISOString().split("T")[0]} ~ ${lastSunday.toISOString().split("T")[0]}`
            );

            let successCount = 0;
            let errorCount = 0;
            let emailSentCount = 0;

            // 2️⃣ 각 사용자별로 리포트 생성 및 이메일 발송
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

                    // 지난주 활동 가져오기
                    const activitiesSnap = await db
                        .collection("activities")
                        .where("uid", "==", uid)
                        .where("date", ">=", lastMondayTimestamp)
                        .where("date", "<=", lastSundayTimestamp)
                        .orderBy("date", "asc")
                        .get();

                    const activities = activitiesSnap.docs.map((doc) => {
                        const data = doc.data();
                        return {
                            date:
                                data.date instanceof Timestamp
                                    ? data.date.toDate().toISOString().split("T")[0]
                                    : data.date,
                            activity: data.activity || data.type || "운동",
                            duration: data.duration || data.time || 0,
                            type: data.type || data.activity,
                        };
                    });

                    logger.info(`   📊 활동 ${activities.length}건 발견`);

                    // 사용자 프로필 데이터 구성
                    const reportData: UserReportData = {
                        uid,
                        nickname: userData.nickname || userData.name || "사용자",
                        favoriteSports: userData.favoriteSports || [],
                        activities,
                    };

                    // 🧠 OpenAI 분석
                    const prompt = generateReportPrompt(reportData);

                    let report = "리포트 생성 실패";
                    try {
                        const completion = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: [
                                {
                                    role: "system",
                                    content:
                                        "당신은 전문 스포츠 코치입니다. 사용자의 활동 데이터를 분석하여 격려와 구체적인 피드백을 제공합니다.",
                                },
                                { role: "user", content: prompt },
                            ],
                            temperature: 0.7,
                            max_tokens: 500,
                        });

                        report = completion.choices[0].message?.content || report;
                        logger.info(`   ✅ AI 리포트 생성 완료`);
                    } catch (aiError: any) {
                        logger.error(`   ❌ OpenAI 분석 실패:`, aiError.message);
                        // 기본 리포트 생성
                        const totalDuration = activities.reduce((sum: number, a: any) => sum + a.duration, 0);
                        report = `---\n1. 주간 요약: 지난 주 ${activities.length}회의 활동을 통해 총 ${totalDuration}분 동안 운동하셨습니다.\n2. 피드백: 꾸준한 노력이 인상적입니다.\n3. 추천 목표: 이번 주에도 동일한 페이스를 유지해보세요.\n---`;
                    }

                    // Firestore에 저장
                    const reportDate = lastMonday.toISOString().split("T")[0]; // YYYY-MM-DD 형식
                    const reportRef = db.collection("reports").doc(uid).collection("weekly").doc(reportDate);

                    await reportRef.set({
                        uid,
                        report,
                        nickname: reportData.nickname,
                        activitiesCount: activities.length,
                        totalDuration: activities.reduce((sum: number, a: any) => sum + a.duration, 0),
                        periodStart: lastMondayTimestamp,
                        periodEnd: lastSundayTimestamp,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    logger.info(`   💾 리포트 저장 완료: reports/${uid}/weekly/${reportDate}`);

                    // 🧾 PDF 생성
                    try {
                        const pdf = new jsPDF({ unit: "mm", format: "a4" });
                        pdf.setFont("helvetica", "bold");
                        pdf.setFontSize(16);
                        pdf.text("YAGO SPORTS · AI 주간 리포트", 20, 30);
                        pdf.setFont("helvetica", "normal");
                        pdf.setFontSize(11);
                        pdf.text(`닉네임: ${reportData.nickname}`, 20, 50);
                        pdf.text(`생성일: ${reportDate}`, 20, 65);

                        // 리포트 텍스트 정리
                        const cleanReport = report.replaceAll("---", "").trim();
                        const lines = pdf.splitTextToSize(cleanReport, 170); // A4 폭 210mm - 여백 40mm

                        let y = 85;
                        for (const line of lines) {
                            if (y > 270) {
                                // 페이지 끝에 도달하면 새 페이지
                                pdf.addPage();
                                y = 20;
                            }
                            pdf.text(line, 20, y);
                            y += 7;
                        }

                        const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
                        logger.info(`   📄 PDF 생성 완료`);

                        // ✉️ 이메일 발송
                        const emailSubject = process.env.GMAIL_SUBJECT || "YAGO SPORTS AI 주간 리포트";
                        const emailBody = `
안녕하세요 ${reportData.nickname}님,

AI 코치가 지난주 운동 데이터를 분석한 결과,
이번 주 리포트를 생성했습니다.

${cleanReport}

YAGO SPORTS · AI 주간 리포트를 첨부합니다.

감사합니다.
YAGO SPORTS AI Team
`;

                        await sendReportEmail(userData.email, emailSubject, emailBody, pdfBuffer);
                        logger.info(`   📧 이메일 발송 완료: ${userData.email}`);
                        emailSentCount++;

                        // 발송 로그 저장
                        await db.collection("reportEmails").add({
                            uid,
                            email: userData.email,
                            nickname: reportData.nickname,
                            reportDate,
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
                            nickname: reportData.nickname,
                            reportDate,
                            sentAt: admin.firestore.FieldValue.serverTimestamp(),
                            subject: process.env.GMAIL_SUBJECT || "YAGO SPORTS AI 주간 리포트",
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
                `🎉 모든 주간 리포트 생성 및 이메일 전송 완료! 성공: ${successCount}건, 실패: ${errorCount}건, 이메일 발송: ${emailSentCount}건`
            );
        } catch (err: any) {
            logger.error("❌ 주간 리포트 생성 및 이메일 전송 작업 실패:", err.message, err.stack);
            throw err;
        }
    }
);

