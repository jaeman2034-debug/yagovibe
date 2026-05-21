import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

/** FCM 등록 무효로 간주하는 Admin SDK error.code 값 */
export const INVALID_FCM_REGISTRATION_ERROR_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

/**
 * `sendEachForMulticast` 등에서 감지한 무효 토큰 정리.
 * - users.{fcmTokens} 배열에서 제거
 * - users/{uid}/fcmTokens/{token} 및 token 필드 일치 문서 삭제
 * - users/{uid}/devices/* 는 삭제하지 않고 비활성화 (enabled / isActive / lastErrorAt)
 */
export async function cleanupInvalidFcmTokensForUser(
  db: Firestore,
  uid: string,
  invalidTokens: string[]
): Promise<void> {
  const unique = [...new Set(invalidTokens.filter((t) => typeof t === "string" && t.length > 0))];
  if (unique.length === 0) return;

  const userRef = db.collection("users").doc(uid);

  try {
    await userRef.set({ fcmTokens: FieldValue.arrayRemove(...unique) }, { merge: true });
  } catch (e: unknown) {
    logger.warn("[cleanupInvalidFcmTokensForUser] users.fcmTokens arrayRemove 실패", {
      uid,
      err: e instanceof Error ? e.message : String(e),
    });
  }

  const ts = FieldValue.serverTimestamp();

  for (const token of unique) {
    try {
      await userRef.collection("fcmTokens").doc(token).delete();
    } catch {
      /* 문서 없음 */
    }

    try {
      const extraSnap = await userRef.collection("fcmTokens").where("token", "==", token).limit(20).get();
      if (!extraSnap.empty) {
        const b = db.batch();
        extraSnap.docs.forEach((d) => b.delete(d.ref));
        await b.commit();
      }
    } catch (e: unknown) {
      logger.warn("[cleanupInvalidFcmTokensForUser] fcmTokens 보조 삭제 실패", {
        uid,
        err: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const devSnap = await userRef.collection("devices").where("token", "==", token).limit(25).get();
      if (devSnap.empty) continue;
      const b = db.batch();
      devSnap.docs.forEach((d) => {
        b.update(d.ref, {
          enabled: false,
          isActive: false,
          lastErrorAt: ts,
        });
      });
      await b.commit();
    } catch (e: unknown) {
      logger.warn("[cleanupInvalidFcmTokensForUser] devices 비활성화 실패", {
        uid,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }

  logger.info("[cleanupInvalidFcmTokensForUser] 무효 토큰 정리 완료", {
    uid,
    tokenCount: unique.length,
  });
}
