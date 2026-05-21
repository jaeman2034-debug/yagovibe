/**
 * 🎤 STT 결과 정제 유틸리티
 * 음성 인식 결과를 중고거래용 자연어로 정제
 */

/**
 * STT 원문을 중고거래용 자연스러운 문장으로 정제
 */
export function normalizeSpeechText(raw: string): string {
  let text = raw.trim();

  if (!text) return "";

  // 🔥 가격 말투 정리 (예: "삼천원" → "3,000원")
  text = text.replace(/(삼|셋)천원/g, "3,000원");
  text = text.replace(/(사|넷)천원/g, "4,000원");
  text = text.replace(/(오|다섯)천원/g, "5,000원");
  text = text.replace(/(육|여섯)천원/g, "6,000원");
  text = text.replace(/(칠|일곱)천원/g, "7,000원");
  text = text.replace(/(팔|여덟)천원/g, "8,000원");
  text = text.replace(/(구|아홉)천원/g, "9,000원");
  text = text.replace(/(일|하나)만원/g, "10,000원");
  text = text.replace(/(이|둘)만원/g, "20,000원");
  text = text.replace(/(삼|셋)만원/g, "30,000원");
  
  // 숫자 + "원" 패턴 정규화 (예: "3000원" → "3,000원")
  text = text.replace(/(\d+)원/g, (match, num) => {
    const numValue = parseInt(num, 10);
    return `${numValue.toLocaleString()}원`;
  });

  // 🔥 문장 끝 보정 (의문문으로 보이면 "?" 추가)
  if (!/[?.!]$/.test(text)) {
    // "가능", "있어", "할까" 등의 키워드가 있으면 의문문으로 처리
    if (/가능|있어|할까|어때|해요|되나/.test(text)) {
      text += "?";
    }
  }

  // 🔥 존댓말 보정 (간단한 경우)
  // "요"가 없고 의문문/평서문 끝이면 "요" 추가
  if (!text.includes("요") && !text.includes("습니다") && !text.includes("세요")) {
    // 단, 이미 문장이 끝났거나 특수문자가 있으면 건드리지 않음
    if (!/[?.!]$/.test(text)) {
      text += "요";
    }
  }

  // 🔥 띄어쓰기 간단 보정 (자주 쓰는 패턴)
  text = text.replace(/에가능/g, "에 가능");
  text = text.replace(/에할까/g, "에 할까");
  text = text.replace(/오늘저녁/g, "오늘 저녁");
  text = text.replace(/내일오전/g, "내일 오전");
  text = text.replace(/내일오후/g, "내일 오후");

  return text.trim();
}

/**
 * STT 텍스트에서 의도 분류
 */
export type SpeechIntent = "PRICE" | "CONDITION" | "SCHEDULE" | "LOCATION" | "GENERAL";

export function detectSpeechIntent(text: string): SpeechIntent {
  const lowerText = text.toLowerCase();

  // 가격 제안/질문
  if (/원|가격|얼마|에눌|싸게|비싸/.test(lowerText)) {
    return "PRICE";
  }

  // 상태 질문
  if (/상태|사용감|깨끗|좋은|나쁜|손상|사용/.test(lowerText)) {
    return "CONDITION";
  }

  // 거래 일정
  if (/언제|오늘|내일|모레|저녁|오전|오후|시간|가능/.test(lowerText)) {
    return "SCHEDULE";
  }

  // 위치 질문
  if (/어디|근처|위치|장소|직거래|택배/.test(lowerText)) {
    return "LOCATION";
  }

  return "GENERAL";
}

/**
 * STT 텍스트에서 가격 추출
 * 예: "삼천원에 가능할까요" → 3000
 */
