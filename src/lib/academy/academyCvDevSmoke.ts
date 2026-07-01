/**
 * CV Layer pilot / I6 smoke — resolve academy mediaId for CV internal panels.
 *
 * URL: /growth/demo?cvMediaId=45b254c63a6249d68948e444
 * Dev env: VITE_CV_I6_SMOKE_MEDIA_ID
 */
import { GROWTH_VALIDATION_DEMO_PATH } from "@/lib/growth/growthPublicDemoConfig";

function readCvMediaIdFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("cvMediaId")?.trim() || undefined;
}

function isCvPilotHostPath(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/$/, "");
  return path === GROWTH_VALIDATION_DEMO_PATH;
}

/** I8-5 pilot + prod /growth/demo?cvMediaId=… */
export function resolveCvPilotMediaId(): string | undefined {
  const fromUrl = readCvMediaIdFromUrl();
  if (fromUrl && (import.meta.env.DEV || isCvPilotHostPath())) {
    return fromUrl;
  }
  if (import.meta.env.DEV) {
    const fromEnv = (import.meta.env.VITE_CV_I6_SMOKE_MEDIA_ID as string | undefined)?.trim();
    if (fromEnv) return fromEnv;
  }
  return undefined;
}

/** @deprecated — use resolveCvPilotMediaId */
export function resolveDevCvSmokeMediaId(): string | undefined {
  return resolveCvPilotMediaId();
}
