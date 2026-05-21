// scripts/activateProTemporary.ts
// 🔥 Pro 플래그 임시 활성화 스크립트 (개발/테스트용)

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/lib/firebase";

/**
 * 팀의 블로그 플랜을 Pro로 임시 변경
 * @param teamId 팀 ID
 */
export async function activateProTemporary(teamId: string) {
  try {
    const settingsRef = doc(db, `teams/${teamId}/blog/settings`);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      throw new Error("블로그 설정이 없습니다. 먼저 블로그를 생성하세요.");
    }
    
    await updateDoc(settingsRef, {
      plan: "pro",
      updatedAt: new Date(),
    });
    
    console.log("✅ Pro 플래그 활성화 완료!");
    console.log(`팀 ID: ${teamId}`);
    console.log("이제 '다음 글 자동 생성하기' 버튼이 보입니다.");
    
    return true;
  } catch (error) {
    console.error("❌ Pro 활성화 실패:", error);
    throw error;
  }
}

// 사용 예시:
// activateProTemporary("your-team-id");

