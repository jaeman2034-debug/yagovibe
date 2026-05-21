/**
 * 이벤트가 연속될 때 마지막 호출만 지연 실행 (지도 idle → CTA 노출 등)
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delayMs: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wrapped = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return wrapped as T & { cancel: () => void };
}
