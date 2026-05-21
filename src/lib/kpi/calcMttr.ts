/**
 * ✅ COMMIT 23: MTTR (Mean Time To Recovery) 계산
 */

export type MttrResult = {
  avgMinutes: number;
  p95Minutes: number;
  samples: number;
};

/**
 * ✅ COMMIT 23: MTTR 계산
 * 
 * @param incidents 배열 of { startedAt, recoveredAt }
 * @returns MTTR 결과 (평균, P95, 샘플 수)
 */
export function calcMttr(incidents: Array<{
  startedAt: Date;
  recoveredAt: Date;
}>): MttrResult | null {
  if (!incidents.length) return null;

  const minutes = incidents.map(
    (i) => (i.recoveredAt.getTime() - i.startedAt.getTime()) / 60000
  );

  const avg = minutes.reduce((a, b) => a + b, 0) / minutes.length;
  const sorted = [...minutes].sort((a, b) => a - b);
  const p95Index = Math.floor(minutes.length * 0.95);
  const p95 = sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0;

  return {
    avgMinutes: Math.round(avg),
    p95Minutes: Math.round(p95),
    samples: minutes.length,
  };
}

