/**
 * 대회에 테스트 팀 4개를 생성하는 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/seed-tournament-teams.js
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

const ASSOCIATION_ID = "assoc-nowon-football";
const TOURNAMENT_ID = "REUabAwmporAi8CxC8Cq";
const ADMIN_UID = "qGq5XmuXRBsRZOqJFEOyqtZY5Hin";

// 🔥 사용자가 요청한 팀 이름
const TEAM_NAMES = [
  "노원 타이거즈",
  "중계 FC",
  "상계 유나이티드",
  "공릉 레인저스",
];

async function seedTournamentTeams() {
  try {
    console.log("🔥 대회 팀 생성 시작...");
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log(`   Tournament ID: ${TOURNAMENT_ID}`);
    console.log(`   생성할 팀 수: ${TEAM_NAMES.length}팀\n`);

    const teamsRef = db.collection(`associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}/teams`);

    // 기존 팀 확인
    const existingSnap = await teamsRef.get();
    if (existingSnap.size > 0) {
      console.log(`⚠️  이미 ${existingSnap.size}팀이 존재합니다.`);
      console.log("   기존 팀 목록:");
      existingSnap.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.teamName || doc.id} (status: ${data.status || "unknown"})`);
      });
      
      const shouldContinue = process.argv.includes("--force");
      if (!shouldContinue) {
        console.log("\n❌ 중복 생성을 방지하기 위해 중단되었습니다.");
        console.log("   강제 생성하려면: node scripts/seed-tournament-teams.js --force");
        process.exit(0);
      }
    }

    const createdTeamIds = [];

    for (let i = 0; i < TEAM_NAMES.length; i++) {
      const teamName = TEAM_NAMES[i];
      console.log(`\n📌 ${i + 1}/${TEAM_NAMES.length} 팀 생성 중: ${teamName}`);

      const teamData = {
        teamName,
        status: "approved", // 🔥 조 추첨 로직이 조회하는 필드 (필수!)
        teamCount: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: ADMIN_UID,
        isTestTeam: true, // 테스트 팀 플래그
        testGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        // 🔥 대회 참가 승인 정보도 함께 저장
        tournamentId: TOURNAMENT_ID,
        associationId: ASSOCIATION_ID,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: ADMIN_UID,
      };

      const docRef = await teamsRef.add(teamData);
      createdTeamIds.push(docRef.id);
      console.log(`   ✅ 팀 생성 완료: ${docRef.id}`);
    }

    console.log("\n🎉 팀 생성 완료!");
    console.log(`\n📋 생성된 팀 목록:`);
    TEAM_NAMES.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name} (ID: ${createdTeamIds[index]})`);
    });

    // 재확인
    const finalSnap = await teamsRef.get();
    console.log(`\n✅ 최종 확인: 총 ${finalSnap.size}팀 존재`);

    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 대회 관리 페이지 새로고침");
    console.log("2. '조 추첨 실행' 버튼 활성화 확인");
    console.log("3. 조 추첨 실행");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Firestore Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Emulator 포트가 8086인지 확인: firebase.json의 firestore.port 확인");
    console.error("3. 대회 문서가 존재하는지 확인");
    process.exit(1);
  }
}

seedTournamentTeams().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
