// === CORE PROTECTED: DO NOT MODIFY BELOW ===
import OpenAI from "openai";

export const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export async function safeChat(messages: any[], tools?: any[]) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            tools,
        });

        // ✅ 올바른 content 추출
        const message = response.choices?.[0]?.message?.content?.trim() ?? "";
        return message;
    } catch (err) {
        console.error("❌ OpenAI Error:", err);
        return "";
    }
}
// === END PROTECTED ===
