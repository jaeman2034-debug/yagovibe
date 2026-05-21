/**
 * 팀 대표 테스트 계정 생성 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/seed-team-leader.js
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// Firebase Emulator 연결 설정
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

// Firebase Admin 초기화 (Emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const auth = admin.auth();
const db = admin.firestore();

const ASSOCIATION_ID = "assoc-nowon-football";
const TOURNAMENT_ID = "REUabAwmporAi8CxC8Cq";

// 🔥 팀 대표 테스트 계정 정보
const TEAM_LEADER = {
  email: "teamleader@test.com",
  password: "test1234",
  displayName: "팀 대표 (테스트)",
  uid: "TEAM_LEADER_UID_12345", // 고정 UID
};

// 🔥 첫 번째 팀에 대표 연결 (노원 타이거즈)
const TARGET_TEAM_ID = "qu0g2xTFDmsktP7gx2K5"; // 노원 타이거즈

async function seedTeamLeader() {
  try {
    console.log("🔥 팀 대표 테스트 계정 생성 시작...");
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log(`   Tournament ID: ${TOURNAMENT_ID}`);
    console.log(`   Target Team ID: ${TARGET_TEAM_ID}\n`);

    // 1️⃣ Auth Emulator에 사용자 생성/업데이트
    console.log("1️⃣ Auth 사용자 생성/업데이트 중...");
    try {
      await auth.getUser(TEAM_LEADER.uid);
      // 이미 존재하면 업데이트
      await auth.updateUser(TEAM_LEADER.uid, {
        email: TEAM_LEADER.email,
        displayName: TEAM_LEADER.displayName,
        password: TEAM_LEADER.password,
      });
      console.log(`   ✅ 사용자 업데이트 완료: ${TEAM_LEADER.email}`);
    } catch (error) {
      // 존재하지 않으면 생성
      if (error.code === "auth/user-not-found") {
        await auth.createUser({
          uid: TEAM_LEADER.uid,
          email: TEAM_LEADER.email,
          displayName: TEAM_LEADER.displayName,
          password: TEAM_LEADER.password,
        });
        console.log(`   ✅ 사용자 생성 완료: ${TEAM_LEADER.email}`);
      } else {
        throw error;
      }
    }

    // 2️⃣ 팀 문서에 captainUid 설정
    console.log("\n2️⃣ 팀 문서에 captainUid 설정 중...");
    const teamRef = db.doc(
      `associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}/teams/${TARGET_TEAM_ID}`
    );
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      console.error(`❌ 팀 문서가 존재하지 않습니다: ${TARGET_TEAM_ID}`);
      process.exit(1);
    }

    const teamData = teamDoc.data();
    console.log(`   현재 팀명: ${teamData?.teamName || "(없음)"}`);

    await teamRef.update({
      captainUid: TEAM_LEADER.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✅ captainUid 설정 완료: ${TEAM_LEADER.uid}`);

    // 3️⃣ 최종 확인
    console.log("\n📋 최종 확인:");
    const finalTeamDoc = await teamRef.get();
    const finalData = finalTeamDoc.data();
    console.log(`   - 팀명: ${finalData?.teamName}`);
    console.log(`   - captainUid: ${finalData?.captainUid}`);
    console.log(`   - status: ${finalData?.status}`);

    console.log("\n✅ 팀 대표 계정 생성 완료!");
    console.log("\n📋 로그인 정보:");
    console.log(`   - 이메일: ${TEAM_LEADER.email}`);
    console.log(`   - 비밀번호: ${TEAM_LEADER.password}`);
    console.log(`   - UID: ${TEAM_LEADER.uid}`);

    console.log("\n🌐 접속 경로:");
    console.log(`   http://localhost:5173/teams/${TARGET_TEAM_ID}/manage?associationId=${ASSOCIATION_ID}&tournamentId=${TOURNAMENT_ID}`);

    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 로그아웃 (관리자 계정)");
    console.log(`2. ${TEAM_LEADER.email}로 로그인`);
    console.log("3. 위 접속 경로로 이동");
    console.log("4. 선수 등록 시작 (11~25명)");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Firestore Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Auth Emulator가 실행 중인지 확인 (포트 9099)");
    console.error("3. 팀 문서가 존재하는지 확인");
    process.exit(1);
  }
}

seedTeamLeader().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
