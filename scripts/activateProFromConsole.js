// scripts/activateProFromConsole.js
// 🔥 브라우저 콘솔에서 바로 실행 가능한 Pro 활성화 스크립트

/**
 * 사용법:
 * 1. 블로그 관리 페이지에서 브라우저 개발자 도구 열기 (F12)
 * 2. Console 탭에서 아래 코드 복사/붙여넣기
 * 3. 팀 ID를 확인하고 실행
 */

async function activateProTemporary() {
  // 🔥 1단계: 현재 팀 ID 확인
  const url = window.location.href;
  const teamIdMatch = url.match(/team\/([^\/]+)/);
  
  if (!teamIdMatch) {
    console.error("❌ 팀 ID를 찾을 수 없습니다. URL을 확인하세요.");
    console.log("현재 URL:", url);
    return;
  }
  
  const teamId = teamIdMatch[1];
  console.log("🔍 팀 ID:", teamId);
  
  // 🔥 2단계: Firebase import (이미 로드되어 있어야 함)
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("../src/lib/firebase");
  
  try {
    const settingsRef = doc(db, `teams/${teamId}/blog/settings`);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      throw new Error("블로그 설정이 없습니다.");
    }
    
    const currentPlan = settingsSnap.data().plan;
    console.log("📊 현재 플랜:", currentPlan);
    
    if (currentPlan === "pro") {
      console.log("✅ 이미 Pro 플랜입니다!");
      return;
    }
    
    // 🔥 3단계: Pro로 변경
    await updateDoc(settingsRef, {
      plan: "pro",
      updatedAt: new Date(),
    });
    
    console.log("✅ Pro 플래그 활성화 완료!");
    console.log("🔄 페이지를 새로고침하세요 (F5)");
    
    // 자동 새로고침 (선택사항)
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error("❌ Pro 활성화 실패:", error);
  }
}

// 실행
activateProTemporary();

