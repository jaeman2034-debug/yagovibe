/**
 * AI 어시스턴트 API 호출 유틸리티
 * 
 * 백엔드 LLM-lite 엔진을 호출하여 자연어 질문에 대한 답변을 받습니다.
 */

import type { VoiceIntent } from "@/types/voiceIntent";
import type { VoiceContextState } from "@/context/VoiceCommandProvider";

/**
 * AI 컨텍스트 페이로드 타입
 */
export interface AiContextPayload {
  lastIntent: VoiceIntent | null;
  lastEntities: {
    player?: string | null;
    team?: string | null;
    league?: string | null;
    date?: any;
    sport?: string | null;
  };
  favorites: {
    teams: string[];
    players: string[];
  };
  timezone: string;
}

/**
 * AI 어시스턴트 응답 타입
 */
export interface AssistantResponse {
  answer: string;
  confidence?: number;
}

/**
 * AI 어시스턴트를 호출하여 질문에 대한 답변을 받습니다.
 * 
 * @param question - 사용자의 질문
 * @param context - 대화 맥락 정보
 * @returns AI 답변
 */
export async function callAssistant(
  question: string,
  context: AiContextPayload
): Promise<AssistantResponse> {
  try {
    // 백엔드 API 엔드포인트 호출
    // 실제 배포 시에는 환경 변수로 관리
    const apiUrl = import.meta.env.VITE_ASSISTANT_API_URL || "/api/voice-assistant";
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      answer: data.answer || "죄송해요, 답변을 생성하지 못했어요.",
      confidence: data.confidence,
    };
  } catch (error) {
    console.error("❌ [AI Assistant] 호출 오류:", error);
    throw error;
  }
}

/**
 * 로컬 개발 환경에서 사용할 수 있는 모의(Mock) AI 응답
 * 실제 백엔드가 준비되기 전까지 사용합니다.
 */
export async function callAssistantMock(
  question: string,
  context: AiContextPayload
): Promise<AssistantResponse> {
  // 로컬 개발용 모의 응답
  // 실제로는 백엔드 LLM을 호출해야 합니다
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerQuestion = question.toLowerCase();
      
      // 간단한 패턴 매칭으로 모의 응답 생성
      if (lowerQuestion.includes("폼") || lowerQuestion.includes("어때")) {
        resolve({
          answer: "최근 경기 데이터를 분석 중이에요. 곧 정확한 답변을 드릴게요.",
          confidence: 0.7,
        });
      } else if (lowerQuestion.includes("추천") || lowerQuestion.includes("어떤 경기")) {
        const favoriteTeam = context.favorites.teams[0];
        if (favoriteTeam) {
          resolve({
            answer: `${favoriteTeam} 경기를 추천드려요! 즐겨찾기한 팀이니 관심 있으실 것 같아요.`,
            confidence: 0.8,
          });
        } else {
          resolve({
            answer: "오늘의 인기 경기를 추천해드릴게요. 잠시만 기다려주세요.",
            confidence: 0.7,
          });
        }
      } else if (lowerQuestion.includes("비교") || lowerQuestion.includes("중에")) {
        resolve({
          answer: "비교 분석을 위해 최근 데이터를 수집 중이에요.",
          confidence: 0.7,
        });
      } else {
        resolve({
          answer: "질문을 이해했어요. 관련 정보를 찾아보고 있어요.",
          confidence: 0.6,
        });
      }
    }, 1000); // 1초 지연 (실제 API 호출 시뮬레이션)
  });
}

