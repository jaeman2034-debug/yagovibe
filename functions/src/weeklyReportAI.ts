import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { openai } from "./lib/openaiClient";
import { generateReportPrompt, UserReportData } from "./utils/reportTemplate";

// Firebase Admin 초기화
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();

/**
 * 매주 월요일 오전 9시 (서울 시간) 자동 실행되는 AI 주간 리포트 생성 작업
 */
export const generateWeeklyReportJob = onSchedule(
    {
        schedule: "every monday 09:00",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async (event) => {
        logger.info("📆 Generating Weekly AI Reports...", { structuredData: true });

        try {
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

            logger.info(`📅 분석 기간: ${lastMonday.toISOString().split("T")[0]} ~ ${lastSunday.toISOString().split("T")[0]}`);

            let successCount = 0;
            let errorCount = 0;

            // 2️⃣ 각 사용자별로 리포트 생성
            for (const userDoc of usersSnap.docs) {
                try {
                    const userData = userDoc.data();
                    const uid = userDoc.id;

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
                            date: data.date instanceof Timestamp
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
                                    content: "당신은 전문 스포츠 코치입니다. 사용자의 활동 데이터를 분석하여 격려와 구체적인 피드백을 제공합니다.",
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
                        const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
                        report = `---\n1. 주간 요약: 지난 주 ${activities.length}회의 활동을 통해 총 ${totalDuration}분 동안 운동하셨습니다.\n2. 피드백: 꾸준한 노력이 인상적입니다.\n3. 추천 목표: 이번 주에도 동일한 페이스를 유지해보세요.\n---`;
                    }

                    // Firestore에 저장
                    const reportDate = lastMonday.toISOString().split("T")[0]; // YYYY-MM-DD 형식
                    const reportRef = db
                        .collection("reports")
                        .doc(uid)
                        .collection("weekly")
                        .doc(reportDate);

                    await reportRef.set({
                        uid,
                        report,
                        nickname: reportData.nickname,
                        activitiesCount: activities.length,
                        totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
                        periodStart: lastMondayTimestamp,
                        periodEnd: lastSundayTimestamp,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    logger.info(`   💾 리포트 저장 완료: reports/${uid}/weekly/${reportDate}`);
                    successCount++;
                } catch (userError: any) {
                    logger.error(`   ❌ 사용자 ${userDoc.id} 처리 실패:`, userError.message);
                    errorCount++;
                }
            }

            logger.info(`🎉 모든 주간 리포트 생성 완료! 성공: ${successCount}건, 실패: ${errorCount}건`);
        } catch (err: any) {
            logger.error("❌ 주간 리포트 생성 작업 실패:", err.message, err.stack);
            throw err;
        }
    }
);
