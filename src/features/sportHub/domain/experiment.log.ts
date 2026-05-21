/**
 * 🔥 Experiment Log - variant 포함 로그
 * 
 * 모든 핵심 로그(노출/클릭/route)에 experimentKey/variant 포함
 */

import type { ExperimentKey, Variant } from "./experiment.types";

/**
 * 실험 로그 타입
 */
export type ExperimentLog = {
  event: "exp_impression" | "exp_click" | "exp_route";
  experimentKey: ExperimentKey;
  variant: Variant;
  at: string;

  // 어떤 화면/요소인지
  surface: "StoryZone" | "ActionGrid";
  meta?: {
    storyId?: string;
    category?: string;
    source?: string;
    actionKey?: string;
    [key: string]: any;
  };
};

/**
 * 실험 로그 기록 (서버 스키마 포함)
 */
export function logExperiment(payload: ExperimentLog): void {
  // 1차: 콘솔
  console.log("[EXP_LOG]", payload);

  // 2차: 서버 스키마로 변환
  const serverLog = {
    experimentKey: payload.experimentKey,
    variant: payload.variant,
    event: payload.event,
    surface: payload.surface,
    storyId: payload.meta?.storyId,
    category: payload.meta?.category,
    source: payload.meta?.source,
    actionKey: payload.meta?.actionKey,
    mode: payload.meta?.mode || "default", // TODO: 실제 mode 전달
    decisionReason: payload.meta?.decisionReason || "unknown",
    at: payload.at,
    sessionId: getSessionId(),
    device: getDeviceType(),
    userId: payload.meta?.userId,
  };

  // 3차: 오프라인 큐에 저장
  if (typeof window !== "undefined") {
    // 🔥 브라우저 환경: 정적 import 사용 (require 대신)
    import("../data/offline.storage").then((module) => {
      module.queueLog({
        ...serverLog,
        type: "experiment", // 타입 구분
      });
    }).catch((err) => {
      console.warn("[ExperimentLog] 큐 저장 실패:", err);
    });
  }

  // 4차: 온라인 시 즉시 전송 시도
  if (typeof window !== "undefined" && navigator.onLine) {
    flushExperimentLogs();
  }
}

/**
 * 세션 ID 생성/조회
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  
  const key = "exp_session_id";
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * 디바이스 타입 감지
 */
function getDeviceType(): "m" | "pc" {
  if (typeof window === "undefined") return "pc";
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return isMobile ? "m" : "pc";
}

/**
 * 실험 로그 큐 전송
 */
async function flushExperimentLogs(): Promise<void> {
  if (typeof window === "undefined") return;

  // 🔥 브라우저 환경: 정적 import 사용 (require 대신)
  const { getLogQueue, clearLogQueue } = await import("../data/offline.storage");
  const { sendExperimentLogsBulk } = await import("../data/experiment.api.client");
  const queue = getLogQueue();

  // 실험 로그만 필터링
  const expLogs = queue.filter((log: any) => log.type === "experiment");

  if (!expLogs.length) return;

  try {
    // type 필드 제거하고 서버 스키마로 변환
    const serverLogs = expLogs.map((log: any) => {
      const { type, ...rest } = log;
      return rest;
    });

    await sendExperimentLogsBulk(serverLogs);

    // 전송 성공 시 실험 로그만 제거
    const remaining = queue.filter((log: any) => log.type !== "experiment");
    if (remaining.length === 0) {
      clearLogQueue();
    } else {
      localStorage.setItem("story_logs_queue", JSON.stringify(remaining));
    }
  } catch (error) {
    console.warn("[ExperimentLog] 로그 전송 실패, 큐에 보관:", error);
  }
}

// 온라인 감지 및 자동 전송
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushExperimentLogs();
  });
}
