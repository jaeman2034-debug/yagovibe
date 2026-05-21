// src/voice/parsePhoneNumber.ts
// 🔥 전화번호 음성 입력 파싱 (숫자만 추출 + 국가번호 제거)

const koreanDigitMap: Record<string, string> = {
  공: "0",
  영: "0",
  일: "1",
  이: "2",
  삼: "3",
  사: "4",
  오: "5",
  육: "6",
  륙: "6",
  칠: "7",
  팔: "8",
  구: "9",
};

/**
 * 국가번호 패턴 제거 (STT에서 국가번호 인식 방지)
 * @param text - STT 인식 결과
 * @returns 국가번호 패턴이 제거된 문자열
 */
function stripCountryCode(text: string): string {
  let cleaned = text;
  
  // 🔥 국가번호 패턴 제거: +82, 82, 팔이, 플러스 팔이 등
  // 공백이 있는 상태에서도 매칭되도록 \s* 사용
  cleaned = cleaned
    .replace(/^\s*\+?\s*82\s*/i, "") // +82, 82 제거 (공백 허용)
    .replace(/^\s*팔\s*이\s*/i, "") // 팔이 제거 (공백 허용)
    .replace(/^\s*팔이\s*/i, "") // 팔이 제거 (공백 없음)
    .replace(/^\s*플러스\s*팔\s*이\s*/i, "") // 플러스 팔 이 제거
    .replace(/^\s*플러스\s*팔이\s*/i, "") // 플러스 팔이 제거
    .replace(/^\s*플러스\s*팔\s*둘\s*/i, "") // 플러스 팔 둘 제거
    .replace(/^\s*국가\s*코드\s*/i, "") // 국가 코드 제거
    .replace(/^\s*코드\s*팔\s*이\s*/i, "") // 코드 팔 이 제거
    .replace(/^\s*코드\s*팔이\s*/i, "") // 코드 팔이 제거
    .trim();
  
  console.log("[parsePhoneNumber] 국가번호 제거 전:", text, "→ 제거 후:", cleaned);
  return cleaned;
}

/**
 * 숫자만 추출
 * @param text - 텍스트
 * @returns 숫자만 추출된 문자열
 */
function extractDigits(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

/**
 * 음성 입력에서 숫자만 추출 (누적 입력용)
 * 🔥 국가번호는 제거하고 국내 번호만 추출
 * @param raw - STT 인식 결과
 * @returns 숫자만 추출된 문자열 (국가번호 제외)
 */
export function parsePhoneNumber(raw: string): string {
  if (!raw) return "";

  // 🔥 1) 국가번호 패턴 제거 (공백 제거 전에 먼저 처리)
  // 공백이 있는 상태에서 패턴 매칭해야 "플러스 팔이" 같은 패턴도 잡을 수 있음
  let text = stripCountryCode(raw.toLowerCase());

  // 🔥 2) 공백 제거 (국가번호 제거 후)
  text = text.replace(/\s+/g, "");

  // 🔥 3) 한국어 숫자 → 아라비아 숫자 변환
  Object.entries(koreanDigitMap).forEach(([k, v]) => {
    text = text.replace(new RegExp(k, "g"), v);
  });

  // 🔥 4) 숫자만 추출
  const digits = extractDigits(text);

  console.log("[parsePhoneNumber] 최종 추출된 숫자:", digits);
  return digits;
}

