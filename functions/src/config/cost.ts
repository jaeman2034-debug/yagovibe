/**
 * 💰 Cost Configuration
 * 비용 상한 고정
 */

/**
 * Places API 재시도 최대 횟수
 */
export const PLACES_MAX_RETRIES = 1; // 총 2회 (0, 1) - Latency 최적화

/**
 * 서버 타임아웃 (ms)
 */
export const SERVER_TIMEOUT_MS = 2500; // 2.5초

/**
 * 비용 추정 (명령 1회당)
 */
export const ESTIMATED_COST_PER_COMMAND = {
  // LLM 1회: GPT-4o-mini
  llm: 0.001, // ~$0.001
  // Places 1회: Google Places API
  places: 0.017, // ~$0.017 (per 1000 requests)
  // 총 (NAVIGATE 기준): LLM 1회 + Places 1~3회
  max: 0.001 + 0.017 * 3, // ~$0.052
  // 평균 (SEARCH 70% + NAVIGATE 30% 가정)
  avg: 0.001 + 0.017 * 0.9, // ~$0.016
};
