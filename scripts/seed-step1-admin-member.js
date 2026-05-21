/**
 * 🔥 STEP 1: 팀원 관리 구조 생성 스크립트 (Emulator 전용)
 * 
 * 목표:
 * - associations/{associationId}/members/{ownerUid} 생성
 * - role: "admin", status: "active"
 * 
 * 사용법:
 *   node scripts/seed-step1-admin-member.js
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// 🔥 Firestore Emulator 연결 설정 (포트 8086)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const db = admin.firestore();

// 🔥 STEP 1 고정값
const ASSOCIATION_ID = "RAd4wAbqcsjcVBGLeFiw";
const OWNER_UID = "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin"; // 현재 로그인한 UID

async function seedStep1AdminMember() {
  console.log("\n🚀 STEP 1: 팀원 관리 구조 생성 시작...");
  console.log(`📌 Association ID: ${ASSOCIATION_ID}`);
  console.log(`📌 Owner UID: ${OWNER_UID}\n`);

  try {
    // 1. Association 문서 존재 확인
    const associationRef = db.doc(`associations/${ASSOCIATION_ID}`);
    const associationDoc = await associationRef.get();

    if (!associationDoc.exists) {
      console.error(`❌ Association 문서가 존재하지 않습니다: ${ASSOCIATION_ID}`);
      console.error(`   먼저 associations/${ASSOCIATION_ID} 문서를 생성해주세요.`);
      process.exit(1);
    }

    console.log("✅ Association 문서 확인됨");

    // 2. Members 서브컬렉션에 admin 문서 생성
    const memberRef = db
      .collection("associations")
      .doc(ASSOCIATION_ID)
      .collection("members")
      .doc(OWNER_UID);

    // 이미 존재하는지 확인
    const existingMember = await memberRef.get();
    if (existingMember.exists) {
      console.log(`⏭️  이미 존재: members/${OWNER_UID}`);
      const existingData = existingMember.data();
      console.log(`   현재 데이터:`, {
        role: existingData.role,
        status: existingData.status,
        joinedAt: existingData.joinedAt,
      });
      
      // 업데이트
      await memberRef.set({
        role: "admin",
        status: "active",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log("✅ 데이터 업데이트 완료");
    } else {
      // 새로 생성
      await memberRef.set({
        role: "admin",
        status: "active",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Admin 멤버 문서 생성 완료: members/${OWNER_UID}`);
    }

    // 3. 최종 확인
    const finalDoc = await memberRef.get();
    const finalData = finalDoc.data();

    console.log("\n📊 최종 결과:");
    console.log(`   경로: associations/${ASSOCIATION_ID}/members/${OWNER_UID}`);
    console.log(`   role: ${finalData.role}`);
    console.log(`   status: ${finalData.status}`);
    console.log(`   joinedAt: ${finalData.joinedAt ? "설정됨" : "없음"}`);

    console.log("\n✅ STEP 1 완료!");
    console.log(`\n📍 확인 경로: Firestore Emulator UI`);
    console.log(`   → associations/${ASSOCIATION_ID}/members/${OWNER_UID}`);
    console.log(`   또는 브라우저: http://localhost:4001`);

    return { success: true };
  } catch (error) {
    console.error("\n❌ 오류 발생:", error);
    console.error("상세:", {
      code: error?.code,
      message: error?.message,
    });
    throw error;
  }
}

// 🔥 실행
seedStep1AdminMember()
  .then(() => {
    console.log("\n✨ 스크립트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 스크립트 실패:", error);
    process.exit(1);
  });
