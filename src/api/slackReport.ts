import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export const POST = async (request: Request) => {
    try {
        console.log("📱 Slack 리포트 요청 시작...");

        const formData = await request.formData();
        const text = (formData.get("text") as string)?.trim() || "";
        const responseUrl = formData.get("response_url") as string;
        const userId = formData.get("user_id") as string;
        const userName = formData.get("user_name") as string;

        console.log("📱 Slack 요청 데이터:", {
            text,
            userId,
            userName,
            responseUrl: responseUrl ? "있음" : "없음"
        });

        // Firestore에서 최근 4개 리포트 불러오기
        const q = query(
            collection(db, "weekly_reports"),
            orderBy("createdAt", "desc"),
            limit(4)
        );
        const snapshot = await getDocs(q);
        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("📊 조회된 리포트 수:", reports.length);

        if (reports.length === 0) {
            await fetch(responseUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    response_type: "ephemeral",
                    text: "❌ 아직 생성된 리포트가 없습니다. 관리자 대시보드에서 먼저 리포트를 생성해주세요."
                }),
            });
            return new Response("OK", { status: 200 });
        }

        // 요청된 주차 리포트 선택
        let target = reports[0]; // 기본값: 최신 리포트
        let reportDescription = "이번 주";

        if (text.includes("lastweek") || text.includes("지난주") || text.includes("지난 주")) {
            target = reports[1] || reports[0];
            reportDescription = "지난 주";
        } else if (text.includes("2week") || text.includes("2주전") || text.includes("2주 전")) {
            target = reports[2] || reports[0];
            reportDescription = "2주 전";
        } else if (text.includes("3week") || text.includes("3주전") || text.includes("3주 전")) {
            target = reports[3] || reports[0];
            reportDescription = "3주 전";
        }

        console.log("🎯 선택된 리포트:", {
            date: (target as any).date,
            description: reportDescription,
            summary: ((target as any).summary || "").substring(0, 100) + "..."
        });

        // GPT 요약 생성
        const prompt = `
다음은 YAGO SPORTS의 ${reportDescription} 리포트입니다.
Slack 메시지용으로 간결하고 보기 좋게 정리해줘.

요약 형식:
- 제목 (이모지 포함)
- 주요 인사이트 3개 (불릿 포인트)
- 추천 행동 2개 (불릿 포인트)
- 각 줄은 간결하고 마크다운 형태로

리포트 데이터:
- 날짜: ${(target as any).date}
- 요약: ${(target as any).summary || "요약 없음"}
- 총 로그: ${(target as any).totalLogs || 0}건
- 지역 샘플: ${(target as any).geoCount || 0}개
- 디바이스 유형: ${(target as any).deviceTypes || 0}개
- 액션 유형: ${(target as any).actionTypes || 0}개

주요 인사이트:
${(target as any).insights?.map((i: string) => `• ${i}`).join('\n') || "인사이트 없음"}

추천사항:
${(target as any).recommendations?.map((r: string) => `• ${r}`).join('\n') || "추천사항 없음"}

위 데이터를 바탕으로 ${reportDescription} 리포트에 대한 Slack 메시지를 작성해주세요.
`;

        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 500
        });

        const message = res.choices[0].message?.content?.trim() || "리포트 요약 생성 실패";
        console.log("✅ GPT Slack 메시지 생성 완료:", message);

        // Slack에 메시지 전송
        await fetch(responseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                response_type: "in_channel",
                text: `📊 *YAGO SPORTS ${reportDescription} 리포트*`,
                attachments: [
                    {
                        color: "#4F46E5",
                        text: message,
                        footer: `요청자: ${userName} | 생성일: ${(target as any).date}`,
                        footer_icon: "https://platform.slack-edge.com/img/default_application_icon.png"
                    },
                ],
            }),
        });

        console.log("✅ Slack 메시지 전송 완료");
        return new Response("OK", { status: 200 });

    } catch (err) {
        console.error("❌ Slack report 오류:", err);

        // 오류 시 Slack에 에러 메시지 전송
        try {
            const formData = await request.formData();
            const responseUrl = formData.get("response_url") as string;

            if (responseUrl) {
                await fetch(responseUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        response_type: "ephemeral",
                        text: "❌ 리포트 요약 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
                    }),
                });
            }
        } catch (slackError) {
            console.error("❌ Slack 에러 메시지 전송 실패:", slackError);
        }

        return new Response("Internal Error", { status: 500 });
    }
};

// CORS preflight 요청 처리
export const OPTIONS = async () => {
    return new Response(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
};
