const STORAGE_KEY = "yago-matchmaking-client-id";

/** 탭별 고유 ID — 멀티탭 큐 중복 방지 */
export function getMatchmakingClientId(): string {
  if (typeof sessionStorage === "undefined") {
    return `ssr-${Date.now()}`;
  }
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
