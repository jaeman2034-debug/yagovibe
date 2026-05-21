// src/lib/firebase.ts
// 🔥 Firebase SDK 명시적 import (배포 환경에서 로드 보장)
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import { ensureDurableAuthPersistence, useSessionPersistenceInDev } from "@/utils/authHelpers";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

// 🔥 Firebase SDK 로드 확인
console.log("🔍 [firebase.ts] Firebase SDK 로드 확인:", {
  initializeApp: typeof initializeApp !== "undefined" ? "✅ 로드됨" : "❌ undefined",
  getAuth: typeof getAuth !== "undefined" ? "✅ 로드됨" : "❌ undefined",
  getFirestore: typeof getFirestore !== "undefined" ? "✅ 로드됨" : "❌ undefined",
  getStorage: typeof getStorage !== "undefined" ? "✅ 로드됨" : "❌ undefined",
  firebaseApp: typeof FirebaseApp !== "undefined" ? "✅ 타입 로드됨" : "❌ 타입 없음",
});

// 🔥 환경 변수 검증 및 디버깅
const envVars = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("🔍 [firebase.ts] 환경 변수 확인:", {
  apiKey: envVars.VITE_FIREBASE_API_KEY ? `✅ ${envVars.VITE_FIREBASE_API_KEY.substring(0, 10)}...` : "❌ undefined",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID ? `✅ ${envVars.VITE_FIREBASE_MESSAGING_SENDER_ID}` : "❌ undefined",
  appId: envVars.VITE_FIREBASE_APP_ID ? `✅ ${envVars.VITE_FIREBASE_APP_ID.substring(0, 20)}...` : "❌ undefined",
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  hostname: typeof window !== "undefined" ? window.location.hostname : "SSR",
});

// 🔥 필수 환경 변수 검증
const missingVars: string[] = [];
if (!envVars.VITE_FIREBASE_API_KEY) missingVars.push("VITE_FIREBASE_API_KEY");
if (!envVars.VITE_FIREBASE_MESSAGING_SENDER_ID) missingVars.push("VITE_FIREBASE_MESSAGING_SENDER_ID");
if (!envVars.VITE_FIREBASE_APP_ID) missingVars.push("VITE_FIREBASE_APP_ID");

if (missingVars.length > 0) {
  const errorMsg = `❌ [firebase.ts] 필수 환경 변수가 누락되었습니다: ${missingVars.join(", ")}\n\n` +
    `해결 방법:\n` +
    `1. 로컬 개발: .env.local 파일에 환경 변수 추가\n` +
    `2. 배포 환경: Firebase Hosting 환경 변수 설정 확인\n` +
    `3. Vercel: Settings > Environment Variables에서 확인`;
  
  console.error(errorMsg);
  
  // 개발 환경에서는 에러를 throw하여 즉시 알림
  if (import.meta.env.DEV) {
    throw new Error(errorMsg);
  }
  
  // 프로덕션에서는 경고만 표시하고 계속 진행 (기본값 사용)
  console.warn("⚠️ [firebase.ts] 환경 변수 누락으로 인해 Firebase 초기화가 실패할 수 있습니다.");
}

// Firebase 설정 (하드코딩된 storageBucket 필수)
// ⚠️ authDomain은 항상 firebaseapp.com을 사용 (개발/프로덕션 모두)
// 개발 환경에서 localhost를 사용하려면 Firebase Console의 Authorized domains에 localhost 추가 필요
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt",
  // 🔥 실제 버킷 이름: yago-vibe-spt.firebasestorage.app
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL?.trim() ||
    "https://yago-vibe-spt-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// 🔥 Firebase 초기화 전 설정 확인
console.log("🔍 [firebase.ts] Firebase 설정 확인:", {
  apiKey: firebaseConfig.apiKey ? `✅ 설정됨 (${firebaseConfig.apiKey.substring(0, 10)}...)` : "❌ 없음",
  authDomain: firebaseConfig.authDomain ? `✅ ${firebaseConfig.authDomain}` : "❌ 없음",
  projectId: firebaseConfig.projectId ? `✅ ${firebaseConfig.projectId}` : "❌ 없음",
  storageBucket: firebaseConfig.storageBucket ? `✅ ${firebaseConfig.storageBucket}` : "❌ 없음",
  messagingSenderId: firebaseConfig.messagingSenderId ? `✅ ${firebaseConfig.messagingSenderId}` : "❌ 없음",
  appId: firebaseConfig.appId ? `✅ 설정됨 (${firebaseConfig.appId.substring(0, 20)}...)` : "❌ 없음",
});

