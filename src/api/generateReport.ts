import OpenAI from "openai";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { uploadTextToStorage } from "../lib/storage";
import { sendSlackReport } from "./shareSlack";

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

/**
 * 🧠 AI 주간 리포트 생성
 * Firestore의 voice_logs를 분석하여 GPT로 요약 리포트 생성
 */
export async function generateWeeklyReport() {
    try {
        console.log("📊 AI 리포트 생성 시작...");

        // 1️⃣ Firestore에서 최근 100개 로그 가져오기
        const q = query(
            collection(db, "voice_logs"),
            orderBy("ts", "desc"),
            limit(100)
        );
        const snapshot = await getDocs(q);

        const logs = snapshot.docs.map((d) => d.data());
        console.log("📝 로그 수집 완료:", logs.length, "개");

        // 2️⃣ 로그를 텍스트로 변환
        const logText = logs
            .map((l, i) => `${i + 1}. ${l.text || "N/A"} (${l.intent || "미확인"}: ${l.keyword || "-"})`)
            .join("\n");

        // 3️⃣ GPT 프롬프트 작성
        const prompt = `다음은 YAGO VIBE 스포츠 플랫폼의 사용자 음성 로그입니다:

${logText}

위 데이터를 분석하여 한국어로 다음 형식으로 주간 리포트를 작성해주세요:

## 📊 주간 활동 요약
(총 활동 수, 주요 이용 패턴 요약)

## 🎯 인기 명령어/장소
(가장 많이 사용된 명령어 및 검색 장소)

## 💡 주요 인사이트
(데이터 분석 결과, 패턴 발견)

## 🚀 향후 추천 액션
(개선 사항, 사용자 경험 향상 방안)`;

        // 4️⃣ OpenAI API 호출
        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "당신은 데이터 분석 전문가입니다. 사용자 로그 데이터를 분석하여 명확하고 실용적인 인사이트를 제공합니다."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        const report = res.choices[0]?.message?.content || "요약 생성 실패";
        console.log("✅ AI 리포트 생성 완료");

        return report;
    } catch (error) {
        console.error("❌ 리포트 생성 오류:", error);
        return `오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
    }
}

/**
 * 🔍 일간 리포트 생성 (간단 버전)
 */
export async function generateDailyReport() {
    try {
        const q = query(
            collection(db, "voice_logs"),
            orderBy("ts", "desc"),
            limit(50)
        );
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map((d) => d.data());

        const logText = logs
            .map((l) => `- ${l.text || "N/A"} (${l.intent || "미확인"})`)
            .join("\n");

        const prompt = `오늘 사용자 음성 로그 요약:\n${logText}\n\n간단히 일일 요약을 작성해주세요 (3-4줄).`;

        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 300
        });

        return res.choices[0]?.message?.content || "일일 요약 생성 실패";
    } catch (error) {
        console.error("❌ 일일 리포트 오류:", error);
        return "일일 리포트 생성 실패";
    }
}

/**
 * 🤖 완전 자동 리포트 생성 (Storage + Slack)
 */
export async function generateAndShareReport() {
    try {
        console.log("🚀 자동 리포트 생성 시작...");

        // 1️⃣ AI 리포트 생성
        const report = await generateWeeklyReport();

        // 2️⃣ Storage 업로드
        const filename = `YAGO_VIBE_Report_${new Date().toISOString().split('T')[0]}.txt`;
        const url = await uploadTextToStorage(report, filename);

        // 3️⃣ Slack 전송
        const slackMessage = `📄 새 AI 리포트가 생성되었습니다!\n\n🔗 [다운로드 링크](${url})`;
        await sendSlackReport(slackMessage);

        console.log("✅ 자동 리포트 완료:", url);
        return { success: true, url, report };
    } catch (error) {
        console.error("❌ 자동 리포트 오류:", error);
        throw error;
    }
}

