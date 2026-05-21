/**
 * Firestore Emulator에서 협회 데이터 확인 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/verify-association-data.js
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

// 확인할 Association IDs
const ASSOCIATION_IDS = [
  "assoc-nowon-football",
  "RAd4wAbqcsjcVBGLeFiw",
];

const ADMIN_UID = "qGq5XmuXRBsRZOqJFEOyqtZY5Hin";

async function verifyAssociationData() {
  try {
    console.log("🔍 Firestore Emulator 데이터 확인 시작...");
    console.log(`   Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}\n`);

    for (const ASSOCIATION_ID of ASSOCIATION_IDS) {
      console.log(`\n📌 확인 중: ${ASSOCIATION_ID}`);

      // 1. Association 문서 확인
      const associationRef = db.doc(`associations/${ASSOCIATION_ID}`);
      const associationDoc = await associationRef.get();

      if (!associationDoc.exists) {
        console.log(`❌ Association 문서가 존재하지 않습니다: associations/${ASSOCIATION_ID}`);
        console.log(`   → 해결: scripts/seed-admin-permission.js 실행 필요`);
      } else {
        const associationData = associationDoc.data();
        console.log(`✅ Association 문서 존재:`);
        console.log(`   - name: ${associationData?.name || "(없음)"}`);
        console.log(`   - ownerUid: ${associationData?.ownerUid || "(없음)"}`);
        console.log(`   - status: ${associationData?.status || "(없음)"}`);
        
        // ownerUid 확인
        if (associationData?.ownerUid === ADMIN_UID) {
          console.log(`   ✅ ownerUid 일치: ${ADMIN_UID}`);
        } else {
          console.log(`   ⚠️  ownerUid 불일치:`);
          console.log(`      - 기대: ${ADMIN_UID}`);
          console.log(`      - 실제: ${associationData?.ownerUid || "(없음)"}`);
        }
      }

      // 2. Members 서브컬렉션 확인
      const memberRef = db.doc(`associations/${ASSOCIATION_ID}/members/${ADMIN_UID}`);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        console.log(`❌ Member 문서가 존재하지 않습니다: associations/${ASSOCIATION_ID}/members/${ADMIN_UID}`);
        console.log(`   → 해결: scripts/seed-admin-permission.js 실행 필요`);
      } else {
        const memberData = memberDoc.data();
        console.log(`✅ Member 문서 존재:`);
        console.log(`   - role: ${memberData?.role || "(없음)"}`);
        console.log(`   - status: ${memberData?.status || "(없음)"}`);
        
        if (memberData?.role === "admin" || memberData?.role === "owner") {
          console.log(`   ✅ role이 admin 또는 owner입니다`);
        } else {
          console.log(`   ⚠️  role이 admin/owner가 아닙니다: ${memberData?.role}`);
        }
      }
    }

    console.log("\n📋 요약:");
    console.log("   - Association 문서가 없으면: scripts/seed-admin-permission.js 실행");
    console.log("   - Member 문서가 없으면: scripts/seed-admin-permission.js 실행");
    console.log("   - ownerUid가 불일치하면: scripts/seed-admin-permission.js 실행");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Firestore Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Emulator 포트가 8086인지 확인: firebase.json의 firestore.port 확인");
    process.exit(1);
  }
}

verifyAssociationData().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
