/**
 * 🔐 Security Configuration
 * 보안 설정
 */

/**
 * API 키 검증
 */
export function validateApiKeys(): {
  openai: boolean;
  places: boolean;
} {
  const openai = !!process.env.OPENAI_API_KEY;
  const places = !!process.env.GMAPS_API_KEY;

  if (!openai) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  // Places는 선택적 (없으면 검색만)
  if (!places) {
    console.warn('⚠️ GMAPS_API_KEY is not set, Places features disabled');
  }

  return { openai, places };
}

/**
 * 환경 변수 검증
 */
export function validateEnvironment(): void {
  validateApiKeys();

  // NODE_ENV 검증
  const env = process.env.NODE_ENV || 'development';
  if (!['development', 'staging', 'production'].includes(env)) {
    throw new Error(`Invalid NODE_ENV: ${env}`);
  }
}
