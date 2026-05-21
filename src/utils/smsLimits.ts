/**
 * 🔥 SMS 제한 관리 (어뷰징 방어)
 * 
 * 역할:
 * - 국가별 SMS 허용 전략
 * - IP 기반 제한 (클라이언트 레벨, 서버 확장 가능)
 * - 하루 제한 관리
 */

// 🔥 허용된 국가 코드 (초기: 한국만)
const ALLOWED_COUNTRIES = ["+82"]; // KR만 허용

// 🔥 일일 제한 (클라이언트 레벨, 서버에서 강화 권장)
const DAILY_LIMIT_PER_PHONE = 5; // 동일 번호 하루 5회
const DAILY_LIMIT_PER_IP = 20; // 동일 IP 하루 20회

// 🔥 일일 전송 기록 (메모리 기반, 서버로 확장 가능)
const dailyPhoneCount = new Map<string, number>();
const dailyIPCount = new Map<string, number>();
let lastResetDate = new Date().toDateString();

/**
 * 국가 코드 확인 및 리셋
 */
function resetDailyCountsIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyPhoneCount.clear();
    dailyIPCount.clear();
    lastResetDate = today;
  }
}

/**
 * 국가별 SMS 허용 여부 확인
 * 
 * @param phoneNumber - 전화번호 (예: "+821012345678")
 * @returns 허용 여부
 */
export function isCountryAllowed(phoneNumber: string): boolean {
  return ALLOWED_COUNTRIES.some((country) => phoneNumber.startsWith(country));
}

/**
 * 일일 제한 확인 (전화번호 기준)
 * 
 * @param phoneNumber - 전화번호
 * @returns 제한 초과 여부
 */
export function checkDailyPhoneLimit(phoneNumber: string): { allowed: boolean; remaining: number } {
  resetDailyCountsIfNeeded();
  
  const count = dailyPhoneCount.get(phoneNumber) ?? 0;
  const remaining = Math.max(0, DAILY_LIMIT_PER_PHONE - count);
  
  return {
    allowed: count < DAILY_LIMIT_PER_PHONE,
    remaining,
  };
}

/**
 * 일일 제한 확인 (IP 기준)
 * 
 * @param ip - IP 주소 (클라이언트에서는 추정값)
 * @returns 제한 초과 여부
 */
export function checkDailyIPLimit(ip?: string): { allowed: boolean; remaining: number } {
  resetDailyCountsIfNeeded();
  
  // 클라이언트에서는 정확한 IP를 알 수 없으므로, userAgent 기반 추정
  const clientId = ip || `client_${navigator.userAgent.substring(0, 50)}`;
  const count = dailyIPCount.get(clientId) ?? 0;
  const remaining = Math.max(0, DAILY_LIMIT_PER_IP - count);
  
  return {
    allowed: count < DAILY_LIMIT_PER_IP,
    remaining,
  };
}

/**
 * SMS 전송 기록 (일일 카운트 증가)
 * 
 * @param phoneNumber - 전화번호
 * @param ip - IP 주소 (선택)
 */
export function recordSMSAttempt(phoneNumber: string, ip?: string): void {
  resetDailyCountsIfNeeded();
  
  // 전화번호 카운트 증가
  const phoneCount = dailyPhoneCount.get(phoneNumber) ?? 0;
  dailyPhoneCount.set(phoneNumber, phoneCount + 1);
  
  // IP 카운트 증가
  const clientId = ip || `client_${navigator.userAgent.substring(0, 50)}`;
  const ipCount = dailyIPCount.get(clientId) ?? 0;
  dailyIPCount.set(clientId, ipCount + 1);
}

/**
 * 허용된 국가 코드 목록 조회
 */
export function getAllowedCountries(): string[] {
  return [...ALLOWED_COUNTRIES];
}
