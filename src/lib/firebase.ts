// === CORE PROTECTED: DO NOT MODIFY BELOW ===
// 🧠 YAGO VIBE Firebase Configuration
// 이 파일은 Cursor가 자동 수정하지 못하도록 보호됩니다.

// ======================================================
// 🧠 GENIUS MODE PATCH INSTRUCTION
// Project: YAGO VIBE CLEAN BUILD (SPT Edition)
// Author: ChatGPT (천재모드)
// Purpose: Firebase + AuthProvider + Router 구조 세팅
// ======================================================
//
// ⚠️ IMPORTANT DEVELOPER RULES for Cursor
// ------------------------------------------------------
// 1️⃣ 절대 다른 파일 수정 금지 — 지정된 파일만 수정할 것.
// 2️⃣ 파일이 없으면 새로 생성, 반드시 명시된 경로에 생성.
// 3️⃣ 이미 있는 코드는 덮어써도 됨 (본 지시문 내의 파일만).
// 4️⃣ 설치된 패키지, .env, tailwind 설정 절대 건드리지 말 것.
// 5️⃣ ChatGPT가 포함한 주석, 구조, import 경로 절대 삭제 금지.
// ------------------------------------------------------
// ✅ 이 패치는 Firebase + AuthProvider + Router 기반을 구축한다.
// ======================================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";
import { checkFirebaseConfig } from "../utils/firebaseDebug";

// Firebase 설정 값 검증
const validateFirebaseConfig = () => {
    const requiredVars = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const missingVars: string[] = [];
    const placeholderVars: string[] = [];

    Object.entries(requiredVars).forEach(([key, value]) => {
        if (!value || value === "" || value === undefined) {
            missingVars.push(`VITE_FIREBASE_${key.toUpperCase()}`);
        } else if (
            typeof value === "string" &&
            (value.includes("your-") || value.includes("YOUR-") || value === "G-XXXXXXXXXX")
        ) {
            placeholderVars.push(`VITE_FIREBASE_${key.toUpperCase()}`);
        }
    });

    if (missingVars.length > 0 || placeholderVars.length > 0) {
        console.error("❌ Firebase 설정 오류:");
        if (missingVars.length > 0) {
            console.error("  누락된 환경 변수:", missingVars.join(", "));
        }
        if (placeholderVars.length > 0) {
            console.error("  플레이스홀더 값 (실제 값으로 교체 필요):", placeholderVars.join(", "));
        }
        console.error(
            "\n📝 해결 방법:\n" +
            "  1. Firebase Console > 프로젝트 설정 > 일반 > 웹 앱에서 Firebase 설정 확인\n" +
            "  2. .env.local 파일에 실제 값으로 교체\n" +
            "  3. 개발 서버 재시작: npm run dev\n"
        );
        throw new Error(
            `Firebase 설정이 올바르지 않습니다. ${missingVars.length > 0 ? "누락된 변수: " + missingVars.join(", ") : ""} ${placeholderVars.length > 0 ? "플레이스홀더 값: " + placeholderVars.join(", ") : ""
            }`
        );
    }

    console.log("✅ Firebase 설정 검증 완료");

    // 개발 모드에서만 상세 정보 표시
    if (import.meta.env.DEV) {
        console.log("💡 브라우저 콘솔에서 checkFirebaseConfig()를 실행하여 상세 설정을 확인할 수 있습니다.");
    }

    return requiredVars as {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
    };
};

const firebaseConfig = validateFirebaseConfig();

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 🔔 FCM Messaging
export const messagingPromise = (async (): Promise<Messaging | null> => {
    try {
        const ok = await isSupported();
        if (!ok) {
            console.warn("⚠️ 이 브라우저는 FCM을 지원하지 않습니다.");
            return null;
        }
        return getMessaging(app);
    } catch (error) {
        console.error("❌ FCM 초기화 오류:", error);
        return null;
    }
})();

/**
 * FCM 토큰 확보 및 Firestore에 저장
 */
export async function ensureFcmToken(userId: string): Promise<string | null> {
    try {
        const messaging = await messagingPromise;
        if (!messaging) {
            console.warn("⚠️ FCM이 지원되지 않습니다.");
            return null;
        }

        // 권한 요청
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("⚠️ 알림 권한이 거부되었습니다.");
            return null;
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.warn("⚠️ VITE_FIREBASE_VAPID_KEY가 설정되지 않았습니다.");
            return null;
        }

        const token = await getToken(messaging, { vapidKey });
        if (!token) {
            console.warn("⚠️ FCM 토큰을 가져올 수 없습니다.");
            return null;
        }

        // 토큰 Firestore에 저장
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        await setDoc(
            doc(db, "users", userId, "fcmTokens", token),
            {
                token,
                createdAt: serverTimestamp(),
                device: navigator.userAgent,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        console.log("✅ FCM 토큰 저장 완료:", token.substring(0, 20) + "...");
        return token;
    } catch (error) {
        console.error("❌ FCM 토큰 확보 중 오류:", error);
        return null;
    }
}

/**
 * 앱 포그라운드 수신 핸들러
 */
export function attachOnMessage(handler: (payload: any) => void) {
    messagingPromise.then((messaging) => {
        if (!messaging) return;

        onMessage(messaging, (payload) => {
            console.log("🔔 포그라운드 FCM 메시지 수신:", payload);
            handler(payload);
        });
    });
}

// ======================================================
// ✅ END OF GENIUS MODE PATCH (DO NOT MODIFY ABOVE LINES)
// ======================================================

// === END PROTECTED ===
