/**
 * 🔥 Stories Cache - 스토리 캐시 (지역 단위)
 * 
 * Week8 핵심: 성능 최적화를 위한 메모리 캐시
 */

const memory: Record<string, { v: any; t: number }> = {};

const DEFAULT_TTL = 30_000; // 30초

/**
 * 캐시된 스토리 조회
 * 
 * @param region 지역
 * @param loader 실제 데이터 로더 함수
 * @param ttl 캐시 TTL (밀리초, 기본 30초)
 * @returns 캐시된 데이터 또는 새로 로드한 데이터
 */
export async function cachedStories<T>(
  region: string,
  loader: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const key = `stories:${region}`;
  const hit = memory[key];

  // 캐시 히트 확인
  if (hit && Date.now() - hit.t < ttl) {
    return hit.v as T;
  }

  // 캐시 미스: 새로 로드
  const v = await loader();
  memory[key] = { v, t: Date.now() };
  return v;
}

/**
 * 캐시 무효화
 */
export function invalidateStoriesCache(region?: string): void {
  if (region) {
    delete memory[`stories:${region}`];
  } else {
    // 모든 지역 캐시 삭제
    Object.keys(memory).forEach((key) => {
      if (key.startsWith("stories:")) {
        delete memory[key];
      }
    });
  }
}

/**
 * 캐시 통계
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
  hits: number;
} {
  return {
    size: Object.keys(memory).length,
    keys: Object.keys(memory),
    hits: 0, // TODO: 히트 카운터 추가
  };
}
