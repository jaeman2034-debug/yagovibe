/**
 * 🔥 협회 팀원 데이터 시드 스크립트 (Emulator 전용 - 간단 버전)
 * 
 * 사용법:
 * 1. Firebase Emulator 실행 중이어야 함
 * 2. node scripts/seed-association-members-simple.js
 * 
 * 또는 UID 지정 (Windows PowerShell):
 *   $env:ADMIN_UID="실제UID"; $env:MEMBER_UID="실제UID"; node scripts/seed-association-members-simple.js
 * 
 * 목표:
 * - associations/{associationId}/members 컬렉션에 테스트 데이터 생성
 * - admin 1명, member 1명 최소 생성
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// 🔥 Firestore Emulator 연결 설정 (포트 8086)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

// Firebase Admin 초기화 (Emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const db = admin.firestore();

const ASSOCIATION_ID = "assoc-nowon-football";

/**
 * 팀원 데이터 생성
 */
async function seedMembers() {
  console.log("\n🚀 협회 팀원 데이터 시드 시작...");
  console.log(`📌 협회 ID: ${ASSOCIATION_ID}\n`);

  try {
    // 🔥 테스트 사용자 UID (실제 Auth Emulator에서 생성된 UID 사용 필요)
    // 환경 변수로 받거나 기본값 사용
    const TEST_ADMIN_UID = process.env.ADMIN_UID || "test-admin-uid-12345";
    const TEST_MEMBER_UID = process.env.MEMBER_UID || "test-member-uid-67890";

    // 📝 시드 데이터
    const members = [
      {
        uid: TEST_ADMIN_UID,
        email: "admin@nowon-football.com",
        displayName: "관리자 홍길동",
        role: "admin",
        status: "active",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        uid: TEST_MEMBER_UID,
        email: "member@nowon-football.com",
        displayName: "일반 멤버 김철수",
        role: "member",
        status: "active",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    ];

    console.log("📋 생성할 팀원 목록:");
    members.forEach((m) => {
      console.log(`  - ${m.displayName} (${m.email}) - ${m.role}`);
    });
    console.log(`\n⚠️  UID 정보:`);
    console.log(`  - Admin UID: ${TEST_ADMIN_UID}`);
    console.log(`  - Member UID: ${TEST_MEMBER_UID}`);
    console.log(`\n💡 실제 Auth Emulator의 UID를 사용하려면:`);
    console.log(`  ADMIN_UID=실제UID MEMBER_UID=실제UID node scripts/seed-association-members-simple.js\n`);

    // 🔥 members 컬렉션에 문서 생성
    for (const member of members) {
      const memberRef = db
        .collection("associations")
        .doc(ASSOCIATION_ID)
        .collection("members")
        .doc(member.uid);

      // 이미 존재하면 스킵
      const existing = await memberRef.get();
      if (existing.exists) {
        console.log(`⏭️  이미 존재: ${member.displayName} (${member.uid})`);
        continue;
      }

      // 문서 생성
      await memberRef.set({
        email: member.email,
        displayName: member.displayName,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
      });

      console.log(`✅ 생성 완료: ${member.displayName} (${member.uid})`);
    }

    // 📊 최종 확인
    const membersRef = db
      .collection("associations")
      .doc(ASSOCIATION_ID)
      .collection("members");

    const snapshot = await membersRef.get();
    const totalMembers = snapshot.size;
    const adminCount = snapshot.docs.filter(
      (d) => d.data().role === "admin"
    ).length;

    console.log("\n📊 최종 결과:");
    console.log(`  - 총 팀원: ${totalMembers}명`);
    console.log(`  - 관리자: ${adminCount}명`);
    console.log(`  - 일반 멤버: ${totalMembers - adminCount}명`);

    console.log("\n✅ 팀원 데이터 시드 완료!");
    console.log(
      `\n📍 확인 경로: Firestore Emulator UI → associations/${ASSOCIATION_ID}/members`
    );
    console.log(`   또는 브라우저: http://localhost:4001`);

    return { success: true, totalMembers, adminCount };
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
seedMembers()
  .then(() => {
    console.log("\n✨ 스크립트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 스크립트 실패:", error);
    process.exit(1);
  });
