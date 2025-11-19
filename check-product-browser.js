// 브라우저 콘솔에서 실행할 수 있는 코드
// 개발자 도구(F12) > Console 탭에서 실행하세요

(async function checkProductData() {
  try {
    // Firebase 모듈이 이미 로드되어 있다고 가정
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
    
    // 한 줄로도 출력
    console.log("\n📋 한 줄 버전:");
    console.log(JSON.stringify(result));
    
  } catch (error) {
    console.error("❌ 오류:", error);
  }
})();