// 앱 초기화 (중복 생성 방지)
let app: FirebaseApp;
try {
  // 🔥 initializeApp 함수 존재 확인
  if (typeof initializeApp === "undefined") {
    throw new Error("❌ [firebase.ts] initializeApp이 undefined입니다. Firebase SDK가 로드되지 않았습니다.");
  }

  if (!getApps().length) {
    console.log("🚀 [firebase.ts] Firebase 앱 초기화 시작...");
    console.log("🔍 [firebase.ts] initializeApp 함수:", typeof initializeApp);
    
    app = initializeApp(firebaseConfig);
    
    // 🔥 초기화 후 app 객체 확인
    if (!app) {
      throw new Error("❌ [firebase.ts] Firebase 앱 초기화 후 app이 null/undefined입니다.");
    }
    
    console.log("✅ [firebase.ts] Firebase 앱 초기화 성공:", {
      name: app.name,
      options: app.options ? "✅ 옵션 존재" : "❌ 옵션 없음",
    });
  } else {
    app = getApp();
    console.log("✅ [firebase.ts] 기존 Firebase 앱 사용:", app.name);
  }
} catch (error) {
  console.error("❌ [firebase.ts] Firebase 앱 초기화 실패:", error);
  console.error("❌ [firebase.ts] 에러 상세:", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    firebaseConfig: {
      apiKey: firebaseConfig.apiKey ? "✅ 설정됨" : "❌ 없음",
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
    },
  });
  throw error;
}

// Firebase 서비스들 (명시적 타입 지정)
let auth: Auth;
let db: Firestore;
let rtdb: Database;
let storage: FirebaseStorage;
let functions: Functions;

