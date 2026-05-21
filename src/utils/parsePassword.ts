// parsePassword.ts

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

  Object.entries(pwKoreanDigitMap).forEach(([k, v]) => {
    text = text.replace(new RegExp(k, "g"), v);
  });

  // 영문/숫자/기본 특수문자만 허용 (너 규칙에 맞게 조정 가능)
  // 여기서 너무 세게 필터링하고 싶지 않으면 이 줄은 주석 처리해도 됨.
  // text = text.replace(/[^a-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/g, "");

  return text;
};

