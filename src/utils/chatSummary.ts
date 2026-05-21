/**
 * 🤖 채팅 요약 생성 유틸리티
 * 
 * 최근 메시지를 분석하여 한 문장으로 요약
 * - AI API 호출 (Cloud Function)
 * - Fallback: 간단한 규칙 기반 요약
 */

interface Message {
  text?: string;
  location?: { lat: number; lng: number };
  senderId: string;
  createdAt?: any;
}

interface SummaryOptions {
  messages: Message[];
  myUid: string;
  maxMessages?: number;
}

/**
 * 채팅 요약 생성 (AI 또는 Fallback)
 */
export async function getChatSummary({
  messages,
  myUid,
  maxMessages = 10,
}: SummaryOptions): Promise<string> {
  if (messages.length === 0) {
    return "아직 대화가 없어요.";
  }

  // 최근 N개 메시지 추출 (필터링)
  const recentMessages = messages
    .slice(-maxMessages)
    .filter((m) => {
      // ❌ 제외: "안녕하세요" 같은 인사말
      if (m.text) {
        const text = m.text.trim().toLowerCase();
        if (text === "안녕하세요" || text === "안녕" || text === "하이" || text === "ㅎㅇ") {
          return false;
        }
        // ❌ 제외: 이모지 단독 메시지
        if (/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u.test(text)) {
          return false;
        }
      }
      return true;
    });
  
  const otherMessages = recentMessages.filter((m) => m.senderId !== myUid);

  if (otherMessages.length === 0) {
    return "아직 상대방의 메시지가 없어요.";
  }

  // AI 요약 API 호출 시도
  try {
    const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
      "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

    const messageContext = recentMessages
      .map((m) => {
        const sender = m.senderId === myUid ? "나" : "상대";
        if (m.location) {
          return `${sender}: 위치 공유`;
        }
        return `${sender}: ${m.text || ""}`;
      })
      .filter((line) => line.trim())
      .join("\n");

    const response = await fetch(
      `${functionsOrigin}/chatSummaryAndSuggestions?type=summary`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messageContext,
          myUid,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.summary && data.summary.trim()) {
        return data.summary.trim();
      }
    }
  } catch (apiError) {
    console.warn("🤖 [chatSummary] AI API 호출 실패, fallback 사용:", apiError);
  }

  // Fallback: 간단한 규칙 기반 요약
  return generateFallbackSummary(otherMessages);
}

/**
 * Fallback 요약 생성 (규칙 기반)
 */
function generateFallbackSummary(messages: Message[]): string {
  const lastMessage = messages[messages.length - 1];

  // 위치 공유
  if (lastMessage.location) {
    return "상대방이 위치를 공유했어요.";
  }

  // 텍스트 메시지
  if (lastMessage.text) {
    const text = lastMessage.text.trim();

    // 가격 관련 키워드
    if (text.includes("원") || text.includes("가격") || text.includes("비용")) {
      return "상대방이 가격에 대해 이야기했어요.";
    }

    // 시간 관련 키워드
    if (
      text.includes("시") ||
      text.includes("시간") ||
      text.includes("오늘") ||
      text.includes("내일") ||
      text.includes("거래")
    ) {
      return "상대방이 거래 시간에 대해 이야기했어요.";
    }

    // 위치 관련 키워드
    if (
      text.includes("위치") ||
      text.includes("장소") ||
      text.includes("만나") ||
      text.includes("직거래")
    ) {
      return "상대방이 거래 장소에 대해 이야기했어요.";
    }

    // 기본: 최근 메시지 읽기
    if (text.length > 50) {
      return `상대방의 최근 메시지: ${text.substring(0, 50)}...`;
    }
    return `상대방의 최근 메시지: ${text}`;
  }

  // 기본 응답
  return "상대방의 메시지가 있어요.";
}
