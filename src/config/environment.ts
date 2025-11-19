// ✅ 환경 자동 감지 및 설정
// 개발/프로덕션 환경을 자동으로 감지하여 적절한 설정을 적용합니다.

/**
 * 현재 환경이 로컬 개발 환경인지 확인
 */
export const isLocalEnvironment = (): boolean => {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("local")
  );
};

/**
 * 현재 환경이 개발 모드인지 확인
 */
export const isDevelopmentMode = (): boolean => {
  return import.meta.env.MODE === "development";
};

/**
 * API Base URL 자동 설정
 */
export const getApiBaseUrl = (): string => {
  if (isLocalEnvironment()) {
    return "http://localhost:5183";
  }
  return "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
};

/**
 * Firebase 에뮬레이터 설정
 */
export const getFirebaseEmulatorConfig = () => {
  if (!isDevelopmentMode() || !isLocalEnvironment()) {
    return null;
  }

  return {
    auth: {
      host: "localhost",
      port: 9099,
    },
    firestore: {
      host: "localhost",
      port: 8080,
    },
    storage: {
      host: "localhost",
      port: 9199,
    },
    functions: {
      host: "localhost",
      port: 5001,
    },
  };
};

/**
 * 환경별 설정 출력 (개발 모드에서만)
 */
export const logEnvironmentInfo = () => {
  if (isDevelopmentMode()) {
    console.log("🌍 환경 정보:", {
      environment: import.meta.env.MODE,
      hostname: window.location.hostname,
      isLocal: isLocalEnvironment(),
      apiBaseUrl: getApiBaseUrl(),
      emulatorEnabled: !!getFirebaseEmulatorConfig(),
    });
  }
};

// 초기화 시 환경 정보 출력
if (isDevelopmentMode()) {
  logEnvironmentInfo();
}

