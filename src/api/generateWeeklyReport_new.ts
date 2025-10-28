import OpenAI from "openai";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export const POST = async (request: Request) => {
    try {
        const body = await request.json();
        const { summaryData, insightsData } = body;

        // 🧠 AI 요약 생성
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "너는 스포츠 데이터 분석 AI 리포터야." },
                {
                    role: "user",
                    content: `다음 주간 데이터를 요약해줘:\n${JSON.stringify({
                        summaryData,
                        insightsData,
                    })}`,
                },
            ],
        });

        const summaryText = aiResponse.choices[0].message.content || "요약 생성 실패";

        // 🧾 PDF 생성
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const { width, height } = page.getSize();

        page.drawText("YAGO VIBE 주간 리포트", {
            x: 60,
            y: height - 80,
            size: 24,
            font,
            color: rgb(0.2, 0.3, 0.8),
        });

        page.drawText(summaryText, {
            x: 60,
            y: height - 140,
            size: 12,
            font,
            color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();

        // 텍스트만 요청한 경우
        if (request.headers.get("Accept") === "text/plain") {
            return new Response(summaryText, {
                headers: { "Content-Type": "text/plain; charset=utf-8" }
            });
        }

        // PDF 요청인 경우
        return new Response(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=weekly_report.pdf",
            },
        });
    } catch (err) {
        console.error("리포트 생성 오류:", err);
        const error = err instanceof Error ? err : new Error("Unknown error");
        return new Response(
            JSON.stringify({ error: "리포트 생성 실패", details: error.message }),
            { status: 500 }
        );
    }
};

// CORS preflight 처리
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

