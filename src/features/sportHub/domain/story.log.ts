/**
 * 🔥 Story Log - 간단한 로그 모듈
 * 
 * 노출 → 클릭 → 라우팅 자동 기록
 * 시즌 모드/판정 근거 포함 (운영/분석 필수)
 */

import type { Story, StoryCategory, StorySource } from "./story.types";
// 🔥 브라우저 환경: 정적 import 사용 (require 대신)
import { queueLog, getLogQueue, clearLogQueue } from "../data/offline.storage";

export type StoryEvent = "impression" | "click" | "route";

export type StoryLog = {
  storyId: string;
  category: StoryCategory;
  source: StorySource;
  event: StoryEvent;
  at: string;

  // ✅ 확장: 운영/분석에 필수
  mode: "default" | "season";
  decisionReason: string;
  from: "api" | "cache" | "seed";
};

/**
 * 스토리 이벤트 로그 기록 (오프라인 보존)
 */
export const logStory = (
  story: Story,
  event: StoryEvent,
  ctx: { mode: "default" | "season"; decisionReason: string; from: "api" | "cache" | "seed" }
) => {
  // 🔥 백엔드 규격에 맞춤: event → eventName 변환
  const mappedEventName =
    event === "click" ? "story_click" :
    event === "impression" ? "story_impression" :
    event === "route" ? "story_route" :
    `story_${event}`;

  // 🔥 백엔드 EventLog 스키마에 맞춘 payload
  const payload = {
    storyId: story.id,
    category: story.category,
    source: story.source,
    
    // ✅ 핵심: eventName 규격 통일 (백엔드가 찾는 형식)
    eventName: mappedEventName,
    
    // ✅ region 추가 (백엔드 필터링에 필수)
    region: story.region || "seoul",
    
    // 기존 필드 유지
    at: new Date().toISOString(),
    ...ctx,
    
    // 하위 호환성을 위해 event 필드도 유지
    event,
  };

  // 1차: 콘솔
  console.log("[STORY_LOG]", payload);

  // 2차: 오프라인 큐에 저장 (나중에 전송)
  if (typeof window !== "undefined") {
    try {
      queueLog(payload);
    } catch (error) {
      console.warn("[StoryLog] 큐 저장 실패:", error);
    }
  }

  // 3차: 온라인 시 즉시 전송 시도
  if (typeof window !== "undefined" && navigator.onLine) {
    flushLogs();
  }
};

/**
 * 로그 큐 전송 (온라인 시)
 */
export async function flushLogs(): Promise<void> {
  if (typeof window === "undefined") return;

  const queue = getLogQueue();
  
  if (!queue.length) return;

  try {
    // 🔥 로컬 Express 백엔드 직접 연결 (CTR 파이프라인)
    // VITE_API_BASE=http://localhost:3001/api (개발용)
    // 또는 프록시 경로 /api 사용 (프록시 설정 시)
    const API_BASE = import.meta.env.VITE_API_BASE || "/api";
    const url = `${API_BASE}/logs/story/bulk`;
    console.log(`🔥 [StoryLog] API_BASE = ${API_BASE}`);
    console.log(`[StoryLog] 📤 전송 시도: ${queue.length}개 이벤트 → ${url}`);
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queue),
    });

    if (res.ok) {
      const result = await res.json();
      console.log(`[StoryLog] ✅ 전송 성공: ${result.count}개 저장됨`);
      clearLogQueue();
    } else {
      const errorText = await res.text();
      console.error(`[StoryLog] ❌ 전송 실패: ${res.status} ${res.statusText}`, errorText);
    }
  } catch (error) {
    // 실패 시 큐에 보관 (다음 온라인 시 재시도)
    console.error("[StoryLog] ❌ 로그 전송 실패, 큐에 보관:", error);
  }
}

// 온라인 감지 및 자동 전송
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushLogs();
  });
}
