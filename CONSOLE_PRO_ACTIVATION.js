// 🔥 브라우저 콘솔에서 바로 실행 (복사/붙여넣기)

// 1. 블로그 관리 페이지에서 F12 → Console 탭
// 2. 아래 코드 전체 복사/붙여넣기
// 3. Enter

(async () => {
  try {
    // Firebase SDK는 이미 로드되어 있음
    const { getFirestore, doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    
    // 또는 로컬 Firebase 사용
    const firebaseModule = await import("/src/lib/firebase.ts");
    const { db } = firebaseModule;
    
    // 팀 ID 추출
    const url = window.location.href;
    const teamIdMatch = url.match(/team\/([^\/\?]+)/);
    
    if (!teamIdMatch) {
      // URL에서 못 찾으면 직접 입력
      const teamId = prompt("팀 ID를 입력하세요:");
      if (!teamId) return;
      await activatePro(teamId);
    } else {
      await activatePro(teamIdMatch[1]);
    }
    
    async function activatePro(teamId) {
      console.log("🔍 팀 ID:", teamId);
      
      const settingsRef = doc(db, `teams/${teamId}/blog/settings`);
      const settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        console.error("❌ 블로그 설정이 없습니다.");
        return;
      }
      
      const current = settingsSnap.data();
      console.log("📊 현재 플랜:", current.plan);
      
      if (current.plan === "pro") {
        console.log("✅ 이미 Pro 플랜입니다!");
        return;
      }
      
      await updateDoc(settingsRef, {
        plan: "pro",
        updatedAt: new Date(),
      });
      
      console.log("✅ Pro 활성화 완료!");
      console.log("🔄 1초 후 자동 새로고침...");
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (error) {
    console.error("❌ 오류:", error);
    console.log("💡 Firestore Console에서 직접 변경하세요:");
    console.log("   teams → {teamId} → blog → settings → plan: 'pro'");
  }
})();

