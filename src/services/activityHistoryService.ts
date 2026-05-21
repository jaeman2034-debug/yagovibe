/**
 * 🔥 activityHistoryService - 활동 기록 서비스
 * 
 * 역할:
 * - 활동 기록 CRUD 작업
 * - Firestore activityHistory 컬렉션 관리
 * 
 * UX 목적:
 * - 기록 관리 기능 제공
 * - 데이터 일관성 유지
 */

import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 🔥 활동 기록 삭제
 * 
 * @param historyId 활동 기록 ID
 * @returns 삭제 성공 여부
 */
export async function deleteActivityHistory(historyId: string): Promise<boolean> {
  try {
    const historyRef = doc(db, "activityHistory", historyId);
    
    // 🔥 존재 여부 확인
    const snap = await getDoc(historyRef);
    if (!snap.exists()) {
      console.warn("⚠️ [deleteActivityHistory] 기록이 존재하지 않음:", historyId);
      return false;
    }

    // 🔥 삭제 실행
    await deleteDoc(historyRef);
    
    console.log("✅ [deleteActivityHistory] 기록 삭제 성공:", historyId);
    return true;
  } catch (error: any) {
    console.error("❌ [deleteActivityHistory] 기록 삭제 실패:", {
      historyId,
      code: error.code,
      message: error.message,
    });
    throw error;
  }
}
