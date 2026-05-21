// src/voice/extractDigits.ts
// 🔥 한국어/영어 숫자를 아라비아 숫자로 변환하는 유틸리티

/**
 * 한국어 숫자 단어를 아라비아 숫자로 변환
 */
const koreanToNumber: Record<string, string> = {
  "영": "0", "공": "0", "제로": "0",
  "일": "1", "하나": "1", "원": "1",
  "이": "2", "둘": "2",
  "삼": "3", "셋": "3",
  "사": "4", "넷": "4",
  "오": "5", "다섯": "5",
  "육": "6", "륙": "6", "여섯": "6",
  "칠": "7", "일곱": "7",
  "팔": "8", "여덟": "8",
  "구": "9", "아홉": "9",
};

/**
 * 영어 숫자 단어를 아라비아 숫자로 변환
 */
const englishToNumber: Record<string, string> = {
  "zero": "0", "oh": "0", "o": "0",
  "one": "1",
  "two": "2", "to": "2", "too": "2",
  "three": "3",
  "four": "4", "for": "4",
  "five": "5",
  "six": "6",
  "seven": "7",
  "eight": "8",
  "nine": "9",
};

/**
 * 텍스트에서 숫자를 추출 (한국어/영어 숫자 단어 포함)
 * @param text 입력 텍스트 (예: "일 이 삼 사 오 육", "one two three", "123456", "123 456")
 * @returns 추출된 숫자 문자열 (예: "123456")
 */
export function extractDigits(text: string): string {
  if (!text || !text.trim()) {
    return "";
  }

  // 🔥 1단계: 이미 아라비아 숫자가 포함된 경우 직접 추출
  const directDigits = text.replace(/[^0-9]/g, "");
  if (directDigits.length >= 4) {
    console.log("[extractDigits] 직접 숫자 추출:", directDigits);
    return directDigits;
  }

  // 🔥 2단계: 한국어 숫자 단어 변환
  let normalized = text.toLowerCase().trim();
  
  // 공백 제거 후 한국어 숫자 단어 매칭
  for (const [korean, digit] of Object.entries(koreanToNumber)) {
    const regex = new RegExp(korean, "gi");
    normalized = normalized.replace(regex, digit);
  }

  // 🔥 3단계: 영어 숫자 단어 변환
  for (const [english, digit] of Object.entries(englishToNumber)) {
    const regex = new RegExp(`\\b${english}\\b`, "gi");
    normalized = normalized.replace(regex, digit);
  }

  // 🔥 4단계: 최종 숫자 추출
  const finalDigits = normalized.replace(/[^0-9]/g, "");
  
  console.log("[extractDigits] 원본:", text, "→ 정규화:", normalized, "→ 추출:", finalDigits);
  
  return finalDigits;
}

