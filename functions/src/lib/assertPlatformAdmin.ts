import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Callable 전용: Custom Claim `admin` / `role=ADMIN` / Firestore `users.role=ADMIN`
 * ({@link refreshPlatformMetrics} 와 동일 기준)
 */
export async function assertPlatformAdmin(
  uid: string,
  token: Record<string, unknown> | undefined
): Promise<void> {
  const tokenAdmin = token?.admin === true;
  const tokenRoleRaw =
    typeof token?.role === "string" ? String(token.role).trim() : "";
  const tokenRoleAdmin =
    tokenRoleRaw.length > 0 && tokenRoleRaw.toUpperCase() === "ADMIN";

  if (tokenAdmin || tokenRoleAdmin) {
    return;
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  const roleFromFirestore = String(
    userSnap.exists ? (userSnap.data() as Record<string, unknown>)?.role || "" : ""
  ).trim();
  const roleUpper = roleFromFirestore.toUpperCase();

  if (roleUpper === "ADMIN") {
    return;
  }

  throw new HttpsError(
    "permission-denied",
    "플랫폼 관리자만 이 작업을 수행할 수 있습니다."
  );
}
