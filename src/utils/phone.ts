/**
 * 전화번호에서 ASCII 숫자만 추출 (팀 멤버 저장·PDF 파싱·중복 비교 공통).
 * 국제 SMS용 E.164 변환은 `normalizePhoneNumber` 사용.
 */
export function normalizePhoneDigits(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/\D/g, "");
}

/**
 * 저장 값(숫자만 또는 하이픈 포함) → 화면 표시용
 * - 휴대폰 10·11자리: `010-1234-5678` 형태
 * - 지역/내선 8자리(01로 시작하지 않음): `9914-0121`
 * - 7자리: `xxx-xxxx`
 * - 그 외는 숫자만 그대로 반환
 */
export function formatPhoneDigitsForDisplay(input: string | null | undefined): string {
  const p = normalizePhoneDigits(input);
  if (!p) return "";
  if (/^01[0-9]{8,9}$/.test(p)) {
    if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
    return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  }
  if (p.length === 8 && !p.startsWith("01")) return `${p.slice(0, 4)}-${p.slice(4)}`;
  if (p.length === 7) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}

/**
 * 한국 휴대폰 입력 → E.164
 * - 하이픈·공백 등 비숫자 제거 후 처리
 * - 82로 시작하면 `+`만 붙임 (+8210…)
 * - 0으로 시작하면 선행 0 제거 후 +82 붙임
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) return "";

  let numbers = normalizePhoneDigits(input);
  if (!numbers) return "";

  if (numbers.startsWith("82")) {
    return `+${numbers}`;
  }

  if (numbers.startsWith("0")) {
    numbers = numbers.substring(1);
  }

  return `+82${numbers}`;
}

/**
 * 국내 휴대폰 형식만 허용 (입력은 자유, 검증은 숫자만 기준)
 * - 11자리: 010 / 011 / 016~019
 * - 10자리: 앞 0 생략 (1012345678 등)
 */
export function isValidKoreanPhone(input: string): boolean {
  const numbers = normalizePhoneDigits(input);
  if (/^01[016789]\d{7,8}$/.test(numbers)) return true;
  return /^1[016789]\d{8}$/.test(numbers) && numbers.length === 10;
}
