/**
 * 🛡️ Query Relaxation
 * 쿼리 완화 (조건 완화 체인)
 * 순서 중요: 주차 → 영업중 → 힌트 제거
 */

/**
 * 쿼리 1단계 완화
 * step 0: 주차 제거
 * step 1: 영업중 제거
 * step 2: 힌트 제거 (가까운/평점)
 */
export function relaxQueryOnce(query: string, step: number): string {
  let relaxed = query;

  if (step === 0) {
    // 주차 제거
    relaxed = relaxed
      .replace(/주차/g, '')
      .replace(/주차 가능/g, '')
      .replace(/주차장/g, '')
      .trim();
  } else if (step === 1) {
    // 영업중 제거
    relaxed = relaxed
      .replace(/지금 영업중/g, '')
      .replace(/영업중/g, '')
      .replace(/지금 영업/g, '')
      .replace(/현재 영업/g, '')
      .trim();
  } else if (step === 2) {
    // 힌트 제거 (가까운/평점)
    relaxed = relaxed
      .replace(/가까운/g, '')
      .replace(/근처/g, '')
      .replace(/평점 높은/g, '')
      .replace(/인기/g, '')
      .replace(/베스트/g, '')
      .trim();
  }

  // 연속 공백 제거
  return relaxed.replace(/\s+/g, ' ').trim();
}

/**
 * 쿼리 완화 체인 실행
 * 최대 3단계 완화 시도
 */
export function relaxQuery(query: string): string[] {
  const relaxed: string[] = [query]; // 원본도 포함

  for (let i = 0; i < 3; i++) {
    const next = relaxQueryOnce(relaxed[relaxed.length - 1], i);
    if (next !== relaxed[relaxed.length - 1] && next.length > 0) {
      relaxed.push(next);
    } else {
      break;
    }
  }

  return relaxed;
}
