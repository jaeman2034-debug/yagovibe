// functions/src/firebaseAdmin.ts
// 🔥 Firebase Admin 초기화 유틸
//
// 🎯 목적:
// - 모든 함수에서 공통으로 사용할 admin 인스턴스
// - 중복 초기화 방지 (한 번만 실행)

import * as admin from "firebase-admin";

// 🔥 Admin 초기화 (한 번만 실행)
if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };

