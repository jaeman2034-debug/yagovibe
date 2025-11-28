// src/lib/session.ts
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

/**
 * 세션 초기화 함수
 * Firebase 로그아웃 + localStorage/sessionStorage 정리
 */
export async function resetSession() {
  try {
    // 1) Firebase 로그아웃
    console.log("🔥 [session.ts] Firebase 로그아웃 시작...");
    await signOut(auth);
    console.log("✅ [session.ts] Firebase 로그아웃 완료");

    // 2) localStorage / sessionStorage 정리
    try {
      // Firebase 관련 저장 데이터 정리
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes("firebase") ||
          key.includes("auth") ||
          key.includes("session")
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ [session.ts] localStorage에서 제거: ${key}`);
      });

      // sessionStorage 완전 정리
      sessionStorage.clear();
      console.log("✅ [session.ts] sessionStorage 정리 완료");

      // 완전 초기화를 원하면 아래 주석 해제
      // localStorage.clear();
    } catch (e) {
      console.warn("⚠️ [session.ts] Storage clear error:", e);
    }

    // 3) Capacitor 환경이라면, 앱 전체 리로드 (웹뷰 새로고침)
    // 일반 브라우저에서는 페이지 이동만 수행
    console.log("🔄 [session.ts] 로그인 페이지로 이동...");
    window.location.href = "/login";
  } catch (error) {
    console.error("❌ [session.ts] 세션 초기화 실패:", error);
    throw error;
  }
}