export function extractPriceFromText(text: string): number | null {
  // 숫자 + "원" 패턴 찾기
  const priceMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*원/);
  if (priceMatch) {
    const priceStr = priceMatch[1].replace(/,/g, "");
    return parseInt(priceStr, 10);
  }

  // 한글 숫자 패턴 (간단한 버전)
  const koreanNumbers: { [key: string]: number } = {
    일: 1, 이: 2, 삼: 3, 사: 4, 오: 5,
    육: 6, 칠: 7, 팔: 8, 구: 9,
  };
  
  const koreanMatch = text.match(/([일이삼사오육칠팔구])천원/);
  if (koreanMatch) {
    const num = koreanNumbers[koreanMatch[1]] || 0;
    return num * 1000;
  }

  // 만원 단위
  const manMatch = text.match(/([일이삼사오육칠팔구])만원/);
  if (manMatch) {
    const num = koreanNumbers[manMatch[1]] || 0;
    return num * 10000;
  }

  // 숫자만 있는 경우 (예: "3000원" 형식이 아닌 경우도 처리)
  const numberMatch = text.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
  if (numberMatch && /원|가격|에눌|가능/.test(text)) {
    let price = parseInt(numberMatch[0].replace(/,/g, ""), 10);
    // "천" 단위 보정
    if (/천/.test(text) && price < 1000) {
      price *= 1000;
    }
    return price;
  }

  return null;
}

/**
 * 🎤 멀티 의도 파서 (가격/시간/위치 동시 추출)
 * 예: "오늘 저녁에 강남역에서 삼천 원에 가능할까요?" → { price: 3000, time: "오늘 저녁", location: "강남역" }
 */
export interface SpeechParseResult {
  price?: number;
  time?: string;
  location?: string;
  originalText: string;
}

/**
 * 🧠 대화 맥락 메모리 (채팅방 단위 컨텍스트)
 */
export interface ChatContext {
  lastPriceOffer?: number;
  lastSchedule?: string;
  lastLocation?: string;
}

/**
 * 메시지에서 컨텍스트 업데이트
 * 🔥 변경이 없으면 기존 context를 그대로 반환 (참조 유지)
 */
export function updateContextFromMessage(text: string, context: ChatContext): ChatContext {
  const parsed = parseSpeechMultiIntent(text);
  
  // 변경사항이 있는지 확인
  const hasPriceChange = parsed.price && parsed.price !== context.lastPriceOffer;
  const hasTimeChange = parsed.time && parsed.time !== context.lastSchedule;
  const hasLocationChange = parsed.location && parsed.location !== context.lastLocation;
  
  // 변경사항이 없으면 기존 context 그대로 반환 (새 객체 생성 방지)
  if (!hasPriceChange && !hasTimeChange && !hasLocationChange) {
    return context;
  }
  
  // 변경사항이 있을 때만 새 객체 생성
  return {
    ...context,
    ...(parsed.price && { lastPriceOffer: parsed.price }),
    ...(parsed.time && { lastSchedule: parsed.time }),
    ...(parsed.location && { lastLocation: parsed.location }),
  };
}

/**
 * 🎯 컨텍스트와 STT 파싱 결과를 병합하여 제안 메시지 생성
 */
export interface ContextualSuggestion {
  message: string;
  type: "price" | "time" | "location" | "combined";
}

export function mergeContextAndSpeech(
  context: ChatContext,
  parsed: SpeechParseResult
): ContextualSuggestion | null {
  const price = parsed.price || context.lastPriceOffer;
  const time = parsed.time || context.lastSchedule;
  const location = parsed.location || context.lastLocation;

  // 모두 없으면 null
  if (!price && !time && !location) return null;

  // 모두 있으면 조합 메시지
  if (price && time && location) {
    return {
      message: `${price.toLocaleString()}원에 ${time} ${location} 근처에서 거래 가능할까요?`,
      type: "combined",
    };
  }

  // 가격 + 시간
  if (price && time) {
    return {
      message: `${price.toLocaleString()}원에 ${time} 거래 가능할까요?`,
      type: "combined",
    };
  }

  // 가격 + 위치
  if (price && location) {
    return {
      message: `${price.toLocaleString()}원에 ${location} 근처에서 거래 가능할까요?`,
      type: "combined",
    };
  }

  // 시간 + 위치
  if (time && location) {
    return {
      message: `${time} ${location} 근처에서 거래 가능할까요?`,
      type: "combined",
    };
  }

  // 단일 항목만 있는 경우 (원래 파싱 결과 사용)
  if (parsed.price) {
    return {
      message: `${parsed.price.toLocaleString()}원에 가능할까요?`,
      type: "price",
    };
  }
  if (parsed.time) {
    return {
      message: `${parsed.time} 거래 가능할까요?`,
      type: "time",
    };
  }
  if (parsed.location) {
    return {
      message: `${parsed.location} 근처에서 거래 가능할까요?`,
      type: "location",
    };
  }

  return null;
}

