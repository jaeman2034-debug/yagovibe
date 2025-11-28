/**
 * 🔥 Firebase Admin 중앙 집중식 초기화
 * 
 * 모든 Cloud Functions에서 이 파일을 통해 admin을 import하면
 * 초기화 순서 문제가 해결됩니다.
 */

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };

