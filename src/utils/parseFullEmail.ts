// parseFullEmail.ts

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

  // 한국어 숫자 → 숫자
  text = Array.from(text)
    .map((ch) => (koreanDigitMap[ch] ? koreanDigitMap[ch] : ch))
    .join("");

  // 발음 기반 특수기호 변환
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

  const atCount = (text.match(/@/g) || []).length;
  if (atCount !== 1) return null;

  let [localPart, domainPart] = text.split("@");
  if (!localPart || !domainPart) return null;

  // 숫자 2를 e로 오인식한 경우 (알파벳 사이)
  localPart = localPart.replace(/([a-z])2([a-z])/g, "$1e$2");

  // 도메인 보정
  domainPart = domainPart
    .replace(/^gmail\.?com$/, "gmail.com")
    .replace(/^naver\.?com$/, "naver.com")
    .replace(/^daum\.?(net|com)$/, "daum.net");

  const email = `${localPart}@${domainPart}`.toLowerCase();

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) return null;

  return { email };
}

