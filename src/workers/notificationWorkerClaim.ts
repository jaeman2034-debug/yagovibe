// src/workers/notificationWorkerClaim.ts
// 🔥 알림 워커: Claim 패턴 기반 Outbox 처리
//
// 🎯 핵심 원칙:
// - DB Claim 패턴 (원자적 선점)
// - Lease/Timeout 안전장치
// - 동시성 제어

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NotificationOutbox, NotificationStatus } from "@/domain/notification/outbox";
import { getNotifier } from "@/utils/notifiers/factory";
import type { NotificationChannel } from "@/domain/notification/types";
import { classifyError, getNextChannel, calculateNextAttempt } from "./notificationWorker";

/**
 * Claim 파라미터
 */
export interface ClaimParams {
  batchSize: number;        // 한 번에 claim할 최대 레코드 수
  leaseTimeout: number;     // Lease 타임아웃 (밀리초, 기본: 10분)
  workerId: string;          // 워커 ID (고유 식별자)
}

/**
 * Claim 결과
 */
export interface ClaimResult {
  claimed: NotificationOutbox[];
  count: number;
}

/**
 * Outbox 레코드 Claim (원자적 선점)
 * 
 * 🔥 동작:
 * 1. PENDING/FAILED 상태의 레코드 조회
 * 2. nextAttemptAt <= now 조건
 * 3. PROCESSING 상태로 변경 (원자적)
 * 4. workerId 및 claimedAt 기록
 * 
 * @param params Claim 파라미터
 * @returns Claim된 레코드 목록
 */
export async function claimOutboxRecords(
  params: ClaimParams
): Promise<ClaimResult> {
  const { batchSize, leaseTimeout, workerId } = params;
  const now = Timestamp.now();
  const leaseExpiresAt = Timestamp.fromDate(
    new Date(Date.now() + leaseTimeout)
  );

  // 1. Claim할 레코드 조회
  const outboxRef = collection(db, "notificationOutbox");
  const q = query(
    outboxRef,
    where("status", "in", ["PENDING", "FAILED"]),
    where("nextAttemptAt", "<=", now),
    orderBy("nextAttemptAt", "asc"),
    limit(batchSize)
  );

  const snapshot = await getDocs(q);
  const candidates = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NotificationOutbox[];

  // 2. Claim 시도 (원자적 업데이트)
  const claimed: NotificationOutbox[] = [];

  for (const record of candidates) {
    try {
      const recordRef = doc(db, "notificationOutbox", record.id);

      // 원자적 Claim: status가 아직 PENDING/FAILED인지 확인하고 PROCESSING으로 변경
      await updateDoc(recordRef, {
        status: "PROCESSING" as NotificationStatus,
        workerId,
        claimedAt: serverTimestamp(),
        leaseExpiresAt,
        updatedAt: serverTimestamp(),
      });

      claimed.push({
        ...record,
        status: "PROCESSING",
      });
    } catch (error) {
      // 다른 워커가 이미 claim했을 수 있음 (정상)
      console.log(`[Worker] Record ${record.id} already claimed by another worker`);
    }
  }

  return {
    claimed,
    count: claimed.length,
  };
}

/**
 * 오래된 PROCESSING 레코드 복구 (워커 죽음 대비)
 * 
 * 🔥 안전장치:
 * - PROCESSING 상태인데 leaseExpiresAt이 지난 레코드
 * - 다시 FAILED로 변경하여 재시도 가능하게 함
 * 
 * @param leaseTimeout Lease 타임아웃 (밀리초)
 * @returns 복구된 레코드 수
 */
export async function recoverStaleProcessingRecords(
  leaseTimeout: number
): Promise<number> {
  const now = Timestamp.now();
  const staleThreshold = Timestamp.fromDate(
    new Date(Date.now() - leaseTimeout)
  );

  const outboxRef = collection(db, "notificationOutbox");
  const q = query(
    outboxRef,
    where("status", "==", "PROCESSING"),
    where("leaseExpiresAt", "<", now)
  );

  const snapshot = await getDocs(q);
  let recovered = 0;

  for (const docSnap of snapshot.docs) {
    try {
      await updateDoc(docSnap.ref, {
        status: "FAILED" as NotificationStatus,
        lastError: "워커 타임아웃 (자동 복구)",
        updatedAt: serverTimestamp(),
        leaseExpiresAt: null,
        workerId: null,
        claimedAt: null,
      });
      recovered++;
    } catch (error) {
      console.error(`[Worker] 복구 실패: ${docSnap.id}`, error);
    }
  }

  if (recovered > 0) {
    console.log(`[Worker] ${recovered}개의 오래된 PROCESSING 레코드 복구 완료`);
  }

  return recovered;
}

