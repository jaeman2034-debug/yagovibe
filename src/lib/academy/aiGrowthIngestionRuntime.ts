/** AI Growth YouTube ingestion — local emulator + yago-worker (Phase B B1). */

export function functionsEmulatorConnected(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { __YAGO_FUNCTIONS_EMULATOR__?: boolean }).__YAGO_FUNCTIONS_EMULATOR__);
}

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** Firebase Hosting / web.app (Whisper worker는 로컬 8787에 없음). */
export function isProductionWebHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (isLocalDevHost()) return false;
  return host.endsWith(".web.app") || host.endsWith(".firebaseapp.com");
}

/**
 * Phase B — 운영 Whisper (선택).
 * Functions에 공개 worker URL + `VITE_YAGO_INGEST_PROD_ENABLED=true` 배포 후에만 true.
 */
export function canRunYoutubeIngestionOnProd(): boolean {
  if (!isProductionWebHost()) return false;
  if (import.meta.env.VITE_YAGO_INGEST_PROD_ENABLED !== "true") return false;
  const url = import.meta.env.VITE_YAGO_INGEST_PIPELINE_PUBLIC_URL?.trim();
  return Boolean(url);
}

/** 로컬 emulator+worker 또는 (설정 시) 운영 공개 worker. */
export function canRunYoutubeIngestion(): boolean {
  if (isLocalDevHost() && functionsEmulatorConnected()) return true;
  return canRunYoutubeIngestionOnProd();
}

export function youtubeIngestionBlockedReason(): string | null {
  if (canRunYoutubeIngestion()) return null;
  if (isLocalDevHost()) {
    return "Functions Emulator 미연결입니다. .env.local에 VITE_USE_EMULATOR=true 설정 후 dev 서버를 재시작해 주세요.";
  }
  if (isProductionWebHost()) {
    return youtubeIngestionProdClickNotice();
  }
  return "YouTube 자동 전사는 validation 전용 환경입니다. 아래 입력란에 자막을 직접 입력해 주세요.";
}

/** 운영 web.app — 「URL 기반 transcript 가져오기」 클릭 시 표시 (A안 UX). */
export function youtubeIngestionProdClickNotice(): string {
  return "운영(web.app)에서는 Whisper worker가 없어 YouTube URL에서 자막을 가져올 수 없습니다. 「샘플 자막으로 채우기」 후 「AI 태깅 실행」을 사용하거나, 실제 전사는 PC 로컬(emulator + worker 8787)에서 진행하세요.";
}

export function ingestionRuntimeLabel(): string {
  if (isLocalDevHost() && functionsEmulatorConnected()) {
    return "로컬 — Functions emulator 연결됨 (5001)";
  }
  if (canRunYoutubeIngestionOnProd()) {
    return "운영 — Callable + Cloud Run (mock-whisper, Sprint 9D)";
  }
  if (isLocalDevHost()) return "로컬 — 미연결 (VITE_USE_EMULATOR=true 필요)";
  if (isProductionWebHost()) {
    return "운영 — Whisper 미연결 (로컬 worker 없음 · 샘플/수동 데모)";
  }
  return "자동 전사 비활성 (수동 입력)";
}

export type WhisperPipelineMode =
  | "local_whisper"
  | "local_disconnected"
  | "prod_demo_manual"
  | "prod_cloud"
  | "other";

export function whisperPipelineMode(): WhisperPipelineMode {
  if (isLocalDevHost() && functionsEmulatorConnected()) return "local_whisper";
  if (isLocalDevHost()) return "local_disconnected";
  if (canRunYoutubeIngestionOnProd()) return "prod_cloud";
  if (isProductionWebHost()) return "prod_demo_manual";
  return "other";
}