/**
 * 🏪 판매자 발화 파서 (상황 파악)
 * 판매자가 말하는 내용을 분석하여 응답 유형을 결정
 */
export interface SellerSpeechParse {
  type: "AVAILABLE" | "SOLD_OUT" | "SCHEDULE_REPLY" | "NO_DISCOUNT" | "LOCATION_REPLY" | "PRICE_REPLY" | "FREE_TEXT";
  originalText: string;
  extractedTime?: string;
  extractedLocation?: string;
}

export function parseSellerSpeech(text: string): SellerSpeechParse {
  const lowerText = text.toLowerCase();

  // 재고 상태 확인
  if (/있|판매.*중|아직|있어/.test(text)) {
    return { type: "AVAILABLE", originalText: text };
  }

  // 판매 완료
  if (/없|판매완료|팔렸|예약됨|거래완료/.test(text)) {
    return { type: "SOLD_OUT", originalText: text };
  }

  // 일정 답변
  if (/오늘.*어려|내일|모레|저녁|오후|오전|시간|가능/.test(text)) {
    // 시간 추출
    const timePatterns = [
      /오늘\s*(저녁|오후|밤|아침|오전)?/,
      /내일\s*(저녁|오후|밤|아침|오전)?/,
      /모레\s*(저녁|오후|밤|아침|오전)?/,
      /저녁|오후|밤|아침|오전/,
    ];
    let extractedTime: string | undefined;
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedTime = match[0].trim();
        break;
      }
    }
    return { type: "SCHEDULE_REPLY", originalText: text, extractedTime };
  }

  // 가격 조정 불가
  if (/최저|마지막|에눌.*불가|가격.*어려|그건.*어려|그건.*안|조정.*어려/.test(text)) {
    return { type: "NO_DISCOUNT", originalText: text };
  }

  // 위치 답변
  if (/역|근처|동|구|위치|장소/.test(text)) {
    // 위치 추출
    const locationPatterns = [
      /[\w가-힣]+역/,
      /[\w가-힣]+동/,
      /[\w가-힣]+구/,
      /[\w가-힣]+\s*근처/,
    ];
    let extractedLocation: string | undefined;
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedLocation = match[0].trim().replace(/\s*근처$/, "");
        break;
      }
    }
    return { type: "LOCATION_REPLY", originalText: text, extractedLocation };
  }

  // 가격 관련 답변 (명시적)
  if (/가격|원|얼마/.test(text)) {
    return { type: "PRICE_REPLY", originalText: text };
  }

  // 기본 텍스트
  return { type: "FREE_TEXT", originalText: text };
}

/**
 * 🎯 판매자 자동 응답 생성기
 * 파싱 결과와 컨텍스트를 기반으로 응답 후보 생성
 */
export interface SellerReplyOption {
  text: string;
  type: "AVAILABLE" | "SOLD_OUT" | "SCHEDULE_REPLY" | "NO_DISCOUNT" | "LOCATION_REPLY" | "PRICE_REPLY" | "FREE_TEXT";
}

