/**
 * 🔥 개발 환경 유틸리티
 * 
 * 프로덕션에서 불필요한 로그를 제거하기 위한 헬퍼 함수
 */

/**
 * 개발 환경인지 확인
 */
export const isDevelopment = (): boolean => {
  return (
    import.meta.env.DEV ||
    import.meta.env.MODE === "development" ||
    import.meta.env.VITE_ENV === "development" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("localhost")
  );
};

/**
 * 개발 환경에서만 로그 출력
 */
export const devLog = (...args: any[]): void => {
  if (isDevelopment()) {
    console.log(...args);
  }
};

/**
 * 개발 환경에서만 경고 출력
 */
export const devWarn = (...args: any[]): void => {
  if (isDevelopment()) {
    console.warn(...args);
  }
};

/**
 * 개발 환경에서만 에러 출력 (프로덕션에서도 에러는 출력)
 */
export const devError = (...args: any[]): void => {
  if (isDevelopment()) {
    console.error(...args);
  } else {
    // 프로덕션에서는 에러만 간단히 로깅 (Sentry 등으로 전송 가능)
    console.error("[Production Error]", args[0]);
  }
};
