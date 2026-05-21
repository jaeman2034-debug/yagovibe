/**
 * Emulator 시작 시 자동으로 데이터를 시드하는 스크립트
 * 
 * 사용법: firebase.json의 emulators 설정에 추가
 * 또는 package.json의 scripts에 추가하여 emulator 시작 전에 실행
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// Emulator 연결 설정
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const db = admin.firestore();
const auth = admin.auth();

const ASSOCIATION_IDS = [
  "assoc-nowon-football",
  "RAd4wAbqcsjcVBGLeFiw",
];
const ADMIN_UID = "qGq5XmuXRBsRZOqJFEOyqtZY5Hin";

async function autoSeed() {
  try {
    console.log("🌱 Emulator 자동 시드 시작...\n");

    // 1. Auth 사용자 생성
    try {
      await auth.getUserByEmail("test@test.com");
      console.log("✅ Auth 사용자 이미 존재: test@test.com");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        await auth.createUser({
          uid: ADMIN_UID,
          email: "test@test.com",
          password: "test1234",
          displayName: "테스트 사용자",
          emailVerified: true,
        });
        console.log("✅ Auth 사용자 생성 완료: test@test.com");
      }
    }

    // 2. Association 문서 생성
    for (const ASSOCIATION_ID of ASSOCIATION_IDS) {
      const associationRef = db.doc(`associations/${ASSOCIATION_ID}`);
      const associationDoc = await associationRef.get();

      if (!associationDoc.exists) {
        await associationRef.set({
          id: ASSOCIATION_ID,
          name: "노원구축구협회",
          status: "active",
          ownerUid: ADMIN_UID,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Association 생성: ${ASSOCIATION_ID}`);
      }

      // 3. Member 문서 생성
      const memberRef = db.doc(`associations/${ASSOCIATION_ID}/members/${ADMIN_UID}`);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        await memberRef.set({
          role: "admin",
          status: "active",
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Member 생성: ${ASSOCIATION_ID}/members/${ADMIN_UID}`);
      }
    }

    console.log("\n🎉 자동 시드 완료!");
  } catch (error) {
    console.error("❌ 자동 시드 실패:", error.message);
  }
}

// 5초 대기 후 실행 (Emulator가 완전히 시작될 때까지)
setTimeout(() => {
  autoSeed().then(() => {
    console.log("✅ 자동 시드 스크립트 완료");
    process.exit(0);
  });
}, 5000);
