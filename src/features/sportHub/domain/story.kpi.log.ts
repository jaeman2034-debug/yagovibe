/**
 * 🔥 Story KPI Log - 성과 로그 스키마
 */

import type { StoryCategory, StorySource } from "./story.types";

export type StoryLogEvent =
  | "impression"  // 노출
  | "click"       // 클릭
  | "route";      // 라우팅 완료

export interface StoryLogPayload {
  storyId: string;
  category: StoryCategory;
  source: StorySource;
  event: StoryLogEvent;
  at: string; // ISO string
  route?: string; // click/route 이벤트만
  userId?: string; // 로그인 사용자만
}

/**
 * 스토리 로그 기록 (클라이언트 훅)
 */
export function logStory(payload: StoryLogPayload): void {
  try {
    // Analytics 이벤트 (필요시 구현)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", `story_${payload.event}`, {
        story_id: payload.storyId,
        category: payload.category,
        source: payload.source,
        route: payload.route,
      });
    }

    // 콘솔 로그 (개발 환경)
    if (process.env.NODE_ENV === "development") {
      console.log("[STORY]", payload);
    }

    // TODO: Firestore에 저장 (선택)
    // await addDoc(collection(db, "story_kpi_logs"), payload);
  } catch (error) {
    console.error("[StoryKPI] 로그 기록 실패:", error);
  }
}

/**
 * 스토리 노출 로그
 */
export function logImpression(
  storyId: string,
  category: StoryCategory,
  source: StorySource
): void {
  logStory({
    storyId,
    category,
    source,
    event: "impression",
    at: new Date().toISOString(),
  });
}

/**
 * 스토리 클릭 로그
 */
export function logClick(
  storyId: string,
  category: StoryCategory,
  source: StorySource,
  route?: string
): void {
  logStory({
    storyId,
    category,
    source,
    event: "click",
    at: new Date().toISOString(),
    route,
  });
}

/**
 * 스토리 라우팅 완료 로그
 */
export function logRoute(
  storyId: string,
  category: StoryCategory,
  source: StorySource,
  route: string,
  userId?: string
): void {
  logStory({
    storyId,
    category,
    source,
    event: "route",
    at: new Date().toISOString(),
    route,
    userId,
  });
}
