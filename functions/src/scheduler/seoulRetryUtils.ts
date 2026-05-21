import { Timestamp } from "firebase-admin/firestore";
import { addUtcCalendarDays, seoulCalendarFromInstant } from "./seoulDateUtils";

/** 서울 달력 기준 fromMs 가 속한 날짜에서 +addDays 일의 10:00 KST */
export function seoulMorningAfterDays(fromMs: number, addDays: number): Timestamp {
  const t = seoulCalendarFromInstant(fromMs);
  const n = addUtcCalendarDays(t.y, t.M, t.d, addDays);
  const retryMs = Date.UTC(n.y, n.M - 1, n.d, 10 - 9, 0, 0, 0);
  return Timestamp.fromMillis(retryMs);
}

/**
 * 자동결제 실패 직후 누적 시도 횟수(이번 실패 반영 후 값 = 기존+1) 기준 다음 재시도.
 * 1회차 실패 → 익일 10시, 2회차 실패 → 3일 후 10시, 3회차 이상 → 종료.
 */
export function getNextRetryAfterAutopayFailure(chargeAttemptCountAfterFailure: number, fromMs: number): Timestamp | null {
  if (chargeAttemptCountAfterFailure <= 0) return null;
  if (chargeAttemptCountAfterFailure === 1) {
    return seoulMorningAfterDays(fromMs, 1);
  }
  if (chargeAttemptCountAfterFailure === 2) {
    return seoulMorningAfterDays(fromMs, 3);
  }
  return null;
}
