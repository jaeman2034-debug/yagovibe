/**
 * 🤖 채팅 추천 문장 생성 유틸리티 (실전용)
 * 
 * 대화 맥락을 분석하여 적절한 추천 문장 생성
 * - 상황 판단 (INIT, ASKING, NEGOTIATION, CONFIRM)
 * - 룰 기반 추천 (즉시 체감)
 * - AI 보강 (선택)
 * - 최대 3개 추천
 */

interface Message {
  text?: string;
  location?: { lat: number; lng: number };
  senderId: string;
  createdAt?: any;
}

type ChatScenario = 'INIT' | 'ASKING' | 'NEGOTIATION' | 'CONFIRM';

interface ChatContext {
  messages: Message[];
  myUid: string;
  isBuyer: boolean;
  productStatus?: "ACTIVE" | "SOLD" | "DELETED";
  hasAskedAvailability?: boolean;
  availabilityConfirmed?: boolean;
  hasAskedTime?: boolean;
  timeConfirmed?: boolean;
  hasSharedLocation?: boolean;
  hasAskedPrice?: boolean;
  scenario?: ChatScenario;
}

/**
 * 추천 문장 데이터 구조 (실전용)
 */
const RECOMMENDED_MESSAGES: Record<ChatScenario, string[]> = {
  INIT: [
    "안녕하세요! 아직 판매 중일까요?",
    "상품 상태가 어떤지 궁금해요.",
    "직거래 가능한가요?",
  ],
  ASKING: [
    "네, 아직 가능합니다.",
    "오늘 거래도 가능해요.",
    "네, 말씀해 주세요!",
  ],
  NEGOTIATION: [
    "그 가격에 가능합니다.",
    "조금만 조정 가능해요.",
    "오늘 몇 시쯤 가능할까요?",
  ],
  CONFIRM: [
    "그럼 오늘 그 시간에 뵐게요.",
    "위치 공유해주시면 갈게요.",
    "거래 확정할까요?",
  ],
};

/**
 * 채팅 상황 판단 (핵심 로직)
 */
function getChatScenario(messages: Message[], myUid: string): ChatScenario {
  // INIT: 채팅 0~1개
  if (messages.length <= 1) {
    return 'INIT';
  }

  const lastMessage = messages[messages.length - 1];
  const secondLastMessage = messages.length > 1 ? messages[messages.length - 2] : null;

  // ASKING: 상대가 질문함
  if (lastMessage.senderId !== myUid) {
    const text = (lastMessage.text || "").toLowerCase();
    if (
      text.includes("?") ||
      text.includes("가능") ||
      text.includes("있") ||
      text.includes("어떤") ||
      text.includes("언제") ||
      text.includes("어디")
    ) {
      return 'ASKING';
    }
  }

  // NEGOTIATION: 가격/시간 언급
  const recentMessages = messages.slice(-5);
  const hasPriceMention = recentMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return text.includes("원") || text.includes("가격") || text.includes("비용");
  });
  const hasTimeMention = recentMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return text.includes("시") || text.includes("시간") || text.includes("오늘") || text.includes("내일");
  });

  if (hasPriceMention || hasTimeMention) {
    return 'NEGOTIATION';
  }

  // CONFIRM: 약속 확정 직전 (위치 공유 또는 시간 확정)
  if (lastMessage.location || secondLastMessage?.location) {
    return 'CONFIRM';
  }

  const confirmKeywords = ["확정", "그럼", "좋아", "네", "알겠", "만나"];
  if (recentMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return confirmKeywords.some((keyword) => text.includes(keyword));
  })) {
    return 'CONFIRM';
  }

  // 기본: ASKING
  return 'ASKING';
}

/**
 * 채팅 맥락 분석
 */
function analyzeContext(messages: Message[], myUid: string): ChatContext {
  const myMessages = messages.filter((m) => m.senderId === myUid);
  const otherMessages = messages.filter((m) => m.senderId !== myUid);

  // 가용성 질문 확인
  const hasAskedAvailability = myMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return (
      text.includes("판매") ||
      text.includes("가능") ||
      text.includes("있") ||
      text.includes("아직")
    );
  });

  // 가용성 확인됨
  const availabilityConfirmed = otherMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return (
      text.includes("가능") ||
      text.includes("있") ||
      text.includes("네") ||
      text.includes("예")
    );
  });

  // 시간 질문 확인
  const hasAskedTime = myMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return (
      text.includes("시") ||
      text.includes("시간") ||
      text.includes("언제") ||
      text.includes("오늘") ||
      text.includes("내일")
    );
  });

  // 시간 확인됨
  const timeConfirmed = otherMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return text.includes("시") || text.includes("시간") || text.includes("오늘") || text.includes("내일");
  });

  // 위치 공유 확인
  const hasSharedLocation = messages.some((m) => !!m.location);

  // 가격 질문 확인
  const hasAskedPrice = myMessages.some((m) => {
    const text = (m.text || "").toLowerCase();
    return text.includes("가격") || text.includes("원") || text.includes("비용");
  });

  const scenario = getChatScenario(messages, myUid);

  return {
    messages,
    myUid,
    isBuyer: true, // 기본값 (실제로는 room에서 확인)
    hasAskedAvailability,
    availabilityConfirmed,
    hasAskedTime,
    timeConfirmed,
    hasSharedLocation,
    hasAskedPrice,
    scenario,
  };
}

