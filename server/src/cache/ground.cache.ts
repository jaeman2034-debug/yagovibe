/**
 * 🔥 Ground Cache - 구장 캐시 (지역 단위)
 * 
 * Week8 핵심: 구장 목록 캐싱
 */

const memory: Record<string, { v: any; t: number }> = {};

const DEFAULT_TTL = 60_000; // 60초 (구장은 변경 빈도가 낮음)

/**
 * 캐시된 구장 조회
 */
export async function cachedGrounds<T>(
  region: string,
  loader: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const key = `grounds:${region}`;
  const hit = memory[key];

  if (hit && Date.now() - hit.t < ttl) {
    return hit.v as T;
  }

  const v = await loader();
  memory[key] = { v, t: Date.now() };
  return v;
}

/**
 * 캐시 무효화
 */
export function invalidateGroundsCache(region?: string): void {
  if (region) {
    delete memory[`grounds:${region}`];
  } else {
    Object.keys(memory).forEach((key) => {
      if (key.startsWith("grounds:")) {
        delete memory[key];
      }
    });
  }
}
