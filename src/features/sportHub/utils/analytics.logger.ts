/**
 * 🔥 Analytics Logger - 이벤트 로깅 유틸리티
 * 
 * 모든 이벤트를 표준 형식으로 기록
 */

import type { CompleteEvent, AnalyticsEvent } from "../domain/analytics.types";
import type { Region } from "../domain/region.types";
import { sendEvent } from "../data/analytics.api";

/**
 * 세션 ID 생성/저장
 */
function getOrCreateSessionId(): string {
  const key = "analytics_session_id";
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * 이벤트 로깅
 */
export function logEvent(
  event: AnalyticsEvent,
  options?: {
    userId?: string;
    region?: Region;
    device?: "m" | "pc";
    network?: "offline" | "slow" | "normal";
    from?: "api" | "seed" | "cache";
  }
): void {
  const sessionId = getOrCreateSessionId();
  const userAgent = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  
  const completeEvent: CompleteEvent = {
    ...event,
    at: new Date().toISOString(),
    sessionId,
    userId: options?.userId || null,
    region: options?.region || "seoul", // 기본값
    device: options?.device || (isMobile ? "m" : "pc"),
    appVersion: import.meta.env.VITE_APP_VERSION,
    network: options?.network || (navigator.onLine ? "normal" : "offline"),
    from: options?.from,
  };

  // 비동기 전송 (큐에 저장)
  sendEvent(completeEvent).catch((error) => {
    console.warn("[Analytics] 이벤트 전송 실패:", error);
  });
}

/**
 * 허브 뷰 로깅
 */
export function logHubView(region: Region): void {
  logEvent({ eventName: "hub_view" }, { region });
}

/**
 * 스토리 임프레션 로깅
 */
export function logStoryImpression(
  storyId: string,
  category: string,
  source: string,
  region: Region,
  from?: "api" | "seed" | "cache"
): void {
  logEvent(
    {
      eventName: "story_impression",
      metadata: { storyId, category, source },
    },
    { region, from }
  );
}

/**
 * 스토리 클릭 로깅
 */
export function logStoryClick(
  storyId: string,
  category: string,
  source: string,
  region: Region
): void {
  logEvent(
    {
      eventName: "story_click",
      metadata: { storyId, category, source },
    },
    { region }
  );
}

/**
 * 결제 성공 로깅
 */
export function logPaymentSuccess(
  reservationId: string,
  amount: number,
  pg: string,
  region: Region
): void {
  logEvent(
    {
      eventName: "payment_success",
      metadata: { reservationId, amount, pg },
    },
    { region }
  );
}

/**
 * 결제 실패 로깅
 */
export function logPaymentFail(
  reservationId: string,
  amount: number,
  reason: string,
  region: Region
): void {
  logEvent(
    {
      eventName: "payment_fail",
      metadata: { reservationId, amount, reason },
    },
    { region }
  );
}
