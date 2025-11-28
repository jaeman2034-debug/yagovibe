// *******************************
// Cloud Run URLs (Firebase Functions v2)
// *******************************

// 공통 API 엔드포인트 (다양한 AI 분석 기능 제공)
// Cloud Run URL 사용 (VITE_FUNCTIONS_ORIGIN 환경 변수 우선)
export const FUNCTIONS_ORIGIN =
  import.meta.env.VITE_FUNCTIONS_ORIGIN ||
  import.meta.env.VITE_API_ENDPOINT ||
  "https://api-2q3hdcfwca-du.a.run.app";

// 이미지 + 음성 AI 분석 함수 (별도 Cloud Run URL)
export const IMAGE_ANALYZE_ENDPOINT =
  import.meta.env.VITE_IMAGE_ANALYZE_URL ||
  "https://handleimageandvoiceanalyze-2q3hdcfwca-du.a.run.app";

// 태그 생성 함수 (Cloud Run URL)
export const TAGS_FUNCTION_ORIGIN =
  import.meta.env.VITE_GENERATE_TAGS_URL ||
  "https://generatetags-2q3hdcfwca-asia-northeast3.run.app";

// 검색 메타 생성 함수 (Cloud Run URL)
export const SEARCH_META_FUNCTION_ORIGIN =
  import.meta.env.VITE_GENERATE_SEARCH_META_URL ||
  "https://generatesearchmeta-2q3hdcfwca-du.a.run.app";

// NLU 서버 URL (Firebase Functions v2 - Cloud Run)
export const NLU_ENDPOINT =
  import.meta.env.VITE_NLU_ENDPOINT ||
  "https://nluhandler-2q3hdcfwca-du.a.run.app";

// Voice Report URL (Firebase Functions v1)
export const VOICE_REPORT_ENDPOINT =
  import.meta.env.VITE_VOICE_REPORT_ENDPOINT ||
  "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/vibeReport";

// 상품 자동 분석 함수 (Cloud Functions URL)
export const ANALYZE_PRODUCT_ENDPOINT =
  import.meta.env.VITE_ANALYZE_PRODUCT_URL ||
  `${FUNCTIONS_ORIGIN}/analyzeProduct`;
