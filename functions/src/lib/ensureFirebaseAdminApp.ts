import { getApps, initializeApp } from "firebase-admin/app";

/** 루트 엔트리에서 먼저 로드되는 모듈이 `getFirestore()` 등을 쓰기 전에 한 번만 호출 */
export function ensureFirebaseAdminApp(): void {
  if (!getApps().length) {
    initializeApp();
  }
}
