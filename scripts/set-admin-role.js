/**
 * 🔥 관리자 Role 설정 스크립트
 * 
 * 사용법:
 * node scripts/set-admin-role.js <uid> [role]
 * 
 * 예시:
 * node scripts/set-admin-role.js 6ie7FcdHPvaYc2DxXMeZEz1VIwx1 ADMIN
 */

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function setAdminRole(uid, role = "ADMIN") {
  try {
    const userRef = db.doc(`users/${uid}`);
    
    // 기존 문서 확인
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`❌ 사용자 문서가 없습니다: ${uid}`);
      console.log("💡 먼저 사용자 문서를 생성해주세요.");
      process.exit(1);
    }

    // role 필드 업데이트
    await userRef.update({
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ 관리자 권한 부여 완료!`);
    console.log(`   UID: ${uid}`);
    console.log(`   Role: ${role}`);
    console.log(`\n💡 이제 Firestore Rules에서 isGlobalAdmin()이 true를 반환합니다.`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

// 명령줄 인자 확인
const uid = process.argv[2];
const role = process.argv[3] || "ADMIN";

if (!uid) {
  console.error("❌ 사용법: node scripts/set-admin-role.js <uid> [role]");
  console.error("   예시: node scripts/set-admin-role.js 6ie7FcdHPvaYc2DxXMeZEz1VIwx1 ADMIN");
  process.exit(1);
}

setAdminRole(uid, role);
