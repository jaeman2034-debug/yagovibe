// 🔍 관리자 권한 검증 스크립트 (브라우저 콘솔에서 실행)
// 복사-붙여넣기하여 실행하세요

(async () => {
  try {
    const { auth, db } = await import("/src/lib/firebase.ts");
    const { doc, getDoc } = await import("firebase/firestore");
    
    // 현재 사용자 UID
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.error("❌ 로그인되어 있지 않습니다.");
      return;
    }
    
    console.log("=== 관리자 권한 검증 시작 ===");
    console.log("사용자 UID:", uid);
    
    // 협회 ID 추출 (URL에서 또는 직접 입력)
    const pathParts = window.location.pathname.split("/");
    const associationId = pathParts[pathParts.indexOf("association") + 1] || "assoc-nowon-football";
    console.log("협회 ID:", associationId);
    
    // 방법 1: members/{uid} 문서 확인
    console.log("\n[방법 1] members 문서 확인");
    const memberRef = doc(db, `associations/${associationId}/members/${uid}`);
    const memberSnap = await getDoc(memberRef);
    
    if (memberSnap.exists()) {
      const role = memberSnap.data()?.role;
      const isMemberAdmin = role === "admin";
      console.log("✅ 문서 존재:", true);
      console.log("role:", role);
      console.log("관리자 여부:", isMemberAdmin ? "✅ YES" : "❌ NO");
    } else {
      console.log("❌ 문서 없음");
    }
    
    // 방법 2: adminUids 배열 확인
    console.log("\n[방법 2] adminUids 배열 확인");
    const assocRef = doc(db, `associations/${associationId}`);
    const assocSnap = await getDoc(assocRef);
    
    if (assocSnap.exists()) {
      const data = assocSnap.data();
      const adminUids = data?.adminUids;
      const isArray = Array.isArray(adminUids);
      const includesUid = isArray && adminUids.includes(uid);
      
      console.log("✅ 문서 존재:", true);
      console.log("adminUids 타입:", typeof adminUids);
      console.log("배열 여부:", isArray ? "✅ YES" : "❌ NO");
      if (isArray) {
        console.log("adminUids 값:", adminUids);
        console.log("UID 포함 여부:", includesUid ? "✅ YES" : "❌ NO");
      } else {
        console.log("adminUids 값:", adminUids);
      }
      
      // 최종 판정
      const isAdmin = (memberSnap.exists() && memberSnap.data()?.role === "admin") || includesUid;
      
      console.log("\n=== 최종 판정 ===");
      console.log("관리자 여부:", isAdmin ? "✅ 관리자" : "❌ 비관리자");
      
      if (!isAdmin) {
        console.error("\n❌ 문제 발견!");
        console.log("\n해결 방법:");
        if (!memberSnap.exists()) {
          console.log("1. Firestore Console에서 다음 경로에 문서 생성:");
          console.log(`   associations/${associationId}/members/${uid}`);
          console.log("   필드: role = 'admin' (string)");
        }
        if (!isArray) {
          console.log("2. Firestore Console에서 adminUids 필드를 배열로 변경:");
          console.log(`   associations/${associationId}`);
          console.log("   adminUids 필드 타입: array");
          console.log(`   값: ["${uid}", ...]`);
        }
        if (isArray && !includesUid) {
          console.log("3. Firestore Console에서 adminUids 배열에 UID 추가:");
          console.log(`   associations/${associationId}`);
          console.log(`   adminUids 배열에 "${uid}" 추가`);
        }
      } else {
        console.log("\n✅ 관리자로 판정됨!");
        console.log("하드 리프레시 후 버튼이 활성화되어야 합니다.");
      }
    } else {
      console.error("❌ 협회 문서가 존재하지 않음:", associationId);
    }
  } catch (error) {
    console.error("❌ 검증 스크립트 오류:", error);
    console.error("에러 메시지:", error.message);
  }
})();
