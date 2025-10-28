// === CORE PROTECTED: DO NOT MODIFY BELOW ===
// 🧠 YAGO VIBE Constants Configuration
// 이 파일은 Cursor가 자동 수정하지 못하도록 보호됩니다.

// ✅ 애플리케이션 상수 (보호됨)
export const APP_CONFIG = {
    name: "YAGO VIBE SPT",
    version: "1.0.0",
    description: "AI Voice Assistant with Google Maps",
};

// ✅ 라우팅 상수 (보호됨)
export const ROUTES = {
    HOME: "/",
    START: "/start",
    VOICE_MAP: "/voice-map",
    VOICE_NAVIGATION: "/voice-navigation",
} as const;

// ✅ 음성 인식 설정 (보호됨)
export const SPEECH_CONFIG = {
    language: "ko-KR",
    continuous: false,
    interimResults: false,
    maxAlternatives: 1,
};

// ✅ TTS 설정 (보호됨)
export const TTS_CONFIG = {
    language: "ko-KR",
    rate: 1.5,
    pitch: 1.0,
    volume: 0.8,
};

// ✅ 지도 설정 (보호됨)
export const MAP_CONFIG = {
    defaultZoom: 15,
    defaultCenter: { lat: 37.5665, lng: 126.9780 }, // 서울
    searchRadius: 3000,
};

// === END PROTECTED ===
