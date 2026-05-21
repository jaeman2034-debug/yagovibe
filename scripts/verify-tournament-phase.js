/**
 * 대회의 tournamentPhase 상태 확인 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/verify-tournament-phase.js
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

async function verifyTournamentPhase() {
  try {
    console.log("🔍 대회 상태 확인 시작...");
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log(`   Tournament ID: ${TOURNAMENT_ID}\n`);

    const tournamentRef = db.doc(`associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}`);
    const tournamentDoc = await tournamentRef.get();

    if (!tournamentDoc.exists) {
      console.error(`❌ 대회 문서가 존재하지 않습니다: ${TOURNAMENT_ID}`);
      process.exit(1);
    }

    const data = tournamentDoc.data();
    console.log("📋 대회 상태:");
    console.log(`   - tournamentPhase: ${data?.tournamentPhase || "(없음)"}`);
    console.log(`   - adminStatus: ${data?.adminStatus || "(없음)"}`);
    console.log(`   - title: ${data?.title || "(없음)"}`);

    // 팀 수 확인
    const teamsRef = db.collection(`associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}/teams`);
    const teamsSnap = await teamsRef.get();
    console.log(`   - 팀 수: ${teamsSnap.size}팀`);

    if (teamsSnap.size > 0) {
      console.log("\n📋 생성된 팀 목록:");
      teamsSnap.docs.forEach((doc, index) => {
        const teamData = doc.data();
        console.log(`   ${index + 1}. ${teamData.teamName || doc.id} (status: ${teamData.status || "unknown"})`);
      });
    }

    console.log("\n✅ 확인 완료!");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

verifyTournamentPhase().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
