/**
 * 🔍 Firebase 설정 디버깅 유틸리티
 * 브라우저 콘솔에서 Firebase 설정을 확인하는 데 사용
 */

/**
 * 브라우저 콘솔에서 실행: checkFirebaseConfig()
 */
export const checkFirebaseConfig = () => {
    console.log("🔍 Firebase 설정 확인");
    console.log("======================================");

    const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY ? "설정됨 ✅" : "없음 ❌",
    };

    const issues: string[] = [];

    Object.entries(config).forEach(([key, value]) => {
        const envKey = `VITE_FIREBASE_${key.toUpperCase().replace(/([A-Z])/g, '_$1').toUpperCase()}`;

        if (!value || value === "" || value === undefined) {
            console.error(`❌ ${envKey}: 없음`);
            issues.push(`누락: ${envKey}`);
        } else if (typeof value === "string" && (value.includes("your-") || value.includes("YOUR-") || value === "G-XXXXXXXXXX")) {
            console.warn(`⚠️ ${envKey}: 플레이스홀더 값 (${value.substring(0, 20)}...)`);
            issues.push(`플레이스홀더: ${envKey}`);
        } else if (key === "apiKey" && typeof value === "string") {
            console.log(`✅ ${envKey}: ${value.substring(0, 10)}... (${value.length}자)`);
        } else if (key === "vapidKey") {
            console.log(`✅ ${envKey}: ${value}`);
        } else {
            console.log(`✅ ${envKey}: ${value}`);
        }
    });

    console.log("======================================");

    if (issues.length === 0) {
        console.log("✅ 모든 Firebase 설정이 올바르게 설정되었습니다!");
    } else {
        console.error(`❌ ${issues.length}개의 문제가 발견되었습니다:`);
        issues.forEach((issue) => console.error(`  - ${issue}`));
        console.error("\n📝 해결 방법:");
        console.error("  1. Firebase Console에서 실제 설정 값 확인");
        console.error("  2. .env.local 파일에 실제 값으로 교체");
        console.error("  3. 개발 서버 재시작: npm run dev");
    }

    return {
        isValid: issues.length === 0,
        issues,
        config,
    };
};

// 전역 함수로 등록 (브라우저 콘솔에서 사용 가능)
if (typeof window !== "undefined") {
    (window as any).checkFirebaseConfig = checkFirebaseConfig;

    // import.meta.env는 브라우저 콘솔에서 직접 사용할 수 없으므로
    // 대신 환경 변수 객체를 반환하는 함수 제공
    (window as any).getFirebaseEnv = () => {
        return {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            // API 키만 짧게 표시 (보안)
            apiKeyPreview: import.meta.env.VITE_FIREBASE_API_KEY
                ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 10)}... (${import.meta.env.VITE_FIREBASE_API_KEY.length}자)`
                : "없음",
        };
    };

    console.log(
        "💡 브라우저 콘솔에서 사용 가능한 디버깅 함수:\n" +
        "  - checkFirebaseConfig() - Firebase 설정 검증\n" +
        "  - getFirebaseEnv() - Firebase 환경 변수 확인 (import.meta.env 대체)\n" +
        "  - checkGoogleMapsEnv() - Google Maps API 키 확인\n" +
        "  - loadGoogleMapsAPI() - Google Maps API 동적 로드\n" +
        "  - isGoogleMapsLoaded() - Google Maps API 로드 상태 확인"
    );
}

