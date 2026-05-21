/**
 * 🔥 Booking KPI - 예약/결제 KPI 로깅
 * 
 * 예약 전환, 결제 성공률, 이탈 구간 추적
 */

/**
 * 예약 이벤트 타입
 */
export type BookingEvent =
  | "slot_view"      // 슬롯 조회
  | "slot_select"    // 슬롯 선택
  | "reservation_start" // 예약 시작
  | "reservation_complete" // 예약 완료
  | "payment_start"  // 결제 시작
  | "payment_complete" // 결제 완료
  | "payment_failed" // 결제 실패
  | "reservation_cancel"; // 예약 취소

/**
 * 예약 KPI 로그
 */
export type BookingKpiLog = {
  event: BookingEvent;
  slotId?: string;
  groundId?: string;
  reservationId?: string;
  paymentId?: string;
  amount?: number;
  pg?: string;
  at: string;
  userId?: string;
  sessionId: string;
  metadata?: {
    source?: "StoryZone" | "ActionGrid";
    storyId?: string;
    [key: string]: any;
  };
};

/**
 * 예약 KPI 로그 기록
 */
export function logBookingEvent(payload: BookingKpiLog): void {
  // 1차: 콘솔
  console.log("[BOOKING_KPI]", payload);

  // 2차: 오프라인 큐에 저장
  if (typeof window !== "undefined") {
    // 🔥 브라우저 환경: 정적 import 사용 (require 대신)
    import("../data/offline.storage").then((module) => {
      module.queueLog({
        ...payload,
        type: "booking", // 타입 구분
      });
    }).catch((err) => {
      console.warn("[BookingKPI] 큐 저장 실패:", err);
    });
  }

  // 3차: 온라인 시 즉시 전송 시도
  if (typeof window !== "undefined" && navigator.onLine) {
    flushBookingLogs();
  }
}

/**
 * 세션 ID 조회
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  
  const key = "booking_session_id";
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * 예약 로그 큐 전송
 */
async function flushBookingLogs(): Promise<void> {
  if (typeof window === "undefined") return;

  // 🔥 브라우저 환경: 정적 import 사용 (require 대신)
  const { getLogQueue, clearLogQueue } = await import("../data/offline.storage");
  const queue = getLogQueue();

  // 예약 로그만 필터링
  const bookingLogs = queue.filter((log: any) => log.type === "booking");

  if (!bookingLogs.length) return;

  try {
    const API_BASE = import.meta.env.VITE_API_BASE || "/api";
    const res = await fetch(`${API_BASE}/booking/log/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingLogs.map((log: any) => {
        const { type, ...rest } = log;
        return rest;
      })),
    });

    if (res.ok) {
      // 전송 성공 시 예약 로그만 제거
      const remaining = queue.filter((log: any) => log.type !== "booking");
      if (remaining.length === 0) {
        clearLogQueue();
      } else {
        localStorage.setItem("story_logs_queue", JSON.stringify(remaining));
      }
    }
  } catch (error) {
    console.warn("[BookingKPI] 로그 전송 실패, 큐에 보관:", error);
  }
}

// 온라인 감지 및 자동 전송
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushBookingLogs();
  });
}
