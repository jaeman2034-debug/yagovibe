/**
 * 🔥 관리자 수동 실행용 스크립트
 * Phase 1-4: 심판 Role Rules
 * 
 * 사용법:
 * - Firebase Console에서 직접 실행
 * - 또는 Admin UI에서 버튼으로 호출
 */

import * as admin from "firebase-admin";

// 🔥 Cloud Functions v2에서는 자동 초기화되므로 모듈 레벨 초기화 제거
// (배포 타임아웃 방지)

/**
 * 심판 계정에 REFEREE 역할 부여
 */
export async function setReferee(uid: string): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, {
    role: "REFEREE",
  });
  console.log("✅ REFEREE 권한 부여 완료:", uid);
}

/**
 * 관리자 계정에 ADMIN 역할 부여
 */
export async function setAdmin(uid: string): Promise<void> {
  // 🔥 Cloud Functions v2에서는 자동 초기화되지만, 안전을 위해 체크
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  await admin.auth().setCustomUserClaims(uid, {
    role: "ADMIN",
  });
  console.log("✅ ADMIN 권한 부여 완료:", uid);
}

/**
 * 역할 제거
 */
export async function removeRole(uid: string): Promise<void> {
  // 🔥 Cloud Functions v2에서는 자동 초기화되지만, 안전을 위해 체크
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  const user = await admin.auth().getUser(uid);
  const currentClaims = user.customClaims || {};
  const { role, ...restClaims } = currentClaims;
  
  await admin.auth().setCustomUserClaims(uid, restClaims);
  console.log("✅ 역할 제거 완료:", uid);
}

// 사용 예시 (스크립트 실행 시)
// setReferee("REFEREE_USER_UID");
// setAdmin("ADMIN_USER_UID");

