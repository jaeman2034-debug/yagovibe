/**
 * Cloud Functions 재시도·중복 실행 시 동일 푸시가 여러 번 가지 않도록 멱등 키 기록
 * — Admin SDK 전용 경로 (클라이언트 쓰기 금지 권장)
 */
import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const COLLECTION = "pushNotificationDedup";

/**
 * @returns true 이면 이번 실행에서 푸시 진행, false 이면 이미 처리됨
 */
export async function tryClaimPushDedup(
  db: Firestore,
  dedupKey: string,
  meta: Record<string, string>
): Promise<boolean> {
  const key = dedupKey.slice(0, 1400);
  const ref = db.collection(COLLECTION).doc(key);

  try {
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;
      tx.set(ref, {
        ...meta,
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!claimed) {
      logger.info("[tryClaimPushDedup] skip duplicate", { key: key.slice(0, 80) });
    }
    return claimed;
  } catch (e: unknown) {
    logger.warn("[tryClaimPushDedup] transaction failed, allowing send", {
      err: e instanceof Error ? e.message : String(e),
    });
    return true;
  }
}
