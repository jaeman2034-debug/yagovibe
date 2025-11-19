import { linkWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * 게스트 계정을 정식 계정으로 승격
 * @param email 이메일 주소
 * @param password 비밀번호
 * @returns 승격된 사용자 정보 또는 null
 */
export async function upgradeGuestAccount(email: string, password: string) {
  // 현재 인증된 사용자가 있는지 확인
  if (!auth.currentUser) {
    console.warn("⚠️ 현재 로그인된 사용자가 없습니다.");
    return null;
  }

  // 게스트 계정이 아닌 경우 처리할 필요 없음
  if (!auth.currentUser.isAnonymous) {
    console.warn("⚠️ 이미 정식 계정입니다.");
    return auth.currentUser;
  }

  try {
    console.log("🎯 게스트 계정 승격 시도 중...");
    
    // 이메일/비밀번호로 credential 생성
    const credential = EmailAuthProvider.credential(email, password);

    // 게스트 계정에 이메일/비밀번호 연결
    const userCred = await linkWithCredential(auth.currentUser, credential);

    console.log("✅ 게스트 → 정식 계정 승격 성공:", userCred.user.uid);
    console.log("📧 이메일:", userCred.user.email);
    
    return userCred.user;
  } catch (error: any) {
    console.error("❌ 승격 실패:", error.code, error.message);
    
    // 이메일이 이미 사용 중인 경우
    if (error.code === "auth/email-already-in-use") {
      throw new Error("이미 사용 중인 이메일입니다.");
    }
    
    throw error;
  }
}

