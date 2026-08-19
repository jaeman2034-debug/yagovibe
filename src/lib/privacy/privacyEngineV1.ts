/**
 * Privacy Engine v1 — client constants (display / docs only; upload uses CF)
 * @see docs/PRIVACY_ENGINE_V1.md
 */
export const PRIVACY_ENGINE_VERSION = "v1.0.0";
export const PRIVACY_PATENT_APPLICATION_NO = "10-2026-0103289";

export function isPrivacyEngineV1Enabled(): boolean {
  const v = import.meta.env.VITE_PRIVACY_ENGINE_V1 as string | undefined;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return false;
}

export const PRIVACY_STORAGE_LAYOUT = {
  raw: "teams/{teamId}/aiIngest/raw/{mediaId}.mp4",
  anonymized: "teams/{teamId}/aiIngest/anonymized/{mediaId}.mp4",
  legacy: "teams/{teamId}/aiIngest/media/{mediaId}.mp4",
} as const;
