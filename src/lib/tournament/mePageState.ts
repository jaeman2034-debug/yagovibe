/**
 * 🔥 /me 페이지 안전 렌더링 아키텍처
 * 
 * 핵심 원칙:
 * - 절대 "있다고 가정"하지 않는다
 * - 모든 데이터는 loading | empty | ready | error 상태를 가진다
 * - 렌더 분기 → 데이터 접근 순서 (반대 금지)
 * - 배열/객체는 기본값을 먼저 확정
 */

/**
 * 상태 모델 (공통)
 */
export type LoadState = 'loading' | 'empty' | 'ready' | 'error';

export interface MePageState<T> {
  state: LoadState;
  data: T | null;
  error?: Error;
}

/**
 * 안전한 데이터 접근 헬퍼
 */
export function getSafeData<T>(pageState: MePageState<T>, defaultValue: T): T {
  if (pageState.state === 'ready' && pageState.data !== null) {
    return pageState.data;
  }
  return defaultValue;
}

/**
 * 안전한 배열 접근 헬퍼
 */
export function getSafeArray<T>(pageState: MePageState<T[]>, defaultValue: T[] = []): T[] {
  if (pageState.state === 'ready' && Array.isArray(pageState.data)) {
    return pageState.data;
  }
  return defaultValue;
}
