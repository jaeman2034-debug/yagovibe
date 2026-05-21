/**
 * ✅ COMMIT 21: Resilience Score 계산
 */

export type ResilienceScore = {
  tenantId: string;
  windowHours: number;
  injected: number; // 주입된 Chaos 수
  detected: number; // 감지된 수 (anomaly/incident 발생)
  recovered: number; // 복구된 수 (정상 복귀)
  score: number; // 0~100
  day?: string; // YYYY-MM-DD
  updatedAt?: any;
};

/**
 * ✅ COMMIT 21: 회복력 점수 계산
 * 
 * @param input injected, detected, recovered
 * @returns 0~100 점수
 */
export function calcResilience(input: {
  injected: number;
  detected: number;
  recovered: number;
}): number {
  if (input.injected === 0) return 100;

  const detectRate = input.detected / input.injected;
  const recoverRate = input.recovered / input.injected;

  // 감지율 50% + 복구율 50% 가중평균
  return Math.round((detectRate * 0.5 + recoverRate * 0.5) * 100);
}

