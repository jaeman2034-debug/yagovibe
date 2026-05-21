/**
 * 🔥 유료화 플랜 체크 헬퍼
 * 
 * Pro 플랜 전용 기능 접근 제어
 */

import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Association의 플랜 확인 및 Pro 플랜 체크
 * 
 * @throws HttpsError if plan is not "pro"
 */
export async function requireProPlan(
  db: admin.firestore.Firestore,
  associationId: string
): Promise<void> {
  const associationRef = db.doc(`associations/${associationId}`);
  const associationSnap = await associationRef.get();

  if (!associationSnap.exists) {
    throw new HttpsError("not-found", "Association을 찾을 수 없습니다.");
  }

  const association = associationSnap.data();
  if (association?.plan !== "pro") {
    throw new HttpsError(
      "permission-denied",
      "Pro 플랜 전용 기능입니다. 플랜을 업그레이드해주세요."
    );
  }
}

