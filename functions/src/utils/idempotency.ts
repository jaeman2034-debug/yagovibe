/**
 * 🔥 멱등성(Idempotency) 헬퍼
 * 
 * 트리거 중복 실행 방지
 */

import { admin as firebaseAdmin } from "../firebaseAdmin";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";

const db = firebaseAdmin.firestore();

/**
 * 한 번만 실행되는 함수 래퍼
 * 
 * @param key - 고유 키 (예: `approved_${postId}_${userId}`)
 * @param fn - 실행할 함수
 * @returns 이미 실행됨: false, 실행 완료: true
 */
export async function once(
  key: string,
  fn: () => Promise<void>
): Promise<boolean> {
  const ref = db.collection("_idempotency").doc(key);

  try {
    // 🔥 이미 처리되었는지 확인
    const snap = await ref.get();
    if (snap.exists) {
      logger.info("[once] 이미 처리됨 (중복 방지):", { key });
      return false; // 이미 처리됨
    }

    // 🔥 함수 실행
    await fn();

    // 🔥 완료 표시
    await ref.set({
      done: true,
      at: Date.now(),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("[once] 처리 완료:", { key });
    return true; // 실행 완료
  } catch (error: any) {
    logger.error("[once] 처리 실패:", {
      key,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 멱등성 키 생성 헬퍼
 */
export function buildIdempotencyKey(
  type: string,
  ...parts: (string | number)[]
): string {
  return `${type}_${parts.join("_")}`;
}