try {
  // 🔥 Third-party Cookie 문제 해결: browserPopupRedirectResolver 사용
  // initializeAuth는 앱이 처음 초기화될 때만 사용 가능
  if (typeof initializeAuth === "undefined") {
    throw new Error("❌ [firebase.ts] initializeAuth가 undefined입니다. Firebase Auth SDK가 로드되지 않았습니다.");
  }
  
  // 🔥 먼저 initializeAuth 시도 (browserPopupRedirectResolver 포함)
  try {
    console.log("🚀 [firebase.ts] Firebase Auth 초기화 시작 (browserPopupRedirectResolver 포함)...");
    /** 동기적으로 영속 저장소 연결 — 비동기 setPersistence만 믿으면 첫 로드·새로고침 직후 세션 복구와 레이스 가능 */
    const devSessionOnly = useSessionPersistenceInDev();
    auth = initializeAuth(app, {
      persistence: devSessionOnly
        ? [browserSessionPersistence]
        : [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    if (devSessionOnly) {
      console.info(
        "[firebase.ts] DEV session persistence — Chrome 탭별 계정 분리 (VITE_AUTH_SESSION_PERSISTENCE_DEV)",
      );
    }
    console.log("✅ [firebase.ts] Firebase Auth 초기화 성공 (Third-party Cookie 우회 설정 적용):", {
      auth: auth ? "✅ 객체 존재" : "❌ 객체 없음",
      app: auth.app.name,
      authDomain: auth.app.options.authDomain,
      projectId: auth.app.options.projectId,
      popupRedirectResolver: "✅ browserPopupRedirectResolver 적용됨",
    });
  } catch (initError: any) {
    // initializeAuth가 실패하면 (이미 초기화된 경우) getAuth 사용
    if (initError.code === "auth/already-initialized") {
      console.log("⚠️ [firebase.ts] Auth가 이미 초기화됨 - getAuth 사용");
      if (typeof getAuth === "undefined") {
        throw new Error("❌ [firebase.ts] getAuth가 undefined입니다. Firebase Auth SDK가 로드되지 않았습니다.");
      }
      auth = getAuth(app);
      /** 다른 번들이 먼저 초기화한 경우에도 로컬 영속이 기본인지 확인 — authPersistenceReady에서 재설정됨 */
      void ensureDurableAuthPersistence(auth).catch(() => {});
      console.log("✅ [firebase.ts] Firebase Auth (getAuth) 초기화 성공:", {
        auth: auth ? "✅ 객체 존재" : "❌ 객체 없음",
        app: auth.app.name,
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
      });
    } else {
      // 다른 에러는 다시 throw
      throw initError;
    }
  }
} catch (error) {
  console.error("❌ [firebase.ts] Firebase Auth 초기화 실패:", error);
  throw error;
}

try {
  // 🔥 getFirestore 함수 존재 확인
  if (typeof getFirestore === "undefined") {
    throw new Error("❌ [firebase.ts] getFirestore가 undefined입니다. Firebase Firestore SDK가 로드되지 않았습니다.");
  }
  
  db = getFirestore(app);
  console.log("✅ [firebase.ts] Firebase Firestore 초기화 성공");
} catch (error) {
  console.error("❌ [firebase.ts] Firebase Firestore 초기화 실패:", error);
  throw error;
}

try {
  // 🔥 getStorage 함수 존재 확인
  if (typeof getStorage === "undefined") {
    throw new Error("❌ [firebase.ts] getStorage가 undefined입니다. Firebase Storage SDK가 로드되지 않았습니다.");
  }
  
  storage = getStorage(app);
  console.log("✅ [firebase.ts] Firebase Storage 초기화 성공");
} catch (error) {
  console.error("❌ [firebase.ts] Firebase Storage 초기화 실패:", error);
  throw error;
}

try {
  if (typeof getFunctions === "undefined") {
    throw new Error("❌ [firebase.ts] getFunctions가 undefined입니다. Firebase Functions SDK가 로드되지 않았습니다.");
  }
  functions = getFunctions(app, "asia-northeast3");
  console.log("✅ [firebase.ts] Firebase Functions 초기화 성공 (asia-northeast3)");
} catch (error) {
  console.error("❌ [firebase.ts] Firebase Functions 초기화 실패:", error);
  throw error;
}

try {
  if (typeof getDatabase === "undefined") {
    throw new Error("❌ [firebase.ts] getDatabase가 undefined입니다. Firebase Database SDK가 로드되지 않았습니다.");
  }
  rtdb = getDatabase(app);
  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR === "true") {
    connectDatabaseEmulator(rtdb, "127.0.0.1", 9000);
    console.log("✅ [firebase.ts] RTDB emulator 연결 (127.0.0.1:9000)");
  }
  console.log("✅ [firebase.ts] Firebase Realtime Database 초기화 성공");
} catch (error) {
  console.error("❌ [firebase.ts] Firebase Realtime Database 초기화 실패:", error);
  throw error;
}

/**
 * initializeAuth persistence 이후에도 `getAuth` 폴백·저장소 실패 대비해 한 번 더 맞춤.
 * AuthProvider는 이 Promise 이후에만 onAuthStateChanged를 걸어 새로고침 직후 null 오탐·리다이렉트를 줄인다.
 */
export const authPersistenceReady: Promise<void> = (async () => {
  try {
    const isIndexedDBAvailable = typeof indexedDB !== "undefined";
    const isLocalStorageAvailable = typeof localStorage !== "undefined";
    const isCapacitor = typeof window !== "undefined" && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    const isWebView =
      /wv|WebView/i.test(navigator.userAgent) ||
      /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) ||
      /Android.*wv/i.test(navigator.userAgent);

    console.log("🔍 [firebase.ts] 저장소·환경:", {
      indexedDB: isIndexedDBAvailable,
      localStorage: isLocalStorageAvailable,
      isCapacitor: !!isCapacitor,
      isWebView,
    });

    if (useSessionPersistenceInDev()) {
      await setPersistence(auth, browserSessionPersistence);
    } else if (isCapacitor && isIndexedDBAvailable) {
      await setPersistence(auth, indexedDBLocalPersistence);
    } else if (!isIndexedDBAvailable && !isLocalStorageAvailable && isWebView) {
      await setPersistence(auth, browserSessionPersistence);
    } else {
      await ensureDurableAuthPersistence(auth);
    }

    console.log("✅ [firebase.ts] Auth Persistence 정렬 완료");
  } catch (error) {
    console.error("❌ [firebase.ts] Auth Persistence 정렬 실패:", error);
    try {
      await ensureDurableAuthPersistence(auth);
    } catch {
      /* 최종 폴백 */
    }
  }
})();

// 🔥 Google Auth Provider 설정
// ⚠️ 매번 새로 생성하도록 함수로 변경 (캐싱 문제 방지)
export const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  
  // 🔥 디버깅: auth 설정 확인
  console.log("🔍 [firebase.ts] GoogleAuthProvider 생성:", {
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId,
    apiKey: auth.app.options.apiKey ? `${auth.app.options.apiKey.substring(0, 10)}...` : "없음",
  });
  
  return provider;
};

// 🔥 하위 호환성을 위한 export (하지만 함수 사용 권장)
export const googleProvider = getGoogleProvider();

// 단일 export (중복 금지!!)
export { app, auth, db, rtdb, storage, functions };
