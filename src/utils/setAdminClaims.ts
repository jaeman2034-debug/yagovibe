/**
 * 🔥 협회 관리자 Custom Claims 설정 유틸리티
 * 
 * 사용법:
 * import { setAssociationAdminClaims } from "@/utils/setAdminClaims";
 * await setAssociationAdminClaims("USER_UID", "assoc-nowon-football");
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";

/**
 * 협회 관리자 Custom Claims 설정
 * @param uid 사용자 UID
 * @param associationId 협회 ID
 */
export async function setAssociationAdminClaims(
  uid: string,
  associationId: string
): Promise<boolean> {
  try {
    const functions = getFunctions();
    const setAdminFn = httpsCallable(functions, "setAssociationAdminCallable");

    console.log("🔥 [setAssociationAdminClaims] 함수 호출 시작:", { uid, associationId });

    const result = await setAdminFn({
      uid,
      associationId,
    });

    console.log("✅ Custom Claims 설정 성공:", result.data);
    toast.success("관리자 권한이 부여되었습니다. 로그아웃 후 다시 로그인해주세요.");
    
    return true;
  } catch (error: any) {
    // 🔥 Firebase Functions 에러 구조 상세 로깅
    console.error("❌ Custom Claims 설정 실패:", {
      error,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      stack: error?.stack,
    });

    // 🔥 에러 메시지 추출 (Firebase Functions 에러 구조 고려)
    let errorMessage = "알 수 없는 오류";
    
    if (error?.code) {
      // Firebase Functions 에러 코드 제거 (functions/internal -> internal)
      const cleanCode = error.code.replace("functions/", "");
      
      if (cleanCode === "internal") {
        errorMessage = error?.message || "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.";
      } else if (cleanCode === "not-found") {
        errorMessage = "사용자를 찾을 수 없습니다.";
      } else if (cleanCode === "invalid-argument") {
        errorMessage = "입력한 정보가 올바르지 않습니다.";
      } else if (cleanCode === "permission-denied") {
        errorMessage = "권한이 없습니다.";
      } else {
        errorMessage = error?.message || `오류 발생: ${cleanCode}`;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }

    toast.error(`권한 부여 실패: ${errorMessage}`);
    return false;
  }
}

/**
 * 현재 사용자의 Custom Claims 확인
 */
export async function checkCurrentUserClaims(): Promise<{
  role?: string;
  associationId?: string;
} | null> {
  try {
    const { auth } = await import("@/lib/firebase");
    const { currentUser } = auth;
    
    if (!currentUser) {
      return null;
    }

    const tokenResult = await currentUser.getIdTokenResult();
    return tokenResult.claims as { role?: string; associationId?: string };
  } catch (error) {
    console.error("Claims 확인 실패:", error);
    return null;
  }
}