/**
 * Claim된 레코드 처리
 * 
 * @param record Claim된 Outbox 레코드
 * @returns 처리 결과
 */
async function processClaimedRecord(
  record: NotificationOutbox
): Promise<{
  success: boolean;
  status: NotificationStatus;
  nextAttemptAt?: Date;
  error?: string;
  channelChanged?: boolean;
}> {
  const { payload, attempt } = record;

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
    const maxAttempts = 5;
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

    if (classification.isDead || attempt >= 5) {
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
 * Claim된 레코드 완료 처리
 * 
 * @param record Claim된 레코드
 * @param result 처리 결과
 */
async function completeClaimedRecord(
  record: NotificationOutbox,
  result: {
    success: boolean;
    status: NotificationStatus;
    nextAttemptAt?: Date;
    error?: string;
    channelChanged?: boolean;
  }
): Promise<void> {
  const recordRef = doc(db, "notificationOutbox", record.id);
  const updateData: any = {
    updatedAt: serverTimestamp(),
    status: result.status,
    attempt: result.channelChanged ? record.attempt : record.attempt + 1,
    lastError: result.error,
    workerId: null,
    claimedAt: null,
    leaseExpiresAt: null,
  };

  // 채널 변경이 있으면 payload도 업데이트
  if (result.channelChanged && record.payload.channel) {
    const nextChannel = getNextChannel(record.payload.channel);
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

  await updateDoc(recordRef, updateData);
}

/**
 * 워커 루프 실행 (Claim 패턴)
 * 
 * @param params 워커 파라미터
 * @returns 처리 결과 통계
 */
export async function runNotificationWorkerWithClaim(
  params: ClaimParams
): Promise<{
  claimed: number;
  sent: number;
  failed: number;
  dead: number;
  errors: number;
}> {
  // 1. 오래된 PROCESSING 레코드 복구
  await recoverStaleProcessingRecords(params.leaseTimeout);

  // 2. Claim
  const claimResult = await claimOutboxRecords(params);

  let sent = 0;
  let failed = 0;
  let dead = 0;
  let errors = 0;

  // 3. Claim된 레코드 처리
  for (const record of claimResult.claimed) {
    try {
      const result = await processClaimedRecord(record);
      await completeClaimedRecord(record, result);

      if (result.status === "SENT") {
        sent++;
      } else if (result.status === "FAILED") {
        failed++;
      } else if (result.status === "DEAD") {
        dead++;
      }

      console.log(`[Worker] Record 처리 완료: ${record.id}`, {
        status: result.status,
        attempt: record.attempt + 1,
        channel: record.payload.channel,
      });
    } catch (error: any) {
      console.error(`[Worker] Record 처리 실패: ${record.id}`, error);
      errors++;

      // 실패한 레코드는 다시 FAILED로 변경
      try {
        const recordRef = doc(db, "notificationOutbox", record.id);
        await updateDoc(recordRef, {
          status: "FAILED" as NotificationStatus,
          lastError: error.message || String(error),
          updatedAt: serverTimestamp(),
          workerId: null,
          claimedAt: null,
          leaseExpiresAt: null,
        });
      } catch (updateError) {
        console.error(`[Worker] Record 상태 업데이트 실패: ${record.id}`, updateError);
      }
    }
  }

  return {
    claimed: claimResult.count,
    sent,
    failed,
    dead,
    errors,
  };
}

/**
 * 주기적으로 워커 실행 (Claim 패턴)
 * 
 * @param params 워커 파라미터
 * @param intervalMs 실행 간격 (밀리초)
 * @returns 중지 함수
 */
export function startNotificationWorkerWithClaim(
  params: ClaimParams,
  intervalMs: number = 60000
): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const run = async () => {
    try {
      const stats = await runNotificationWorkerWithClaim({
        ...params,
        workerId,
      });
      console.log(`[Worker] 실행 완료 (${workerId}):`, stats);
    } catch (error) {
      console.error(`[Worker] 실행 실패 (${workerId}):`, error);
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

