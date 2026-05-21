// ======================================================
// 🧠 GENIUS MODE PATCH: OpenAI 설정
// 목적: OpenAI API 클라이언트 설정 및 유틸리티 함수
// ======================================================

import OpenAI from 'openai';

// OpenAI 클라이언트 초기화
export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // 브라우저에서 사용 허용
});

// AI 응답 생성 함수
export const generateAIResponse = async (userMessage: string, conversationHistory: Array<{ type: 'user' | 'assistant', message: string }>) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system" as const,
          content: "당신은 YAGO SPORTS SPT의 AI 음성 비서입니다. 사용자의 질문에 친근하고 도움이 되는 답변을 제공하세요. 한국어로 응답하세요.",
          name: "system"
        },
        ...conversationHistory.map(msg => {
          const role = msg.type === 'user' ? 'user' : 'assistant';
          return {
            role: role as "user" | "assistant",
            content: msg.message,
            name: role
          };
        }),
        {
          role: "user" as const,
          content: userMessage,
          name: "user"
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    return completion.choices?.[0]?.message?.content?.trim() ?? "죄송합니다. 응답을 생성할 수 없습니다.";
  } catch (error) {
    console.error('OpenAI API 오류:', error);
    return "죄송합니다. AI 서비스에 문제가 있습니다.";
  }
};

// 명령어 분석 함수 (고급 NLU)
export const analyzeCommandAdvanced = async (command: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system" as const,
          content: `사용자의 음성 명령을 분석하여 다음 JSON 형식으로 응답하세요:
          {
            "type": "map|product|team|weather|greeting|general",
            "query": "검색어 또는 질문",
            "confidence": 0.0-1.0
          }
          
          타입 설명:
          - map: 지도, 위치, 장소 관련
          - product: 상품, 제품 관련
          - team: 팀, 멤버, 직원 관련
          - weather: 날씨 관련
          - greeting: 인사, 안부
          - general: 일반적인 질문`,
          name: "system"
        },
        {
          role: "user" as const,
          content: command,
          name: "user"
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    const response = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return JSON.parse(response || '{"type":"general","query":"","confidence":0.5}');
  } catch (error) {
    console.error('명령어 분석 오류:', error);
    return { type: 'general', query: command, confidence: 0.5 };
  }
};

// ======================================================
// ✅ END OF GENIUS MODE PATCH
// ======================================================
