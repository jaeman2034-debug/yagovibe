/**
 * 🔐 마이크 권한 체크 유틸리티 (모바일 안정화)
 * 모바일 크롬에서 SpeechRecognition이 즉시 종료되는 문제 해결
 */

/**
 * 마이크 권한 체크 (최우선!)
 * @returns {Promise<boolean>} 권한 허용 여부
 */
export async function checkMicPermission(): Promise<boolean> {
    try {
        // 🔥 모바일에서 확실히 권한 요청
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 🔥 스트림 정리 (중요: 메모리 누수 방지)
        stream.getTracks().forEach((track) => track.stop());
        
        console.log("✅ [MicPermission] 마이크 권한 허용됨");
        return true;
    } catch (e: any) {
        console.error("❌ [MicPermission] 마이크 권한 거부:", e);
        return false;
    }
}

/**
 * HTTPS 환경 체크
 * @returns {boolean} HTTPS 여부
 */
export function isHTTPS(): boolean {
    if (typeof window === "undefined") return false;
    
    // localhost는 개발 환경에서 허용
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return true;
    }
    
    // 프로덕션에서는 반드시 HTTPS
    return window.location.protocol === "https:";
}

/**
 * 모바일 환경 체크
 * @returns {boolean} 모바일 여부
 */
export function isMobile(): boolean {
    if (typeof navigator === "undefined") return false;
    
    const ua = navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
}

/**
 * 모바일 크롬 체크
 * @returns {boolean} 모바일 크롬 여부
 */
export function isMobileChrome(): boolean {
    if (typeof navigator === "undefined") return false;
    
    const ua = navigator.userAgent.toLowerCase();
    return /android.*chrome|chrome.*android/i.test(ua);
}

/**
 * 환경 검증 (모바일 안정화)
 * @returns {Promise<{ valid: boolean; message?: string }>}
 */
export async function validateEnvironment(): Promise<{ valid: boolean; message?: string }> {
    // 1. HTTPS 체크 (모바일 필수)
    if (isMobile() && !isHTTPS()) {
        return {
            valid: false,
            message: "⚠️ 모바일에서는 HTTPS 환경이 필요해요.\n현재 주소: " + window.location.href,
        };
    }
    
    // 2. 마이크 권한 체크
    const hasPermission = await checkMicPermission();
    if (!hasPermission) {
        return {
            valid: false,
            message: "🚫 마이크 권한이 필요해요.\n브라우저 설정에서 마이크 권한을 허용해주세요.",
        };
    }
    
    // 3. SpeechRecognition 지원 체크
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
        return {
            valid: false,
            message: "⚠️ 이 브라우저는 음성 인식을 지원하지 않아요.\nChrome 또는 Chrome 기반 브라우저를 사용해주세요.",
        };
    }
    
    return { valid: true };
}

