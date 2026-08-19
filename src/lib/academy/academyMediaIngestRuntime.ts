/** Sprint 10B-1d — Academy MP4 upload ingest (prod Callable + Cloud Run Whisper). */

/**
 * Functions `ACADEMY_MEDIA_MAX_BYTES`(500MB)와 동일.
 * Worker 청크 파이프라인(10B-1c)으로 대용량 MP4 전사 지원 — 클라이언트만 200MB로 막으면 업로드가 무응답처럼 보임.
 */
export const ACADEMY_MP4_MAX_BYTES = 500 * 1024 * 1024;

export function canRunAcademyMp4Ingestion(): boolean {
  if (import.meta.env.VITE_ACADEMY_UPLOAD_INGEST_ENABLED === "false") return false;
  return true;
}

export function academyMp4IngestionBlockedReason(): string | null {
  if (canRunAcademyMp4Ingestion()) return null;
  return "Academy MP4 업로드 ingest가 비활성화되어 있습니다 (VITE_ACADEMY_UPLOAD_INGEST_ENABLED=false).";
}

export function academyMp4RuntimeLabel(): string {
  return "운영 — MP4 Storage → Callable → Cloud Run Whisper (10B-1c)";
}