export function generateSellerReplies(
  parsed: SellerSpeechParse,
  context: ChatContext
): SellerReplyOption[] {
  switch (parsed.type) {
    case "AVAILABLE":
      return [
        { text: "네 아직 판매 중입니다 😊", type: "AVAILABLE" },
        { text: "네, 아직 있습니다!", type: "AVAILABLE" },
      ];

    case "SOLD_OUT":
      return [
        { text: "죄송합니다. 이미 판매 완료되었습니다.", type: "SOLD_OUT" },
        { text: "판매 완료되었습니다. 관심 가져주셔서 감사합니다.", type: "SOLD_OUT" },
      ];

    case "NO_DISCOUNT":
      // 컨텍스트에서 이전 가격 제안이 있으면 언급
      if (context.lastPriceOffer) {
        return [
          { text: `${context.lastPriceOffer.toLocaleString()}원은 어렵고 현재 가격이 최저입니다.`, type: "NO_DISCOUNT" },
          { text: "죄송하지만 가격 조정은 어렵습니다 🙏", type: "NO_DISCOUNT" },
        ];
      }
      return [
        { text: "죄송하지만 가격 조정은 어렵습니다.", type: "NO_DISCOUNT" },
        { text: "현재 가격이 최저입니다 🙏", type: "NO_DISCOUNT" },
      ];

    case "SCHEDULE_REPLY":
      const time = parsed.extractedTime || context.lastSchedule || "내일";
      return [
        { text: `${time} 거래 가능합니다.`, type: "SCHEDULE_REPLY" },
        { text: `${time} 시간대 가능합니다!`, type: "SCHEDULE_REPLY" },
      ];

    case "LOCATION_REPLY":
      const location = parsed.extractedLocation || context.lastLocation || "지정한 장소";
      return [
        { text: `${location} 근처에서 거래 가능합니다.`, type: "LOCATION_REPLY" },
        { text: `${location}에서 거래 가능합니다!`, type: "LOCATION_REPLY" },
      ];

    case "PRICE_REPLY":
      if (context.lastPriceOffer) {
        return [
          { text: `${context.lastPriceOffer.toLocaleString()}원은 어렵습니다. 현재 가격이 최저입니다.`, type: "PRICE_REPLY" },
          { text: "가격 조정은 어렵습니다 🙏", type: "PRICE_REPLY" },
        ];
      }
      return [
        { text: "현재 가격이 최저입니다 🙏", type: "PRICE_REPLY" },
        { text: "가격 조정은 어렵습니다.", type: "PRICE_REPLY" },
      ];

    case "FREE_TEXT":
    default:
      return [{ text: parsed.originalText, type: "FREE_TEXT" }];
  }
}

/**
 * 🎯 거래 상태 트리거 감지
 * 대화 내용에서 거래 상태 전환 트리거를 감지
 */
export type DealStatus = "CHAT" | "OFFERED" | "RESERVED" | "COMPLETED" | "CANCELLED";

export function detectDealStatus(text: string): DealStatus | null {
  if (!text) return null;
  
  // 예약 트리거
  if (/예약|보기로|확정|만나기로|거래.*정|약속/.test(text)) {
    return "RESERVED";
  }
  
  // 완료 트리거
  if (/완료|수령|잘 받|받았|거래.*끝|구매.*완료/.test(text)) {
    return "COMPLETED";
  }
  
  // 취소 트리거
  if (/취소|안 할게|포기|그만|거래.*안/.test(text)) {
    return "CANCELLED";
  }
  
  // 가격 제안 트리거 (간단한 경우)
  if (/원.*가능|원에|제안|에눌/.test(text)) {
    return "OFFERED";
  }
  
  return null;
}

export function parseSpeechMultiIntent(text: string): SpeechParseResult {
  const result: SpeechParseResult = {
    originalText: text,
  };

  // 💰 가격 추출
  const price = extractPriceFromText(text);
  if (price) {
    result.price = price;
  }

  // 🕒 시간 추출
  const timePatterns = [
    /오늘\s*(저녁|오후|밤|아침|오전)?/,
    /내일\s*(저녁|오후|밤|아침|오전)?/,
    /모레\s*(저녁|오후|밤|아침|오전)?/,
    /저녁|오후|밤|아침|오전/,
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.time = match[0].trim();
      break;
    }
  }

  // 📍 위치 추출
  const locationPatterns = [
    /[\w가-힣]+역/, // "강남역", "홍대입구역" 등
    /[\w가-힣]+동/, // "역삼동", "청담동" 등
    /[\w가-힣]+구/, // "강남구", "서초구" 등
    /[\w가-힣]+\s*근처/, // "강남 근처" 등
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.location = match[0].trim().replace(/\s*근처$/, "");
      break;
    }
  }

  return result;
}

