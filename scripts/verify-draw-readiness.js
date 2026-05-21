/**
 * 조 추첨 실행 가능 여부 확인 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/verify-draw-readiness.js
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
const MIN_APPROVED_TEAMS = 2;

// 날짜를 YYYY-MM-DD 문자열로 변환
function toDateString(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function verifyDrawReadiness() {
  try {
    console.log("🔍 조 추첨 실행 가능 여부 확인 시작...");
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log(`   Tournament ID: ${TOURNAMENT_ID}\n`);

    const tournamentRef = db.doc(`associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}`);
    const tournamentDoc = await tournamentRef.get();

    if (!tournamentDoc.exists) {
      console.error(`❌ 대회 문서가 존재하지 않습니다: ${TOURNAMENT_ID}`);
      process.exit(1);
    }

    const tournament = tournamentDoc.data();
    const todayStr = toDateString(new Date());

    console.log("📋 대회 정보:");
    console.log(`   - title: ${tournament?.title || "(없음)"}`);
    console.log(`   - drawExecuted: ${tournament?.drawExecuted || false}`);
    console.log(`   - reviewPeriod.endDate: ${tournament?.reviewPeriod?.endDate || "(없음)"}`);
    console.log(`   - drawDate.date: ${tournament?.drawDate?.date || "(없음)"}`);
    console.log(`   - 오늘 날짜: ${todayStr}\n`);

    // 1️⃣ 이미 추첨되었는지 확인
    if (tournament?.drawExecuted === true) {
      console.log("⚠️  이미 조 추첨이 완료되었습니다.");
      process.exit(0);
    }

    // 2️⃣ 검수 기간 종료 체크
    let reviewPeriodPassed = false;
    if (tournament?.reviewPeriod?.endDate) {
      const reviewEndDateStr = toDateString(tournament.reviewPeriod.endDate);
      reviewPeriodPassed = reviewEndDateStr <= todayStr;
      console.log("1️⃣ 검수 기간 종료 체크:");
      console.log(`   - 검수 종료일: ${reviewEndDateStr}`);
      console.log(`   - 오늘: ${todayStr}`);
      console.log(`   - 결과: ${reviewPeriodPassed ? "✅ 통과" : "❌ 미통과"}`);
      
      if (!reviewPeriodPassed) {
        console.log(`\n❌ 조 추첨 불가: 검수 기간 종료일(${reviewEndDateStr}) 이후에만 추첨할 수 있습니다.`);
        console.log(`   해결 방법: 테스트 모드로 진행하거나 검수 종료일을 과거 날짜로 변경`);
        process.exit(1);
      }
    } else {
      reviewPeriodPassed = true; // 검수 기간 미설정 시 통과
      console.log("1️⃣ 검수 기간 종료 체크: ✅ 통과 (검수 기간 미설정)");
    }

    // 3️⃣ 승인된 팀 수 체크
    const teamsRef = db.collection(`associations/${ASSOCIATION_ID}/tournaments/${TOURNAMENT_ID}/teams`);
    const approvedTeamsQuery = teamsRef.where("status", "==", "approved");
    const approvedTeamsSnap = await approvedTeamsQuery.get();
    const approvedTeamsCount = approvedTeamsSnap.size;

    console.log("\n2️⃣ 승인된 팀 수 체크:");
    console.log(`   - 최소 필요 팀 수: ${MIN_APPROVED_TEAMS}팀`);
    console.log(`   - 현재 승인 팀 수: ${approvedTeamsCount}팀`);
    console.log(`   - 결과: ${approvedTeamsCount >= MIN_APPROVED_TEAMS ? "✅ 통과" : "❌ 미통과"}`);

    if (approvedTeamsCount < MIN_APPROVED_TEAMS) {
      console.log(`\n❌ 조 추첨 불가: 승인된 팀이 ${MIN_APPROVED_TEAMS}팀 이상 필요합니다. (현재: ${approvedTeamsCount}팀)`);
      process.exit(1);
    }

    console.log("\n📋 승인된 팀 목록:");
    approvedTeamsSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.teamName || doc.id} (ID: ${doc.id})`);
    });

    // 4️⃣ 최종 결과
    console.log("\n" + "=".repeat(50));
    console.log("✅ 조 추첨 실행 가능!");
    console.log("=".repeat(50));
    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 대회 관리 페이지 새로고침");
    console.log("2. '1️⃣ 조 추첨 실행' 버튼 클릭");
    console.log("3. 조 추첨 설정 (조 수, 시드팀 등) 후 실행");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

verifyDrawReadiness().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
