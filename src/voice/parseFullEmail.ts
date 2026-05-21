// src/voice/parseFullEmail.ts

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

export function parseFullEmail(raw: string): { email: string } | null {
  if (!raw) return null;

  let text = raw.toLowerCase().replace(/\s+/g, "");

  // 1) 한국어 숫자 → 숫자
  text = Array.from(text)
    .map((ch) => (koreanDigitMap[ch] ? koreanDigitMap[ch] : ch))
    .join("");

  // 2) 골뱅이/점/도메인 발음 보정 (음성 교정 로직 강화)
  text = text
    .replace(/골뱅이|앳|에이티|at|엣|앗/g, "@")
    .replace(/점컴|닷컴|점컴|닷컴|점com|닷com/g, ".com")
    .replace(/점넷|닷넷|점net|닷net/g, ".net")
    .replace(/점케이알|닷케이알|점kr|닷kr/g, ".kr")
    .replace(/점오알지|닷오알지|점org|닷org/g, ".org")
    .replace(/점|닷|dot|\./g, ".");

  // 3) 한글 제거
  text = text.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, "");

  // 4) 점 정리
  text = text
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "")
    .replace(/[.,!?]+$/, "");

  // 5) @ 체크
  const atCount = (text.match(/@/g) || []).length;
  if (atCount !== 1) return null;

  let [localPart, domainPart] = text.split("@");
  if (!localPart || !domainPart) return null;

  // 6) e ↔ 2 오인식 보정

  // (1) "jaemane034" → "jaeman2034"
  // 패턴: 알파벳 + e + 숫자 → 알파벳 + 2 + 숫자
  localPart = localPart.replace(/([a-z])e(\d)/g, "$12$2");

  // (2) "ja2man" → "jaeman"
  // 패턴: 알파벳 + 2 + 알파벳 → 알파벳 + e + 알파벳
  localPart = localPart.replace(/([a-z])2([a-z])/g, "$1e$2");

  // 7) 도메인 오인식 보정
  domainPart = domainPart
    .replace(/^gmail\.?com$/, "gmail.com")
    .replace(/^naver\.?com$/, "naver.com")
    .replace(/^daum\.?(net|com)$/, "daum.net");

  const email = `${localPart}@${domainPart}`.toLowerCase();

  // 8) 이메일 정규식 검증
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) return null;

  return { email };
}

