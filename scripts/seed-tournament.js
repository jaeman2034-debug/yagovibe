/**
 * Firestore Emulator에 테스트 토너먼트 문서를 생성하는 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/seed-tournament.js
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
const ADMIN_UID = "qGq5XmuXRBsRZOqJFEOyqtZY5Hin";

async function seedTournament() {
  try {
    console.log("🔥 토너먼트 문서 생성 시작...");
    console.log(`   Association ID: ${ASSOCIATION_ID}`);
    console.log(`   Admin UID: ${ADMIN_UID}\n`);

    // 날짜 설정 (현재 날짜 기준)
    const now = new Date();
    const tournamentStart = new Date(now);
    tournamentStart.setMonth(tournamentStart.getMonth() + 1); // 1개월 후
    const tournamentEnd = new Date(tournamentStart);
    tournamentEnd.setDate(tournamentEnd.getDate() + 2); // 3일간

    const registrationStart = new Date(now);
    registrationStart.setDate(registrationStart.getDate() + 1); // 내일부터
    const registrationEnd = new Date(registrationStart);
    registrationEnd.setDate(registrationEnd.getDate() + 7); // 7일간

    const rosterEditStart = new Date(registrationEnd);
    rosterEditStart.setDate(rosterEditStart.getDate() + 1);
    const rosterEditEnd = new Date(rosterEditStart);
    rosterEditEnd.setDate(rosterEditEnd.getDate() + 3);

    const reviewStart = new Date(rosterEditEnd);
    reviewStart.setDate(reviewStart.getDate() + 1);
    const reviewEnd = new Date(reviewStart);
    reviewEnd.setDate(reviewEnd.getDate() + 3);

    const drawDate = new Date(reviewEnd);
    drawDate.setDate(drawDate.getDate() + 1); // 검수 종료일 다음날

    // 날짜를 YYYY-MM-DD 형식으로 변환
    const toDateString = (date) => {
      return date.toISOString().split('T')[0];
    };

    const tournamentData = {
      title: "야고 바이브 스포츠 친선 축구대회",
      content: "야고 바이브 스포츠에서 주최하는 친선 축구대회입니다.\n노원구 지역 동호인 팀간 경기입니다.",
      venue: "노원구 종합운동장",
      dateStart: admin.firestore.Timestamp.fromDate(tournamentStart),
      dateEnd: admin.firestore.Timestamp.fromDate(tournamentEnd),
      status: "upcoming",
      adminStatus: "published", // 🔥 published 상태로 생성 (Rules 테스트용)
      registrationOpen: true,
      feeAmount: 50000,
      bracketStatus: "preparing",
      isOfficial: true,
      visibility: "public",
      isPinned: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: ADMIN_UID,
      updatedBy: ADMIN_UID,
      // 기간 정보
      registrationPeriod: {
        startDate: toDateString(registrationStart),
        endDate: toDateString(registrationEnd),
      },
      rosterEditPeriod: {
        startDate: toDateString(rosterEditStart),
        endDate: toDateString(rosterEditEnd),
      },
      reviewPeriod: {
        startDate: toDateString(reviewStart),
        endDate: toDateString(reviewEnd),
      },
      drawDate: {
        date: toDateString(drawDate),
        isPublic: true,
      },
      tournamentType: "OPEN", // 연령 제한 없음
      ageRule: null,
    };

    // 토너먼트 문서 생성
    const tournamentRef = db.collection(`associations/${ASSOCIATION_ID}/tournaments`);
    const docRef = await tournamentRef.add(tournamentData);

    console.log(`✅ 토너먼트 문서 생성 완료!`);
    console.log(`   문서 ID: ${docRef.id}`);
    console.log(`   경로: associations/${ASSOCIATION_ID}/tournaments/${docRef.id}`);
    console.log(`\n📋 생성된 대회 정보:`);
    console.log(`   제목: ${tournamentData.title}`);
    console.log(`   상태: ${tournamentData.adminStatus}`);
    console.log(`   대회 기간: ${toDateString(tournamentStart)} ~ ${toDateString(tournamentEnd)}`);
    console.log(`   신청 기간: ${toDateString(registrationStart)} ~ ${toDateString(registrationEnd)}`);
    console.log(`   추첨일: ${toDateString(drawDate)}`);

    console.log("\n🎉 토너먼트 문서 생성 완료!");
    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 대회 목록 페이지 새로고침");
    console.log("2. 생성된 대회가 표시되는지 확인");
    console.log("3. Firestore Emulator UI에서 문서 확인");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Firestore Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Emulator 포트가 8086인지 확인: firebase.json의 firestore.port 확인");
    console.error("3. Association 문서가 존재하는지 확인: node scripts/seed-admin-permission.js 실행");
    process.exit(1);
  }
}

seedTournament().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
