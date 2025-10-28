import OpenAI from "openai";

/**
 * OpenAI 클라이언트 초기화
 * 환경변수 OPENAI_API_KEY에서 API 키를 가져옵니다.
 */
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

