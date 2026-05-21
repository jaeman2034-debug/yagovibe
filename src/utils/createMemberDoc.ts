/**
 * 🔥 협회 members/{uid} 문서 생성 유틸리티
 * 
 * 사용법 (브라우저 콘솔):
 * import { createMemberDoc } from "@/utils/createMemberDoc";
 * await createMemberDoc("iUZB8RjK1Ehb3uotZ6yqtpWtUQE2", "assoc-nowon-football");
 */

import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 협회 members/{uid} 문서 생성
 * @param uid 사용자 UID
 * @param associationId 협회 ID
 */
export async function createMemberDoc(
  uid: string,
  associationId: string
): Promise<boolean> {
  try {
    // 🔥 문서 ID를 명시적으로 uid로 지정 (경로: members/{uid})
    const memberRef = doc(db, `associations/${associationId}/members/${uid}`);
    
    console.log("🔥 [createMemberDoc] 문서 생성 시도:", {
      path: `associations/${associationId}/members/${uid}`,
      uid,
      associationId,
    });
    
    // 기존 문서 확인
    const memberDoc = await getDoc(memberRef);
    
    if (memberDoc.exists()) {
      // 기존 문서가 있으면 role만 업데이트
      await setDoc(memberRef, {
        uid, // 🔥 uid 필드도 명시적으로 설정
        role: "admin",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log("✅ [createMemberDoc] members/{uid} 문서 업데이트 완료:", { 
        documentId: uid,
        path: `associations/${associationId}/members/${uid}`,
        associationId 
      });
      return true;
    } else {
      // 새 문서 생성 (문서 ID = uid)
      await setDoc(memberRef, {
        uid, // 🔥 문서 ID와 필드 값 모두 uid로 설정
        role: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("✅ [createMemberDoc] members/{uid} 문서 생성 완료:", { 
        documentId: uid,
        path: `associations/${associationId}/members/${uid}`,
        associationId 
      });
      return true;
    }
  } catch (error: any) {
    console.error("❌ [createMemberDoc] 문서 생성 실패:", {
      uid,
      associationId,
      path: `associations/${associationId}/members/${uid}`,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error,
    });
    return false;
  }
}
