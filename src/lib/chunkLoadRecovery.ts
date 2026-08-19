/**
 * Hosting deploy 후 stale lazy chunk manifest → 동적 import 404 복구.
 * 첫 실패: sessionStorage 마커 + 1회 hard reload. 재실패: UI fallback.
 */

export const CHUNK_RELOAD_STORAGE_KEY = "yago_vite_chunk_reload_ts";
const RELOAD_COOLDOWN_MS = 45_000;

export function isChunkLoadError(error: unknown): boolean {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message, error.name);
    const cause = error.cause;
    if (cause instanceof Error) parts.push(cause.message);
    else if (typeof cause === "string") parts.push(cause);
  } else if (typeof error === "string") {
    parts.push(error);
  } else if (error && typeof error === "object" && "message" in error) {
    parts.push(String((error as { message: unknown }).message));
  }

  const msg = parts.join(" ");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /dynamically imported module/i.test(msg)
  );
}

/** @returns true if a full page reload was triggered */
export function tryAutoReloadOnce(): boolean {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const raw = sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
  if (raw) {
    const ts = Number.parseInt(raw, 10);
    if (Number.isFinite(ts) && now - ts < RELOAD_COOLDOWN_MS) {
      return false;
    }
  }

  sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
  window.location.reload();
  return true;
}

export function clearChunkReloadMarker(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
}

let installed = false;

/** Call once from main.tsx before React mount */
export function installChunkLoadRecovery(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("load", () => {
    window.setTimeout(clearChunkReloadMarker, 10_000);
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    tryAutoReloadOnce();
  });

  window.addEventListener(
    "error",
    (event) => {
      const candidate = event.error ?? event.message;
      if (!isChunkLoadError(candidate)) return;
      if (tryAutoReloadOnce()) {
        event.preventDefault();
      }
    },
    true,
  );
}

/** Lazy import catch + ErrorBoundary */
export function handleChunkImportFailure(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  return tryAutoReloadOnce();
}
