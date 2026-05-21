/**
 * 🔥 관리자 권한 설정 스크립트 (프로덕션 배포 패키지)
 * 
 * 사용법:
 * npx tsx scripts/setAdmin.ts <uid>
 * 
 * 또는 직접 실행:
 * node -r ts-node/register scripts/setAdmin.ts <uid>
 */

import * as admin from "firebase-admin";

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 사용자에게 관리자 권한 부여
 * 
 * @param uid - 사용자 UID
 */
async function setAdmin(uid: string) {
  try {
    await admin.auth().setCustomUserClaims(uid, {
      admin: true,
    });

    // 🔥 Firestore users 문서도 업데이트 (하위 호환성)
    const db = admin.firestore();
    await db.collection("users").doc(uid).set(
      {
        role: "ADMIN",
        admin: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ [setAdmin] ${uid} → ADMIN 권한 부여 완료`);
  } catch (error: any) {
    console.error(`❌ [setAdmin] 실패:`, error.message);
    throw error;
  }
}

/**
 * 사용자의 관리자 권한 제거
 * 
 * @param uid - 사용자 UID
 */
async function removeAdmin(uid: string) {
  try {
    await admin.auth().setCustomUserClaims(uid, {
      admin: false,
    });

    // 🔥 Firestore users 문서도 업데이트
    const db = admin.firestore();
    await db.collection("users").doc(uid).set(
      {
        role: "user",
        admin: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ [removeAdmin] ${uid} → ADMIN 권한 제거 완료`);
  } catch (error: any) {
    console.error(`❌ [removeAdmin] 실패:`, error.message);
    throw error;
  }
}

// 🔥 CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const uid = args[1];

  if (!command || !uid) {
    console.error("사용법:");
    console.error("  npx tsx scripts/setAdmin.ts set <uid>    # 관리자 권한 부여");
    console.error("  npx tsx scripts/setAdmin.ts remove <uid>  # 관리자 권한 제거");
    process.exit(1);
  }

  if (command === "set") {
    setAdmin(uid)
      .then(() => {
        console.log("✅ 완료");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ 실패:", error);
        process.exit(1);
      });
  } else if (command === "remove") {
    removeAdmin(uid)
      .then(() => {
        console.log("✅ 완료");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ 실패:", error);
        process.exit(1);
      });
  } else {
    console.error("❌ 알 수 없는 명령:", command);
    process.exit(1);
  }
}

export { setAdmin, removeAdmin };
