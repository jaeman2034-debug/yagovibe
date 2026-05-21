// === CORE PROTECTED: DO NOT MODIFY BELOW ===
// 🧠 YAGO SPORTS Environment Configuration
// 이 파일은 Cursor가 자동 수정하지 못하도록 보호됩니다.

// ✅ Firebase 환경 변수 (보호됨)
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ✅ Google Maps API 키 (보호됨)
export const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ✅ OpenAI API 키 (보호됨)
export const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

// ✅ 환경 변수 검증 (보호됨)
export const validateEnvironment = () => {
    const required = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_GOOGLE_MAPS_API_KEY'
    ];

    const missing = required.filter(key => !import.meta.env[key]);

    if (missing.length > 0) {
        console.warn('⚠️ Missing environment variables:', missing);
        return false;
    }

    return true;
};

// === END PROTECTED ===
