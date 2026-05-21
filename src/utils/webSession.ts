/**
 * 🔐 웹 세션 관리 유틸
 * 
 * 역할:
 * - 웹 세션 ID 생성 및 저장
 * - 세션 ID는 QR 토큰과 1:1 바인딩
 */

/**
 * 웹 세션 ID 생성 (고유한 세션 식별자)
 * 
 * @returns 세션 ID (UUID v4 형식)
 */
export function generateWebSessionId(): string {
  // UUID v4 생성 (간단한 버전)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 현재 웹 세션 ID 가져오기 (없으면 생성)
 * 
 * @returns 세션 ID
 */
export function getOrCreateWebSessionId(): string {
  const STORAGE_KEY = 'yago_web_session_id';
  
  // localStorage에서 기존 세션 ID 확인
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  
  // 새 세션 ID 생성 및 저장
  const sessionId = generateWebSessionId();
  localStorage.setItem(STORAGE_KEY, sessionId);
  
  return sessionId;
}

/**
 * 웹 세션 ID 초기화 (새 세션 시작)
 * 
 * @returns 새로운 세션 ID
 */
export function resetWebSessionId(): string {
  const STORAGE_KEY = 'yago_web_session_id';
  const sessionId = generateWebSessionId();
  localStorage.setItem(STORAGE_KEY, sessionId);
  return sessionId;
}
