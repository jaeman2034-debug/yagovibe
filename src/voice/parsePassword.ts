// src/voice/parsePassword.ts

const pwKoreanDigitMap: Record<string, string> = {
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

export const parsePassword = (raw: string): string => {
  if (!raw) return "";

  let text = raw.toLowerCase().replace(/\s+/g, "");

  // 🔥 한글 숫자 → 아라비아 숫자 변환
  Object.entries(pwKoreanDigitMap).forEach(([k, v]) => {
    text = text.replace(new RegExp(k, "g"), v);
  });

  // 🔥 숫자만 필터링 (강력 파서 적용)
  // STT가 단어로 인식하는 문제 해결: 숫자만 추출
  const digits = text.replace(/[^0-9]/g, "");

  return digits;
};

