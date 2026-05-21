/**
 * 테스트 사용자 Firestore 문서 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-test-user-docs.js
 */

import admin from "firebase-admin";

// 🔥 Emulator용 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const db = admin.firestore();

// 🔥 Emulator 연결
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

const USER_UID = "KU87yPtXNQjogjYRwS8xwqDeOIyA";
const USER_EMAIL = "test@test.com";
const ASSOCIATION_ID = "assoc-nowon-football";

async function createUserDocuments() {
  try {
    console.log("🌱 테스트 사용자 Firestore 문서 생성 시작...");
    console.log(`   User UID: ${USER_UID}`);
    console.log(`   Email: ${USER_EMAIL}`);
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log("");

    // 1️⃣ users/{uid} 문서 생성
    console.log("1️⃣ users/{uid} 문서 생성 중...");
    const userRef = db.doc(`users/${USER_UID}`);
    await userRef.set({
      uid: USER_UID,
      email: USER_EMAIL,
      displayName: "테스트 관리자",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log("   ✅ users/{uid} 문서 생성 완료");
    console.log("");

    // 2️⃣ associations/{associationId}/members/{uid} 문서 생성 (관리자 권한)
    console.log("2️⃣ associations/{associationId}/members/{uid} 문서 생성 중...");
    const memberRef = db.doc(`associations/${ASSOCIATION_ID}/members/${USER_UID}`);
    await memberRef.set({
      uid: USER_UID,
      email: USER_EMAIL,
      role: "admin", // 🔥 관리자 권한
      status: "active",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log("   ✅ associations/{associationId}/members/{uid} 문서 생성 완료 (role: admin)");
    console.log("");

    // 3️⃣ associations/{associationId} 문서 확인 (ownerUid 설정)
    console.log("3️⃣ associations/{associationId} 문서 확인 중...");
    const associationRef = db.doc(`associations/${ASSOCIATION_ID}`);
    const associationSnap = await associationRef.get();
    
    if (associationSnap.exists()) {
      const associationData = associationSnap.data();
      if (!associationData.ownerUid) {
        await associationRef.update({
          ownerUid: USER_UID,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log("   ✅ associations/{associationId} ownerUid 설정 완료");
      } else {
        console.log("   ℹ️ associations/{associationId} ownerUid 이미 설정됨:", associationData.ownerUid);
      }
    } else {
      console.log("   ⚠️ associations/{associationId} 문서가 없습니다. 수동으로 생성해주세요.");
    }
    console.log("");

    console.log("✅ 모든 문서 생성 완료!");
    console.log("");
    console.log("📋 생성된 문서:");
    console.log(`   - users/${USER_UID}`);
    console.log(`   - associations/${ASSOCIATION_ID}/members/${USER_UID} (role: admin)`);
    console.log("");
    console.log("🎯 이제 조 추첨을 실행할 수 있습니다!");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

createUserDocuments()
  .then(() => {
    console.log("✅ 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
