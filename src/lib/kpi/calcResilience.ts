/**
 * ✅ COMMIT 23: Resilience Score 집계
 */

export type ResilienceAggregate = {
  avgScore: number;
  lastScore: number;
};

/**
 * ✅ COMMIT 23: Resilience Score 집계
 * 
 * @param scores 배열 of { score: number }
 * @returns 집계 결과 (평균, 최신)
 */
export function calcResilience(scores: Array<{ score: number }>): ResilienceAggregate | null {
  if (!scores.length) return null;

  const avg = scores.reduce((a, b) => a + b.score, 0) / scores.length;
  const last = scores[scores.length - 1].score;

  return {
    avgScore: Math.round(avg),
    lastScore: last,
  };
}

