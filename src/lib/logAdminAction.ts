import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

export interface AdminAction {
  action: string;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * 관리자 활동을 Audit Log에 기록
 * @param action 행동 설명 (예: "Generate Weekly Insight", "Export CSV")
 * @param details 추가 상세 정보 (선택)
 * @param metadata 추가 메타데이터 (선택)
 */
export async function logAdminAction(
  action: string,
  details?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    const uid = user?.uid ?? "anonymous";
    const email = user?.email ?? "unknown";
    const displayName = user?.displayName ?? null;

    await addDoc(collection(db, "auditLogs"), {
      uid,
      email,
      displayName,
      action,
      details: details || null,
      metadata: metadata || null,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    });

    console.log(`📝 Audit Log 기록: ${action} by ${email}`);
  } catch (error: any) {
    console.error("❌ Audit Log 기록 오류:", error);
    // Audit Log 기록 실패해도 앱은 계속 작동하도록 에러를 무시하지 않음
    // 하지만 사용자에게는 알리지 않음 (내부 로깅)
  }
}

