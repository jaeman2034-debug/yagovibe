/**
 * 🔥 AI fetch 안전 격리 유틸
 * 실패해도 앱이 죽지 않도록 보조 기능들을 안전하게 실행
 */

/**
 * 보조 기능 안전 실행 래퍼
 * @param fn 실행할 비동기 함수
 * @param label 로그용 라벨 (선택)
 * @returns 성공 시 결과, 실패 시 null
 */
export async function safeFetch<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    const prefix = label ? `[${label}]` : "[보조 기능]";
    console.warn(`⚠️ ${prefix} 실패 (무시됨):`, errorMsg);
    return null;
  }
}

