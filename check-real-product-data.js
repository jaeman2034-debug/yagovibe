// 실제 Firestore에서 상품 데이터 1개 가져오기
// Node.js 환경에서 실행: node check-real-product-data.js

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "yago-vibe-spt.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 에뮬레이터 사용 여부 확인
const USE_EMULATOR = process.env.VITE_USE_EMULATOR === "true";
if (USE_EMULATOR) {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8083);
    console.log("🔥 Firestore Emulator 연결됨");
  } catch (err) {
    console.log("⚠️ Emulator 연결 실패 (이미 연결됨일 수 있음)");
  }
}

async function getRealProductData() {
  try {
    console.log("🔍 Firestore에서 실제 상품 데이터 확인 중...\n");
    
    const q = query(collection(db, "marketProducts"), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("❌ 저장된 상품 데이터가 없습니다.");
      console.log("\n💡 데이터가 없다면 상품을 먼저 등록해주세요.");
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Timestamp를 ISO 문자열로 변환
    const result = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null
    };
    
    console.log("✅ 실제 저장된 상품 데이터 (1개):\n");
    console.log(JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error("❌ 오류:", error.message);
    console.error("상세:", error);
    return null;
  }
}

getRealProductData().then(() => {
  console.log("\n✅ 확인 완료!");
  process.exit(0);
}).catch(err => {
  console.error("❌ 실행 오류:", err);
  process.exit(1);
});

