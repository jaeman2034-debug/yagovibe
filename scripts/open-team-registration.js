/**
 * 대회의 팀원 등록 상태를 ROSTER_OPEN으로 설정하는 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/open-team-registration.js
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

async function openTeamRegistration() {
  try {
    console.log("🔥 팀원 등록 상태 오픈 시작...");
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log(`   Tournament ID: ${TOURNAMENT_ID}\n`);

    const tournamentRef = db.doc(`associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}`);
    const tournamentDoc = await tournamentRef.get();

    if (!tournamentDoc.exists) {
      console.error(`❌ 대회 문서가 존재하지 않습니다: ${TOURNAMENT_ID}`);
      process.exit(1);
    }

    const currentData = tournamentDoc.data();
    console.log("📋 현재 대회 상태:");
    console.log(`   - tournamentPhase: ${currentData?.tournamentPhase || "(없음)"}`);
    console.log(`   - adminStatus: ${currentData?.adminStatus || "(없음)"}`);

    // tournamentPhase를 ROSTER_OPEN으로 설정
    await tournamentRef.update({
      tournamentPhase: "ROSTER_OPEN",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("\n✅ 팀원 등록 상태 오픈 완료!");
    console.log(`   tournamentPhase: "ROSTER_OPEN"으로 설정됨`);

    // 재확인
    const updatedDoc = await tournamentRef.get();
    const updatedData = updatedDoc.data();
    console.log("\n📋 업데이트된 대회 상태:");
    console.log(`   - tournamentPhase: ${updatedData?.tournamentPhase}`);
    console.log(`   - adminStatus: ${updatedData?.adminStatus}`);

    console.log("\n🎉 완료!");
    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 대회 관리 페이지 새로고침");
    console.log("2. '팀원 등록 진행 중' 상태 확인");
    console.log("3. 테스트 팀 생성 버튼 활성화 확인");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Firestore Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Emulator 포트가 8086인지 확인: firebase.json의 firestore.port 확인");
    console.error("3. 대회 문서 ID가 올바른지 확인");
    process.exit(1);
  }
}

openTeamRegistration().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
