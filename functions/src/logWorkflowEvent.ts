import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * 워크플로우 실행 상태를 Firestore에 기록
 * @param step 함수 이름 또는 단계 이름
 * @param status "success" | "error"
 * @param durationMs 실행 시간 (밀리초)
 * @param errorMessage 오류 메시지 (선택)
 * @param metadata 추가 메타데이터 (선택)
 */
export async function logWorkflowEvent(
  step: string,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await db.collection("workflowLogs").add({
      step,
      status,
      durationMs,
      errorMessage: errorMessage || null,
      metadata: metadata || null,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    console.error("❌ 워크플로우 로그 기록 오류:", error);
    // 로그 기록 실패해도 앱은 계속 작동하도록 에러를 무시하지 않음
  }
}

