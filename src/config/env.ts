// ✅ 간단한 환경 자동 감지 및 설정
export const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_BASE = IS_LOCAL
  ? "http://localhost:5183"
  : "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

