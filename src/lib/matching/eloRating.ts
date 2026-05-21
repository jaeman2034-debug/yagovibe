/**
 * Elo 스타일 레이팅 (1:1 대전용 뼈대).
 * 팀·매칭 글에 `skillRating` 필드를 붙인 뒤 경기 결과 확정 시 Cloud Function에서 갱신하는 것을 권장.
 */

export type EloSide = "a" | "b";

/** 기대 승점 (0~1) */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * @param k K-factor (기본 32)
 * @param scoreA A의 실제 점수: 승 1, 무 0.5, 패 0
 */
export function nextRating(rating: number, expected: number, score: number, k = 32): number {
  return Math.round(rating + k * (score - expected));
}

export function updatePairRatings(
  ratingA: number,
  ratingB: number,
  winner: EloSide | "draw",
  k = 32
): { ratingA: number; ratingB: number } {
  const expA = expectedScore(ratingA, ratingB);
  const expB = expectedScore(ratingB, ratingA);
  const scoreA = winner === "a" ? 1 : winner === "draw" ? 0.5 : 0;
  const scoreB = winner === "b" ? 1 : winner === "draw" ? 0.5 : 0;
  return {
    ratingA: nextRating(ratingA, expA, scoreA, k),
    ratingB: nextRating(ratingB, expB, scoreB, k),
  };
}
