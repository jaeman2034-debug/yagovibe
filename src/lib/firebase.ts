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

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 설정 검증
console.log("⚙️ Firebase 초기화 중...");
console.log("📋 Firebase Config 확인:");
console.log("  - Project ID:", firebaseConfig.projectId);
console.log("  - Auth Domain:", firebaseConfig.authDomain);
if (firebaseConfig.authDomain && !firebaseConfig.authDomain.includes("firebaseapp.com")) {
  console.warn("⚠️ authDomain이 'firebaseapp.com'을 포함하지 않습니다. Firebase Console에서 확인해주세요.");
}
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR") || firebaseConfig.apiKey.includes("your")) {
  console.warn("⚠️ API Key가 올바르게 설정되지 않았습니다. .env 파일을 확인해주세요.");
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
console.log("✅ Firebase App initialized:", app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// 익명 로그인 시도 여부 추적 (한 번만 시도)
let hasAttemptedAnonymousLogin = false;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Firebase 로그인 상태 유지:", user.uid);
    hasAttemptedAnonymousLogin = false; // 로그인 성공 시 리셋
    return;
  }
  
  // 이미 시도했으면 더 이상 시도하지 않음 (무한 재시도 방지)
  if (hasAttemptedAnonymousLogin) {
    return;
  }
  
  hasAttemptedAnonymousLogin = true;
  
  try {
    await signInAnonymously(auth);
    console.log("✅ 익명 로그인 완료");
    hasAttemptedAnonymousLogin = false; // 성공 시 리셋
  } catch (err: any) {
    // 개발 환경: referer 오류는 조용히 무시 (앱은 계속 작동)
    if (err?.code === "auth/requests-from-referer-are-blocked") {
      // 오류를 조용히 무시 (콘솔에 출력하지 않음)
      // 앱은 로그인 없이도 계속 작동할 수 있도록 함
      return;
    } else {
      // 다른 오류는 로그만 출력 (앱은 계속 작동)
      console.error("❌ 익명 로그인 실패:", err?.code || err?.message || err);
    }
  }
});

const USE_EMULATOR = import.meta.env.VITE_USE_EMULATOR === "true";

if (USE_EMULATOR) {
  console.log("🔥 Emulator mode enabled!");
  console.log("⚙️ Firebase Emulator 연결 중...");
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8083);
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.log("🔥 Firestore / Auth / Storage Emulator 연결 완료");
  } catch (err) {
    console.error("❌ Emulator 연결 실패:", err);
  }
} else {
  console.log("✅ Firebase Production 연결 중...");
}

export { app, db, auth, storage };

// 익명 로그인 수동 실행 함수 (브라우저 콘솔에서 사용 가능)
export async function tryAnonymousLogin() {
  try {
    console.log("🔄 익명 로그인 시도 중...");
    const userCred = await signInAnonymously(auth);
    console.log("✅ 익명 로그인 성공!");
    console.log("   사용자 UID:", userCred.user.uid);
    console.log("   익명 사용자:", userCred.user.isAnonymous);
    hasAttemptedAnonymousLogin = false; // 수동 로그인 성공 시 리셋
    return userCred;
  } catch (err: any) {
    if (err?.code === "auth/requests-from-referer-are-blocked") {
      console.warn("⚠️ 익명 로그인 실패: Firebase Console에서 localhost 도메인을 허용해주세요.");
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.warn("📌 해결 방법:");
      console.warn("   1. Firebase Console 접속: https://console.firebase.google.com");
      console.warn("   2. 프로젝트 선택");
      console.warn("   3. Authentication > Settings 탭");
      console.warn("   4. Authorized domains 섹션에서 'Add domain' 클릭");
      console.warn("   5. 'localhost' 입력 후 저장");
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.warn("💡 참고: 이 오류는 개발 환경에서만 발생하며, 앱은 계속 작동합니다.");
    } else {
      console.error("❌ 익명 로그인 실패:", err?.code || err?.message || err);
    }
    hasAttemptedAnonymousLogin = false; // 실패해도 리셋하여 재시도 가능하게
    throw err;
  }
}

// 상품 데이터 확인 함수 (브라우저 콘솔용)
export async function checkProductData() {
  try {
    const { collection, getDocs, limit, query } = await import("firebase/firestore");
    console.log("🔍 Firestore에서 실제 상품 데이터 확인 중...\n");
    
    const q = query(collection(db, "marketProducts"), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("❌ 저장된 상품 데이터가 없습니다.");
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    const result = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null
    };
    
    console.log("✅ 실제 저장된 상품 데이터 (1개):\n");
    console.log(JSON.stringify(result, null, 2));
    
    console.log("\n📋 한 줄 버전:");
    console.log(JSON.stringify(result));
    
    return result;
  } catch (error: any) {
    console.error("❌ 오류:", error.message || error);
    return null;
  }
}

// 브라우저 콘솔에서 사용할 수 있도록 전역 함수로 등록
if (typeof window !== "undefined") {
  (window as any).tryAnonymousLogin = tryAnonymousLogin;
  (window as any).checkProductData = checkProductData;
  console.log("💡 브라우저 콘솔에서 사용 가능한 함수:");
  console.log("   - tryAnonymousLogin() - 익명 로그인");
  console.log("   - checkProductData() - 상품 데이터 확인");
}

// ======================================================
// ✅ END OF GENIUS MODE PATCH (DO NOT MODIFY ABOVE LINES)
// ======================================================

// === END PROTECTED ===
