/**
 * 🔥 잘못 생성된 members 문서를 올바른 경로로 수정
 * 
 * 사용법 (브라우저 콘솔):
 * import { fixMemberDoc } from "@/utils/fixMemberDoc";
 * await fixMemberDoc("iUZB8RjK1Ehb3uotZ6yqtpWtUQE2", "assoc-nowon-football");
 */

import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 잘못 생성된 members 문서를 올바른 경로로 수정
 * @param uid 사용자 UID (문서 ID로 사용)
 * @param associationId 협회 ID
 */
export async function fixMemberDoc(
  uid: string,
  associationId: string
): Promise<boolean> {
  try {
    console.log("🔥 [fixMemberDoc] 시작:", { uid, associationId });
    
    // 1. 올바른 경로의 문서 확인
    const correctRef = doc(db, `associations/${associationId}/members/${uid}`);
    const correctDoc = await getDoc(correctRef);
    
    if (correctDoc.exists()) {
      console.log("✅ [fixMemberDoc] 올바른 경로의 문서가 이미 존재합니다:", {
        documentId: uid,
        path: `associations/${associationId}/members/${uid}`,
      });
      return true;
    }
    
    // 2. 잘못된 경로의 문서 찾기 (uid 필드로 검색)
    const membersRef = collection(db, `associations/${associationId}/members`);
    const q = query(membersRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    
    let foundWrongDoc = false;
    
    // 3. 잘못된 문서가 있으면 데이터 복사 후 삭제
    querySnapshot.forEach(async (docSnap) => {
      if (docSnap.id !== uid) {
        // 문서 ID가 uid와 다르면 잘못 생성된 문서
        console.log("⚠️ [fixMemberDoc] 잘못된 경로의 문서 발견:", {
          wrongDocumentId: docSnap.id,
          correctDocumentId: uid,
        });
        
        const wrongData = docSnap.data();
        
        // 올바른 경로에 문서 생성
        await setDoc(correctRef, {
          uid,
          role: wrongData.role || "admin",
          createdAt: wrongData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        console.log("✅ [fixMemberDoc] 올바른 경로에 문서 생성 완료");
        
        // 잘못된 문서 삭제
        const wrongRef = doc(db, `associations/${associationId}/members/${docSnap.id}`);
        await deleteDoc(wrongRef);
        console.log("✅ [fixMemberDoc] 잘못된 문서 삭제 완료:", { wrongDocumentId: docSnap.id });
        
        foundWrongDoc = true;
      }
    });
    
    if (!foundWrongDoc) {
      // 잘못된 문서가 없으면 새로 생성
      await setDoc(correctRef, {
        uid,
        role: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("✅ [fixMemberDoc] 새 문서 생성 완료:", {
        documentId: uid,
        path: `associations/${associationId}/members/${uid}`,
      });
    }
    
    return true;
  } catch (error: any) {
    console.error("❌ [fixMemberDoc] 문서 수정 실패:", {
      uid,
      associationId,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error,
    });
    return false;
  }
}
