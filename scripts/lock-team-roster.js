/**
 * 팀원 명단 잠금 (ROSTER_LOCKED로 변경) 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/lock-team-roster.js
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

async function lockTeamRoster() {
  try {
    console.log("🔒 팀원 명단 잠금 시작...");
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log(`   Tournament ID: ${TOURNAMENT_ID}\n`);

    const tournamentRef = db.doc(`associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}`);
    const tournamentDoc = await tournamentRef.get();

    if (!tournamentDoc.exists) {
      console.error(`❌ 대회 문서가 존재하지 않습니다: ${TOURNAMENT_ID}`);
      process.exit(1);
    }

    const currentPhase = tournamentDoc.data()?.tournamentPhase;
    console.log(`📋 현재 Phase: ${currentPhase || "(없음)"}`);

    if (currentPhase === "ROSTER_LOCKED") {
      console.log("✅ 이미 팀원 명단이 잠금 상태입니다.");
      process.exit(0);
    }

    // ROSTER_LOCKED로 변경
    await tournamentRef.update({
      tournamentPhase: "ROSTER_LOCKED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ 팀원 명단 잠금 완료!");
    console.log(`   변경 전: ${currentPhase || "(없음)"}`);
    console.log(`   변경 후: ROSTER_LOCKED`);

    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 대회 관리 페이지 새로고침");
    console.log("2. '1️⃣ 조 추첨 실행' 버튼 활성화 확인");
    console.log("3. 조 추첨 실행");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

lockTeamRoster().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
