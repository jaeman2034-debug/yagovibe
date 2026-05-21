/**
 * 허브 피드 GA4 이벤트 (최소 수집)
 * @see track() in analytics.ts — 프로덕션에서만 GA 전송, 개발은 console
 */

import { track } from "@/lib/analytics";

export type HubFeedSurface = "hub_feed";
export type HubFeedPlatform = "web" | "ios" | "android";
export type HubFeedUserStatus = "anon" | "logged_in";
export type HubFeedSource = "activities" | "legacy";

/** 세션 내 `feed_dwell` 1회 전송 완료 — `feed_click.clicked_after_dwell` 판별용 */
export function hubFeedDwellSessionKey(activityId: string): string {
  return `hub_feed_dwell_${activityId}`;
}

/** 가시 비율 ≥0.5 구간에 들어간 뒤(이탈 전) — dwell 완료 전 클릭도 관심 신호로 잡기 위함 */
export function hubFeedDwellActiveSessionKey(activityId: string): string {
  return `hub_feed_dwell_active_${activityId}`;
}

/** dwell_active 값: 진입 시각(ms 문자열). 구버전 `"1"`은 호환용으로 유효로 봄 */
const DWELL_ACTIVE_MAX_AGE_MS = 10 * 60 * 1000;

export function hubFeedDwellActiveIsFresh(
  activityId: string,
  maxAgeMs: number = DWELL_ACTIVE_MAX_AGE_MS
): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const v = sessionStorage.getItem(hubFeedDwellActiveSessionKey(activityId));
  if (!v) return false;
  if (v === "1") return true;
  const ts = Number(v);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}

export type HubFeedDwellBucket = "short" | "medium" | "long";

function dwellBucketFromMs(ms: number): HubFeedDwellBucket {
  if (ms < 2000) return "short";
  if (ms < 10_000) return "medium";
  return "long";
}

const HUB_SESSION_STORAGE_KEY = "hub_feed_analytics_session_id";
const SURFACE: HubFeedSurface = "hub_feed";

function getHubSessionId(): string {
  if (typeof sessionStorage === "undefined") {
    return `hf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  let id = sessionStorage.getItem(HUB_SESSION_STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `hf_${crypto.randomUUID()}`
        : `hf_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(HUB_SESSION_STORAGE_KEY, id);
  }
  return id;
}

function detectPlatform(): HubFeedPlatform {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua) && !/Android/i.test(ua)) {
    if (/Capacitor|Cordova|WKWebView/i.test(ua)) return "ios";
  }
  if (/Android/i.test(ua) && /Capacitor|Cordova/i.test(ua)) return "android";
  return "web";
}

function appVersion(): string {
  const v = import.meta.env.VITE_APP_VERSION;
  if (typeof v === "string" && v.trim()) return v.trim();
  return import.meta.env.MODE || "0";
}

function baseParams(userStatus: HubFeedUserStatus): Record<string, string | number> {
  return {
    timestamp_ms: Date.now(),
    hub_session_id: getHubSessionId(),
    surface: SURFACE,
    platform: detectPlatform(),
    app_version: appVersion(),
    user_status: userStatus,
  };
}

/** GA 파라미터는 문자열·숫자 위주 (undefined 제거) */
function send(event: string, params: Record<string, string | number | undefined>) {
  const cleaned: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    cleaned[k] = v;
  }
  void track(event, cleaned);
}

export function trackFeedSessionStart(userStatus: HubFeedUserStatus): void {
  send("feed_session_start", {
    ...baseParams(userStatus),
  });
}

export function trackFeedImpression(params: {
  activityId: string;
  position: number;
  feedSource: HubFeedSource;
  userStatus: HubFeedUserStatus;
  visibleRatio?: number;
}): void {
  send("feed_impression", {
    ...baseParams(params.userStatus),
    activity_id: params.activityId,
    position: params.position,
    feed_source: params.feedSource,
    visible_ratio: params.visibleRatio,
  });
}

export function trackFeedClick(params: {
  activityId: string;
  position: number;
  feedSource: HubFeedSource;
  destination: string;
  userStatus: HubFeedUserStatus;
  /** 1: 세션에서 dwell 완료 후 클릭, 또는 가시(≥0.5) 구간에 들어간 뒤(이탈 전) 클릭 */
  clicked_after_dwell?: 0 | 1;
}): void {
  const dest =
    params.destination.length > 120 ? `${params.destination.slice(0, 117)}...` : params.destination;
  send("feed_click", {
    ...baseParams(params.userStatus),
    activity_id: params.activityId,
    position: params.position,
    feed_source: params.feedSource,
    destination: dest,
    clicked_after_dwell: params.clicked_after_dwell,
  });
}

export function trackFeedFeedback(params: {
  activityId: string;
  position: number;
  feedSource: HubFeedSource;
  feedbackType: "hide" | "report" | "not_interested";
  userStatus: HubFeedUserStatus;
}): void {
  send("feed_feedback", {
    ...baseParams(params.userStatus),
    activity_id: params.activityId,
    position: params.position,
    feed_source: params.feedSource,
    feedback_type: params.feedbackType,
  });
}

export function trackFeedUndo(params: {
  activityId: string;
  feedbackType: "hide" | "not_interested";
  userStatus: HubFeedUserStatus;
}): void {
  send("feed_undo", {
    ...baseParams(params.userStatus),
    activity_id: params.activityId,
    feedback_type: params.feedbackType,
  });
}

/** 카드가 화면에 충분히 보인 뒤 이탈할 때까지 체류(ms) — 세션당 activityId 1회 */
export function trackFeedDwell(params: {
  activityId: string;
  position: number;
  feedSource: HubFeedSource;
  userStatus: HubFeedUserStatus;
  dwellMs: number;
}): void {
  const capped = Math.min(Math.max(0, params.dwellMs), 300_000);
  send("feed_dwell", {
    ...baseParams(params.userStatus),
    activity_id: params.activityId,
    position: params.position,
    feed_source: params.feedSource,
    dwell_ms: capped,
    dwell_bucket: dwellBucketFromMs(capped),
  });
}
