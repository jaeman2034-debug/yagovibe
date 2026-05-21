// src/workers/notificationWorker.ts
// 🔥 알림 워커: Outbox 레코드를 처리하여 실제 발송
//
// 🎯 핵심 원칙:
// - 주기적으로 PENDING/FAILED 상태의 Outbox 조회
// - 채널별 Notifier로 발송 시도
// - 실패 시 재시도 (백오프 전략)
// - 채널 폴백 (카카오 → SMS → Push)

import { collection, query, where, getDocs, doc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NotificationOutbox, NotificationStatus } from "@/domain/notification/outbox";
import { getNotifier } from "@/utils/notifiers/factory";
import type { NotificationChannel } from "@/domain/notification/types";

/**
 * 재시도 백오프 전략
 * 
 * 최대 시도: 5회
 * 백오프: 1m → 5m → 30m → 2h → 12h
 */
const BACKOFF_INTERVALS = [
  1 * 60 * 1000,      // 1분
  5 * 60 * 1000,      // 5분
  30 * 60 * 1000,     // 30분
  2 * 60 * 60 * 1000, // 2시간
  12 * 60 * 60 * 1000, // 12시간
];

/**
 * 채널 우선순위 (폴백 전략)
 */
const CHANNEL_FALLBACK: NotificationChannel[] = ["kakao", "sms", "push"];

/**
 * 다음 시도 시각 계산
 */
export function calculateNextAttempt(attempt: number): Date {
  const interval = BACKOFF_INTERVALS[Math.min(attempt, BACKOFF_INTERVALS.length - 1)];
  return new Date(Date.now() + interval);
}

/**
 * 실패 원인 분류
 */
export function classifyError(error: string): {
  isDead: boolean;  // 영구 실패 여부
  reason: string;
} {
  const errorLower = error.toLowerCase();
  
  // 수신자 데이터 부족 = 즉시 DEAD
  if (
    errorLower.includes("전화번호") ||
    errorLower.includes("phone") ||
    errorLower.includes("token") ||
    errorLower.includes("없습니다")
  ) {
    return { isDead: true, reason: "수신자 데이터 부족" };
  }
  
  // 템플릿 오류 = DEAD
  if (
    errorLower.includes("템플릿") ||
    errorLower.includes("template") ||
    errorLower.includes("유효하지 않은")
  ) {
    return { isDead: true, reason: "템플릿 오류" };
  }
  
  // 외부 API 일시 장애/타임아웃 = 재시도 가능
  return { isDead: false, reason: "일시적 오류" };
}

/**
 * 다음 채널로 폴백
 */
export function getNextChannel(currentChannel: NotificationChannel): NotificationChannel | null {
  const currentIndex = CHANNEL_FALLBACK.indexOf(currentChannel);
  if (currentIndex === -1 || currentIndex === CHANNEL_FALLBACK.length - 1) {
    return null; // 더 이상 폴백할 채널 없음
  }
  return CHANNEL_FALLBACK[currentIndex + 1];
}

/**
 * Outbox 레코드 처리
 * 
 * @param outbox Outbox 레코드
 * @returns 처리 결과
 */
async function processOutbox(outbox: NotificationOutbox): Promise<{
  success: boolean;
  status: NotificationStatus;
  nextAttemptAt?: Date;
  error?: string;
  channelChanged?: boolean;
}> {
  const { payload, attempt } = outbox;
  
  try {
    // Notifier 가져오기
    const notifier = getNotifier(payload.channel);
    
    // 발송 시도
    const result = await notifier.send(payload);
    
    if (result.success) {
      // 성공: SENT 상태로 변경
      return {
        success: true,
        status: "SENT",
      };
    }
    
    // 실패: 원인 분류
    const classification = classifyError(result.error || "알 수 없는 오류");
    
    // 영구 실패면 DEAD
    if (classification.isDead) {
      return {
        success: false,
        status: "DEAD",
        error: result.error,
      };
    }
    
    // 재시도 가능한 경우
    const maxAttempts = BACKOFF_INTERVALS.length;
    if (attempt >= maxAttempts) {
      // 최대 시도 횟수 초과: DEAD
      return {
        success: false,
        status: "DEAD",
        error: `최대 시도 횟수 초과: ${result.error}`,
      };
    }
    
    // 채널 폴백 시도
    const nextChannel = getNextChannel(payload.channel);
    if (nextChannel) {
      // 다음 채널로 변경하여 재시도
      return {
        success: false,
        status: "PENDING",
        nextAttemptAt: new Date(), // 즉시 재시도
        error: result.error,
        channelChanged: true,
      };
    }
    
    // 폴백할 채널 없음: 다음 시도 시각 계산
    return {
      success: false,
      status: "FAILED",
      nextAttemptAt: calculateNextAttempt(attempt + 1),
      error: result.error,
    };
  } catch (error: any) {
    // 예외 발생: 재시도
    const classification = classifyError(error.message || String(error));
    
    if (classification.isDead || attempt >= BACKOFF_INTERVALS.length) {
      return {
        success: false,
        status: "DEAD",
        error: error.message || String(error),
      };
    }
    
    return {
      success: false,
      status: "FAILED",
      nextAttemptAt: calculateNextAttempt(attempt + 1),
      error: error.message || String(error),
    };
  }
}