/**
 * 룰 기반 추천 문장 생성 (상황별 추천 - 실전용)
 */
function getRuleBasedSuggestions(context: ChatContext): string[] {
  // 🔥 상황별 추천 문장 사용
  const scenario = context.scenario || 'INIT';
  const scenarioMessages = RECOMMENDED_MESSAGES[scenario] || RECOMMENDED_MESSAGES.INIT;

  // 구매자/판매자에 따라 조정
  let suggestions: string[] = [];

  if (context.isBuyer) {
    // 구매자용 추천
    suggestions = [...scenarioMessages];
  } else {
    // 판매자용 추천 (상황에 맞게 조정)
    if (scenario === 'INIT') {
      suggestions = ["네, 말씀해 주세요!", "아직 판매 중입니다.", "직거래 가능해요."];
    } else if (scenario === 'ASKING') {
      suggestions = ["네, 가능합니다.", "오늘 거래 가능해요.", "그 가격에 가능합니다."];
    } else {
      suggestions = [...scenarioMessages];
    }
  }

  // 기존 룰 기반 로직도 유지 (상황별 추천이 부족할 때)
  if (suggestions.length < 2) {
    if (!context.hasAskedAvailability && !context.availabilityConfirmed) {
      suggestions.push("아직 판매 중인가요?");
    }
    if (context.availabilityConfirmed && !context.hasAskedTime && !context.timeConfirmed) {
      suggestions.push("오늘 거래 가능할까요?");
    }
    if (context.timeConfirmed && !context.hasSharedLocation) {
      suggestions.push("거래 위치가 어디쯤일까요?");
    }
  }

  return suggestions.slice(0, 3); // 최대 3개
}

/**
 * AI 기반 추천 문장 생성 (선택)
 */
async function getAISuggestions(
  context: ChatContext
): Promise<string[]> {
  try {
    const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
      "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

    const messageContext = context.messages
      .slice(-10)
      .map((m) => {
        const sender = m.senderId === context.myUid ? "나" : "상대";
        if (m.location) {
          return `${sender}: 위치 공유`;
        }
        return `${sender}: ${m.text || ""}`;
      })
      .filter((line) => line.trim())
      .join("\n");

    const response = await fetch(
      `${functionsOrigin}/chatSummaryAndSuggestions?type=suggestions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messageContext,
          myUid: context.myUid,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        return data.suggestions.slice(0, 3);
      }
    }
  } catch (error) {
    console.warn("🤖 [chatSuggestions] AI 추천 실패, 룰 기반 사용:", error);
  }

  return [];
}

/**
 * 추천 문장 생성 (메인 함수)
 * 
 * @param messages - 최근 메시지 목록
 * @param myUid - 내 사용자 ID
 * @param isBuyer - 구매자 여부
 * @param productStatus - 상품 상태
 * @param useAI - AI 사용 여부 (기본: false, 룰 기반만 사용)
 */
export async function getChatSuggestions({
  messages,
  myUid,
  isBuyer = true,
  productStatus = "ACTIVE",
  useAI = false,
}: {
  messages: Message[];
  myUid: string;
  isBuyer?: boolean;
  productStatus?: "ACTIVE" | "SOLD" | "DELETED";
  useAI?: boolean;
}): Promise<string[]> {
  if (messages.length === 0) {
    // 첫 메시지 추천
    if (isBuyer) {
      return ["안녕하세요!", "직거래 가능한가요?"];
    } else {
      return ["네, 말씀해 주세요!"];
    }
  }

  // 맥락 분석
  const context = analyzeContext(messages, myUid);
  context.isBuyer = isBuyer;
  context.productStatus = productStatus;

  // 룰 기반 추천 (항상 사용)
  const ruleBased = getRuleBasedSuggestions(context);

  // AI 추천 (선택)
  if (useAI) {
    const aiSuggestions = await getAISuggestions(context);
    // AI 결과를 룰 기반에 추가 (중복 제거)
    const combined = [...ruleBased];
    for (const ai of aiSuggestions) {
      if (!combined.includes(ai) && combined.length < 3) {
        combined.push(ai);
      }
    }
    return combined.slice(0, 3);
  }

  return ruleBased;
}
