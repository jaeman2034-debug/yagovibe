import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export const POST = async (request: Request) => {
    try {
        console.log("🎤 음성 리포트 요청 시작...");

        const { command } = await request.json();
        console.log("🎤 음성 명령:", command);

        // 최근 4개 리포트 가져오기 (더 많은 선택지 제공)
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
            return new Response(JSON.stringify({
                brief: "죄송합니다. 아직 생성된 리포트가 없습니다. 관리자 대시보드에서 먼저 리포트를 생성해주세요."
            }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // 명령어에 따라 대상 리포트 선택
        let target = reports[0]; // 기본값: 최신 리포트
        let reportDescription = "이번 주";

        if (command.includes("지난주") || command.includes("지난 주") || command.includes("저번주")) {
            target = reports[1] || reports[0];
            reportDescription = "지난 주";
        } else if (command.includes("2주전") || command.includes("2주 전")) {
            target = reports[2] || reports[0];
            reportDescription = "2주 전";
        } else if (command.includes("3주전") || command.includes("3주 전")) {
            target = reports[3] || reports[0];
            reportDescription = "3주 전";
        }

        console.log("🎯 선택된 리포트:", {
            date: (target as any).date,
            description: reportDescription,
            summary: ((target as any).summary || "").substring(0, 100) + "..."
        });

        // GPT에게 자연스러운 요약 요청
        const prompt = `
다음은 "${command}" 요청에 해당하는 ${reportDescription} 주간 리포트입니다.
자연스럽고 간결한 한국어 음성 브리핑으로 3문장 이내로 요약해줘.

요약 스타일:
- 친근하고 자연스러운 말투
- 핵심 수치와 주요 발견사항 포함
- 음성으로 들었을 때 이해하기 쉬운 표현
- 간결하고 명확한 문장

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

위 데이터를 바탕으로 ${reportDescription} 리포트에 대한 음성 브리핑을 작성해주세요.
`;

        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 300
        });

        const brief = res.choices[0].message?.content?.trim() || "요약 생성 실패";
        console.log("✅ GPT 음성 브리핑 생성 완료:", brief);

        return new Response(JSON.stringify({ brief }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("❌ voiceReport 오류:", err);

        // 오류 시 기본 응답
        const fallbackBrief = "죄송합니다. 리포트 요약 처리 중 오류가 발생했습니다. 다시 시도해주세요.";

        return new Response(JSON.stringify({ brief: fallbackBrief }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
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
