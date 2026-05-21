// src/voice/voiceParsers.ts
// 🔥 이메일/비밀번호 파서 (통합 버전)

/**
 * 이메일 파싱 (기존 parseFullEmail.ts 기반)
 * 반환: 파싱된 이메일 문자열 또는 null
 */
export function parseFullEmail(raw: string): string | null {
  if (!raw) return null;
  
  let text = raw.toLowerCase().replace(/\s+/g, "");
  
  // 한국어 숫자 → 숫자 변환
  const koreanDigitMap: Record<string, string> = {
    공: "0", 영: "0", 일: "1", 이: "2", 삼: "3", 사: "4", 오: "5", 육: "6", 륙: "6", 칠: "7", 팔: "8", 구: "9",
  };
  
  text = Array.from(text)
    .map((ch) => (koreanDigitMap[ch] ? koreanDigitMap[ch] : ch))
    .join("");
  
  // 골뱅이/점/도메인 발음 보정
  text = text
    .replace(/골뱅이|앳|에이티|at/g, "@")
    .replace(/점컴|닷컴/g, ".com")
    .replace(/점넷|닷넷/g, ".net")
    .replace(/점케이알|닷케이알/g, ".kr")
    .replace(/점/g, ".");
  
  // 한글 제거
  text = text.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, "");
  
  // 점 정리
  text = text
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "")
    .replace(/[.,!?]+$/, "");
  
  // @ 체크
  const atCount = (text.match(/@/g) || []).length;
  if (atCount !== 1) return null;
  
  let [localPart, domainPart] = text.split("@");
  if (!localPart || !domainPart) return null;
  
  // e ↔ 2 오인식 보정
  // (1) "jaemane034" → "jaeman2034"
  // 패턴: 알파벳 + e + 숫자 → 알파벳 + 2 + 숫자
  localPart = localPart.replace(/([a-z])e(\d)/g, "$12$2");
  
  // (2) "ja2man" → "jaeman"
  // 패턴: 알파벳 + 2 + 알파벳 → 알파벳 + e + 알파벳
  localPart = localPart.replace(/([a-z])2([a-z])/g, "$1e$2");
  
  // 도메인 오인식 보정
  domainPart = domainPart
    .replace(/^gmail\.?com$/, "gmail.com")
    .replace(/^naver\.?com$/, "naver.com")
    .replace(/^daum\.?(net|com)$/, "daum.net");
  
  const email = `${localPart}@${domainPart}`.toLowerCase();
  
  // 이메일 정규식 검증
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) return null;
  
  return email;
}

/**
 * 비밀번호 파싱 (기존 parsePassword.ts 기반)
 */
const numMap: Record<string, string> = {
  영: "0",
  공: "0",
  일: "1",
  하나: "1",
  이: "2",
  둘: "2",
  삼: "3",
  셋: "3",
  사: "4",
  넷: "4",
  오: "5",
  육: "6",
  륙: "6",
  칠: "7",
  팔: "8",
  구: "9",
};

export function parsePassword(raw: string): string {
  if (!raw) return "";
  
  let text = raw.toLowerCase().replace(/\s+/g, "");
  
  // 한국어 숫자 → 숫자 변환
  Object.entries(numMap).forEach(([k, v]) => {
    text = text.replace(new RegExp(k, "g"), v);
  });
  
  return text;
}

