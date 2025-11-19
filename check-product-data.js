// Firestore에서 실제 상품 데이터 1개 확인 스크립트
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  projectId: "yago-vibe-spt",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkProductData() {
  try {
    console.log("🔍 Firestore에서 상품 데이터 확인 중...\n");
    
    const q = query(collection(db, "marketProducts"), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("❌ 저장된 상품 데이터가 없습니다.");
      return;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log("✅ 실제 저장된 상품 데이터 (1개):\n");
    console.log(JSON.stringify({
      id: doc.id,
      ...data,
      // Timestamp는 문자열로 변환
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null
    }, null, 2));
    
  } catch (error) {
    console.error("❌ 오류:", error);
  }
}

checkProductData();


