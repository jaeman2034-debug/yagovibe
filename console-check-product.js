// 브라우저 콘솔에서 실행하세요 (F12 > Console)
// 이 코드를 복사해서 콘솔에 붙여넣고 Enter를 누르세요

(async () => {
  try {
    // Firebase 모듈 import
    const { db } = await import('/src/lib/firebase.ts');
    const { collection, getDocs, limit, query } = await import('firebase/firestore');
    
    console.log("🔍 Firestore에서 실제 상품 데이터 확인 중...\n");
    
    const q = query(collection(db, "marketProducts"), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("❌ 저장된 상품 데이터가 없습니다.");
      return;
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
    
    console.log("\n📋 한 줄 버전:");
    console.log(JSON.stringify(result));
    
    // 결과를 전역 변수로도 저장 (나중에 확인 가능)
    window.lastProductData = result;
    console.log("\n💡 'window.lastProductData'로도 확인할 수 있습니다.");
    
  } catch (error) {
    console.error("❌ 오류:", error);
    console.error("상세:", error.message);
  }
})();

