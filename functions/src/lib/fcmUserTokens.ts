/**
 * users/{uid} 기준 FCM 토큰 수집 (배열 + fcmTokens 서브컬렉션 + devices)
 * — sendPushOnNotificationCreate.handler 와 동일 소스 오브 트루스
 */
import type { Firestore } from "firebase-admin/firestore";

export async function getFcmTokensForUser(db: Firestore, userId: string): Promise<string[]> {
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return [];

  const userData = userSnap.data() || {};
  const arrayTokens = Array.isArray(userData.fcmTokens) ? (userData.fcmTokens as string[]) : [];

  let subcollectionTokens: string[] = [];
  try {
    const tokenDocs = await userRef.collection("fcmTokens").get();
    subcollectionTokens = tokenDocs.docs
      .map((doc) => {
        const t = doc.data()?.token || doc.id;
        return typeof t === "string" ? t : "";
      })
      .filter(Boolean);
  } catch {
    subcollectionTokens = [];
  }

  let deviceTokens: string[] = [];
  try {
    const devicesSnap = await userRef.collection("devices").get();
    deviceTokens = devicesSnap.docs
      .map((d) => {
        const tok = d.data()?.token;
        const enabled = d.data()?.enabled !== false;
        const active = d.data()?.isActive !== false;
        return enabled && active && typeof tok === "string" ? tok : "";
      })
      .filter(Boolean);
  } catch {
    deviceTokens = [];
  }

  return Array.from(new Set([...arrayTokens, ...subcollectionTokens, ...deviceTokens])).filter(
    Boolean
  ) as string[];
}
