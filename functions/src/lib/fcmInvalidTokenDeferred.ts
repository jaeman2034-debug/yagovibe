/**
 * FCM 무효 토큰: 즉시 삭제 대신 “최초 관측 시각” 기록 후 3일 경과 시에만 정리
 * — 네트워크 일시 오류와 무효 토큰을 구분하기 위한 안전장치
 */
import { FieldValue } from "firebase-admin/firestore";
import type { Firestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { cleanupInvalidFcmTokensForUser } from "./cleanupInvalidFcmTokensForUser";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** FCM 토큰 문자열을 Firestore 문서 ID로 쓸 수 있게 안전한 키로 변환 */
function tokenToDocId(token: string): string {
  return Buffer.from(token, "utf8").toString("base64url");
}

/**
 * sendEachForMulticast에서 무효로 판정된 토큰에 대해 지연 삭제 적용
 */
export async function applyDeferredInvalidFcmTokenCleanup(
  db: Firestore,
  uid: string,
  invalidTokens: string[]
): Promise<void> {
  const unique = [...new Set(invalidTokens.filter((t) => typeof t === "string" && t.length > 0))];
  if (unique.length === 0) return;

  const now = Date.now();

  for (const token of unique) {
    const strikeRef = db
      .collection("users")
      .doc(uid)
      .collection("fcmTokenInvalidStrikes")
      .doc(tokenToDocId(token));

    try {
      const strikeSnap = await strikeRef.get();
      if (!strikeSnap.exists) {
        await strikeRef.set({
          tokenPreview: token.slice(-12),
          firstInvalidAt: FieldValue.serverTimestamp(),
          lastInvalidAt: FieldValue.serverTimestamp(),
        });
        logger.info("[applyDeferredInvalidFcmTokenCleanup] 무효 토큰 1차 기록(삭제 보류)", {
          uid,
        });
        continue;
      }

      const first = strikeSnap.data()?.firstInvalidAt as Timestamp | undefined;
      const firstMs = first?.toMillis?.() ?? 0;
      if (firstMs > 0 && now - firstMs >= THREE_DAYS_MS) {
        await cleanupInvalidFcmTokensForUser(db, uid, [token]);
        await strikeRef.delete().catch(() => undefined);
        logger.info("[applyDeferredInvalidFcmTokenCleanup] 3일 경과 후 토큰 제거", { uid });
      } else {
        await strikeRef.set({ lastInvalidAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    } catch (e: unknown) {
      logger.warn("[applyDeferredInvalidFcmTokenCleanup] 처리 실패", {
        uid,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
