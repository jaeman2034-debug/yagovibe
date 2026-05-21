/**
 * 관리자 권한 데이터를 Firestore Emulator에 추가하는 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/seed-admin-permission.js
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// Firestore Emulator 연결 설정 (포트 8086)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

// Firebase Admin 초기화 (Emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const db = admin.firestore();

// 🔥 두 Association ID 모두에 데이터 추가
const ASSOCIATION_IDS = [
  "assoc-nowon-football",  // 프론트엔드 URL 기준
  "RAd4wAbqcsjcVBGLeFiw",  // 화면에 표시된 ID
];
// 🔥 실제 사용자 UID (콘솔 로그 기준)
const ADMIN_UID = "qGq5XmuXRBsRZOqJFEOyqtZY5Hin";  // 대문자 O (정확한 UID)

async function seedAdminPermission() {
  try {
    console.log("🔥 관리자 권한 데이터 추가 시작...");
    console.log(`   Association IDs: ${ASSOCIATION_IDS.join(", ")}`);
    console.log(`   Admin UID: ${ADMIN_UID}\n`);

    // 🔥 각 Association ID에 대해 데이터 추가
    for (const ASSOCIATION_ID of ASSOCIATION_IDS) {
      console.log(`\n📌 처리 중: ${ASSOCIATION_ID}`);

      // 1. Association 문서에 ownerUid 추가
      const associationRef = db.doc(`associations/${ASSOCIATION_ID}`);
      
      // 기존 문서 확인
      const associationDoc = await associationRef.get();
      if (!associationDoc.exists) {
        console.log("⚠️  Association 문서가 존재하지 않습니다. 생성합니다...");
        await associationRef.set({
          id: ASSOCIATION_ID,
          name: "노원구축구협회",
          status: "active",
          ownerUid: ADMIN_UID,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await associationRef.set(
          {
            ownerUid: ADMIN_UID,
          },
          { merge: true }
        );
      }
      console.log(`✅ ${ASSOCIATION_ID}: ownerUid 필드 추가 완료`);

      // 2. members 서브컬렉션에 admin 문서 생성
      const memberRef = db.doc(
        `associations/${ASSOCIATION_ID}/members/${ADMIN_UID}`
      );
      await memberRef.set({
        role: "admin",
        status: "active",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ ${ASSOCIATION_ID}: members/{uid} 문서 생성 완료`);
    }

    console.log("\n🎉 관리자 권한 데이터 추가 완료!");
    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 대회 등록 페이지 새로고침");
    console.log("2. 콘솔에서 [useIsAssociationOwner] isOwner: true 확인");
    console.log("3. '게시' 토글이 활성화되었는지 확인");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Firestore Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Emulator 포트가 8086인지 확인: firebase.json의 firestore.port 확인");
    process.exit(1);
  }
}

seedAdminPermission().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
