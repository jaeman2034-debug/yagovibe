/**
 * 🗺️ Google Maps API 동적 로드 유틸리티
 * 환경 변수를 검증하고 Google Maps API 스크립트를 동적으로 로드합니다.
 */

declare global {
    interface Window {
        google: any;
        __googleMapsApiLoaded__?: boolean;
        __googleMapsInit?: () => void;
        __googleMapsErrorHandler?: (error: any) => void;
        __googleMapsErrorListener?: (event: any) => void;
        __googleMapsPendingPromises?: Array<{ resolve: (value: boolean) => void; reject: (error: Error) => void }>;
        gm_authFailure?: (error: any) => void;
    }
}

/**
 * Google Maps API 스크립트가 이미 로드되었는지 확인
 */
export const isGoogleMapsLoaded = (): boolean => {
    return typeof window !== "undefined" && typeof window.google !== "undefined" && window.google?.maps !== undefined;
};

/**
 * Google Maps API 스크립트 동적 로드
 * @returns Promise<boolean> - 로드 성공 여부
 */
export const loadGoogleMapsAPI = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        // 🧩 API 키 확인 로그
        console.log("🧩 Google Maps API KEY =", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

        // 이미 로드되어 있으면 즉시 반환
        if (isGoogleMapsLoaded()) {
            console.log("✅ Google Maps API가 이미 로드되어 있습니다.");
            resolve(true);
            return;
        }

        // 이미 로딩 중이면 대기
        if (window.__googleMapsApiLoaded__ === false) {
            const checkInterval = setInterval(() => {
                if (isGoogleMapsLoaded()) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (window.__googleMapsApiLoaded__ === true) {
                    clearInterval(checkInterval);
                    reject(new Error("Google Maps API 로드 실패"));
                }
            }, 100);
            return;
        }

        // 환경 변수 검증
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey || apiKey === "" || apiKey === "your-google-maps-api-key" || apiKey.includes("your-")) {
            const error = new Error(
                "Google Maps API 키가 설정되지 않았습니다.\n\n" +
                "해결 방법:\n" +
                "1. .env.local 파일에 VITE_GOOGLE_MAPS_API_KEY를 설정하세요\n" +
                "2. 개발 서버를 재시작하세요\n" +
                "3. 브라우저 콘솔에서 getGoogleMapsEnv()를 실행하여 확인하세요"
            );
            console.error("❌ Google Maps API 키 오류:", error.message);
            reject(error);
            return;
        }

        console.log("🗺️ Google Maps API 로드 중...");
        console.log("📋 API 키:", apiKey.substring(0, 10) + "... (" + apiKey.length + "자)");

        // 로딩 중 플래그 설정
        window.__googleMapsApiLoaded__ = false;

        // Google Maps API 오류 콜백 함수 설정 (전역)
        if (!window.__googleMapsErrorHandler) {
            window.__googleMapsErrorHandler = (err: any) => {
                console.error("❌ Google Maps API 오류 (gm_authFailure):", err);
                window.__googleMapsApiLoaded__ = false;

                // err가 undefined이거나 빈 값일 수도 있음 (Google API의 경우)
                // InvalidKeyMapError는 보통 콘솔에만 나타나고 err로 전달되지 않을 수 있음
                let errorType = "Unknown";
                let errorMessage = "Google Maps API 오류가 발생했습니다.";

                // err가 문자열인 경우
                if (err && typeof err === "string") {
                    errorType = err;
                    if (err.includes("InvalidKeyMapError") || err.includes("InvalidKey")) {
                        errorMessage =
                            "Google Maps API 키가 유효하지 않습니다.\n\n" +
                            "해결 방법:\n" +
                            "1. Google Cloud Console에서 Maps JavaScript API 활성화 확인\n" +
                            "2. API 키의 도메인 제한에 다음 추가:\n" +
                            "   - http://localhost:5178/*\n" +
                            "   - http://localhost:5179/*\n" +
                            "   - http://127.0.0.1:5178/*\n" +
                            "   - http://127.0.0.1:5179/*\n" +
                            "   - https://localhost:5178/*\n" +
                            "   - https://localhost:5179/*\n" +
                            "3. API 키가 올바른 프로젝트의 것인지 확인\n" +
                            "4. 결제 계정이 연동되어 있는지 확인 (필요한 경우)";
                    } else if (err.includes("RefererNotAllowedMapError")) {
                        errorMessage =
                            "API 키의 도메인 제한 때문에 거부되었습니다.\n\n" +
                            "Google Cloud Console > API 키 > 웹사이트 제한사항에\n" +
                            "현재 도메인을 추가해주세요.";
                    }
                } else if (!err || err === undefined || err === null) {
                    // err가 undefined인 경우 - InvalidKeyMapError 가능성 높음
                    // 콘솔에 이미 "InvalidKeyMapError"가 출력되었을 가능성
                    errorType = "InvalidKeyMapError";
                    errorMessage =
                        "Google Maps API 키가 유효하지 않습니다 (InvalidKeyMapError)\n\n" +
                        "해결 방법:\n" +
                        "1. Google Cloud Console에서 Maps JavaScript API 활성화 확인\n" +
                        "2. API 키의 도메인 제한에 다음 추가:\n" +
                        "   - http://localhost:5178/*\n" +
                        "   - http://localhost:5179/*\n" +
                        "   - http://127.0.0.1:5178/*\n" +
                        "   - http://127.0.0.1:5179/*\n" +
                        "   - https://localhost:5178/*\n" +
                        "   - https://localhost:5179/*\n" +
                        "3. API 키가 올바른 프로젝트의 것인지 확인\n" +
                        "4. 결제 계정이 연동되어 있는지 확인 (필요한 경우)";
                }

                // 이벤트로 오류 전파
                window.dispatchEvent(new CustomEvent("googlemaps-error", {
                    detail: {
                        error: errorType,
                        originalError: err,
                        message: errorMessage
                    }
                }));
            };

            // 전역 오류 핸들러로 등록
            (window as any).gm_authFailure = window.__googleMapsErrorHandler;
        }

        // Promise resolve/reject를 저장할 배열 (여러 호출 지원)
        if (!window.__googleMapsPendingPromises) {
            (window as any).__googleMapsPendingPromises = [];
        }

        const pendingPromises = (window as any).__googleMapsPendingPromises;
        pendingPromises.push({ resolve, reject });

        // 초기화 콜백 함수 (한 번만 설정)
        if (!window.__googleMapsInit) {
            window.__googleMapsInit = () => {
                console.log("🔧 Google Maps API 초기화 콜백 호출됨");
                console.log("🔍 window.google 상태:", {
                    exists: !!window.google,
                    maps: !!window.google?.maps,
                    Map: !!window.google?.maps?.Map
                });

                // 약간의 지연 후 실제로 API가 작동하는지 검증
                setTimeout(() => {
                    if (window.google && window.google.maps && window.google.maps.Map) {
                        console.log("✅ Google Maps API 로드 및 검증 완료!");
                        window.__googleMapsApiLoaded__ = true;

                        // API 키 검증 - window.google.maps.Map 객체가 존재하는지만 확인
                        // 실제 지도 인스턴스 생성은 컴포넌트에서 처리
                        // (InvalidKeyMapError는 실제 지도 렌더링 시점에 발생하므로 여기서는 API 로드만 확인)

                        // 모든 대기 중인 Promise resolve
                        pendingPromises.forEach((p: any) => p.resolve(true));
                        pendingPromises.length = 0;
                    } else {
                        console.error("❌ Google Maps API가 완전히 로드되지 않았습니다.");
                        window.__googleMapsApiLoaded__ = false;
                        const initError = new Error("Google Maps API가 완전히 로드되지 않았습니다.");
                        pendingPromises.forEach((p: any) => p.reject(initError));
                        pendingPromises.length = 0;
                    }
                }, 500);
            };
            (window as any).__googleMapsInit = window.__googleMapsInit;
        } else {
            // 이미 초기화 콜백이 있으면, 로드 상태만 확인
            if (window.__googleMapsApiLoaded__ && window.google?.maps?.Map) {
                resolve(true);
                return;
            }
            // 아직 로딩 중이면 Promise만 대기
        }

        // 스크립트가 이미 있는지 확인 (중복 로드 방지)
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
        if (existingScript) {
            console.log("⚠️ Google Maps API 스크립트가 이미 존재합니다. 로드 완료 대기 중...");
            // 이미 스크립트가 로드 중이면, 초기화 콜백을 기다림
            return;
        }

        // 타임아웃 백업 (콜백이 호출되지 않는 경우)
        const timeoutId = setTimeout(() => {
            if (!window.__googleMapsApiLoaded__ && pendingPromises.length > 0) {
                console.warn("⚠️ Google Maps API 로드 타임아웃");
                const timeoutError = new Error("Google Maps API 로드 타임아웃 - 콜백이 호출되지 않았습니다.");
                pendingPromises.forEach((p: any) => p.reject(timeoutError));
                pendingPromises.length = 0;
            }
        }, 5000); // 5초 타임아웃

        // 스크립트 생성
        const script = document.createElement("script");
        const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker,geometry&callback=__googleMapsInit`;

        // 🔍 디버깅: 전체 스크립트 URL 출력
        console.log("📋 Google Maps 스크립트 URL:", scriptUrl);
        console.log("🔑 API 키 확인:", apiKey ? `${apiKey.substring(0, 20)}... (${apiKey.length}자)` : "❌ undefined");

        script.src = scriptUrl;
        script.async = true;
        script.defer = true;

        // 🔍 디버깅: 스크립트 생성 확인
        console.log("📝 스크립트 요소 생성됨:", {
            id: script.id || "없음",
            src: script.src.substring(0, 100) + "...",
            async: script.async,
            defer: script.defer
        });

        // 오류 핸들러
        script.onerror = (scriptError) => {
            clearTimeout(timeoutId);
            console.error("❌ Google Maps API 스크립트 로드 실패:", scriptError);
            console.error("📋 실패한 스크립트 URL:", script.src);
            console.error("🔍 스크립트 요소:", {
                id: script.id,
                /* readyState: script.readyState, */
                onerror: typeof script.onerror
            });
            window.__googleMapsApiLoaded__ = false;

            const scriptErrorMessage =
                "Google Maps API 스크립트 로드에 실패했습니다.\n\n" +
                "가능한 원인:\n" +
                "1. 네트워크 연결 문제\n" +
                "2. API 키가 잘못되었음\n" +
                "3. 방화벽 또는 보안 소프트웨어 차단\n\n" +
                "해결 방법:\n" +
                "1. 네트워크 연결 확인\n" +
                "2. .env.local의 API 키 확인\n" +
                "3. 브라우저 콘솔에서 checkGoogleMapsEnv() 실행";

            const scriptLoadError = new Error(scriptErrorMessage);
            pendingPromises.forEach((p: any) => p.reject(scriptLoadError));
            pendingPromises.length = 0;
        };

        // 오류 이벤트 리스너 (gm_authFailure 콜백에서 발생) - 한 번만 등록
        if (!window.__googleMapsErrorListener) {
            window.__googleMapsErrorListener = (event: any) => {
                // 타임아웃은 전역 리스너에서 처리하지 않고 각 Promise의 timeoutId에서 처리
                const errorData = event.detail;
                window.__googleMapsApiLoaded__ = false;
                const authError = new Error(errorData.message || "Google Maps API 오류");
                const currentPromises = (window as any).__googleMapsPendingPromises;
                if (currentPromises && currentPromises.length > 0) {
                    currentPromises.forEach((p: any) => p.reject(authError));
                    currentPromises.length = 0;
                }
            };

            window.addEventListener("googlemaps-error", window.__googleMapsErrorListener as EventListener);
        }

        // 스크립트 추가
        document.head.appendChild(script);
    });
};

/**
 * Google Maps API 키 환경 변수 확인 (브라우저 콘솔용)
 */
export const checkGoogleMapsEnv = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    console.log("🗺️ Google Maps API 설정 확인");
    console.log("======================================");

    if (!apiKey || apiKey === "" || apiKey === "your-google-maps-api-key" || apiKey.includes("your-")) {
        console.error("❌ VITE_GOOGLE_MAPS_API_KEY: 설정되지 않음 또는 플레이스홀더 값");
        console.error("\n📝 해결 방법:");
        console.error("  1. .env.local 파일에 VITE_GOOGLE_MAPS_API_KEY 설정");
        console.error("  2. Google Cloud Console에서 API 키 발급");
        console.error("  3. 개발 서버 재시작: npm run dev");
    } else {
        console.log(`✅ VITE_GOOGLE_MAPS_API_KEY: ${apiKey.substring(0, 10)}... (${apiKey.length}자)`);
        console.log("✅ API 키가 설정되어 있습니다!");
    }

    console.log("======================================");
    console.log(`지도 로드 상태: ${isGoogleMapsLoaded() ? "✅ 로드됨" : "❌ 미로드"}`);

    return {
        hasApiKey: !!apiKey && !apiKey.includes("your-"),
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : "없음",
        isLoaded: isGoogleMapsLoaded(),
    };
};

// 브라우저 콘솔에서 사용 가능하도록 전역 함수 등록
if (typeof window !== "undefined") {
    (window as any).checkGoogleMapsEnv = checkGoogleMapsEnv;
    (window as any).loadGoogleMapsAPI = loadGoogleMapsAPI;
    (window as any).isGoogleMapsLoaded = isGoogleMapsLoaded;

    console.log("💡 브라우저 콘솔에서 사용 가능한 Google Maps 함수:");
    console.log("  - checkGoogleMapsEnv() - API 키 설정 확인");
    console.log("  - loadGoogleMapsAPI() - API 동적 로드");
    console.log("  - isGoogleMapsLoaded() - 로드 상태 확인");
}