/**
 * 알림 워커 실행
 * 
 * 처리할 Outbox 레코드를 조회하여 발송 시도
 * 
 * @param batchSize 한 번에 처리할 최대 레코드 수
 * @returns 처리 결과 통계
 */
export async function runNotificationWorker(batchSize: number = 50): Promise<{
  processed: number;
  sent: number;
  failed: number;
  dead: number;
}> {
  const now = Timestamp.now();
  
  // 처리할 Outbox 조회
  // 조건: nextAttemptAt <= now AND status IN (PENDING, FAILED)
  const outboxRef = collection(db, "notificationOutbox");
  const q = query(
    outboxRef,
    where("status", "in", ["PENDING", "FAILED"]),
    where("nextAttemptAt", "<=", now)
    // limit(batchSize) // Firestore는 where + limit 조합 제한이 있음
  );
  
  const snapshot = await getDocs(q);
  const outboxes = snapshot.docs
    .slice(0, batchSize)
    .map((doc) => ({ id: doc.id, ...doc.data() } as NotificationOutbox));
  
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let dead = 0;
  
  // 각 Outbox 처리
  for (const outbox of outboxes) {
    try {
      const result = await processOutbox(outbox);
      
      // Outbox 업데이트
      const outboxDocRef = doc(db, "notificationOutbox", outbox.id);
      const updateData: any = {
        updatedAt: serverTimestamp(),
        status: result.status,
        attempt: result.channelChanged ? outbox.attempt : outbox.attempt + 1,
        lastError: result.error,
      };
      
      // 채널 변경이 있으면 payload도 업데이트
      if (result.channelChanged && outbox.payload.channel) {
        const nextChannel = getNextChannel(outbox.payload.channel);
        if (nextChannel) {
          updateData["payload.channel"] = nextChannel;
        }
      }
      
      if (result.nextAttemptAt) {
        updateData.nextAttemptAt = Timestamp.fromDate(result.nextAttemptAt);
      } else if (result.status === "SENT" || result.status === "DEAD") {
        // 완료/영구 실패 시 nextAttemptAt 제거
        updateData.nextAttemptAt = null;
      }
      
      await updateDoc(outboxDocRef, updateData);
      
      // 통계 업데이트
      processed++;
      if (result.status === "SENT") {
        sent++;
      } else if (result.status === "FAILED") {
        failed++;
      } else if (result.status === "DEAD") {
        dead++;
      }
      
      console.log(`[Worker] Outbox 처리: ${outbox.id}`, {
        status: result.status,
        attempt: outbox.attempt + 1,
        channel: outbox.payload.channel,
      });
    } catch (error: any) {
      console.error(`[Worker] Outbox 처리 실패: ${outbox.id}`, error);
      // 실패해도 계속 진행 (Fail-safe)
    }
  }
  
  return { processed, sent, failed, dead };
}

/**
 * 주기적으로 워커 실행 (클라이언트 사이드)
 * 
 * @param intervalMs 실행 간격 (밀리초)
 */
export function startNotificationWorker(intervalMs: number = 60000): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  
  const run = async () => {
    try {
      const stats = await runNotificationWorker();
      console.log(`[Worker] 실행 완료:`, stats);
    } catch (error) {
      console.error(`[Worker] 실행 실패:`, error);
    }
  };
  
  // 즉시 실행
  run();
  
  // 주기적 실행
  intervalId = setInterval(run, intervalMs);
  
  // 중지 함수 반환
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

