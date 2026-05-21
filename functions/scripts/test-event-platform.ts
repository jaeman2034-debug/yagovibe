/**
 * 🔥 Event Platform 데이터 흐름 테스트 스크립트
 * 
 * 사용법:
 *   cd functions
 *   npm run test:event-platform
 * 
 * 또는:
 *   npx tsx scripts/test-event-platform.ts
 */

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

const TEST_EVENT_ID = "test_event_" + Date.now();
const TEST_DIVISION_ID = "test_division_" + Date.now();
const TEST_TEAM_A = "test_team_a";
const TEST_TEAM_B = "test_team_b";
const TEST_USER = "test_user_123";

async function testEventPlatform() {
  console.log("🔥 Event Platform 데이터 흐름 테스트 시작\n");

  try {
    // 1️⃣ Event 생성
    console.log("1️⃣ Event 생성 중...");
    const eventRef = db.collection("events").doc(TEST_EVENT_ID);
    await eventRef.set({
      name: "2026 노원구 협회장기 테스트",
      type: "tournament",
      sportType: "football",
      regionCode: "KR_SEOUL_NOWON",
      seasonId: "2026",
      organizerName: "노원구축구협회",
      sponsorName: null,
      startDate: admin.firestore.Timestamp.fromDate(new Date("2026-05-01")),
      endDate: admin.firestore.Timestamp.fromDate(new Date("2026-05-10")),
      status: "scheduled",
      isPublic: true,
      description: "테스트 이벤트",
      createdBy: TEST_USER,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Event 생성 완료:", TEST_EVENT_ID);

    // Division 자동 생성 대기 (Cloud Function 실행 시간)
    console.log("\n⏳ Division 자동 생성 대기 중... (5초)");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Division 확인
    const divisionsSnap = await db
      .collection("event_divisions")
      .where("eventId", "==", TEST_EVENT_ID)
      .get();

    if (divisionsSnap.empty) {
      console.warn("⚠️ Division이 자동 생성되지 않았습니다. 수동으로 생성합니다.");
      const divisionRef = db.collection("event_divisions").doc(TEST_DIVISION_ID);
      await divisionRef.set({
        eventId: TEST_EVENT_ID,
        seasonId: "2026",
        name: "일반부",
        code: "GENERAL",
        gender: "male",
        ageRule: { min: 19, max: null },
        formatType: "knockout",
        status: "active",
        sortOrder: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("✅ Division 수동 생성 완료:", TEST_DIVISION_ID);
    } else {
      const division = divisionsSnap.docs[0];
      console.log("✅ Division 자동 생성 확인:", division.id);
      // TEST_DIVISION_ID 업데이트
      // TEST_DIVISION_ID = division.id; // TypeScript에서는 불가능하므로 다음 단계에서 사용
    }

    // 2️⃣ Entry 생성 및 승인
    console.log("\n2️⃣ Event Entry 생성 및 승인 중...");

    // Entry A 생성
    const entryARef = db.collection("event_entries").doc();
    await entryARef.set({
      eventId: TEST_EVENT_ID,
      divisionId: divisionsSnap.empty ? TEST_DIVISION_ID : divisionsSnap.docs[0].id,
      teamId: TEST_TEAM_A,
      teamName: "야고FC",
      seasonId: "2026",
      applicationStatus: "pending",
      message: "참가 신청합니다",
      appliedBy: TEST_USER,
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Entry A 생성 완료:", entryARef.id);

    // Entry A 승인
    await entryARef.update({
      applicationStatus: "approved",
      approvedBy: "admin_user",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Entry A 승인 완료");

    // Entry B 생성 및 승인
    const entryBRef = db.collection("event_entries").doc();
    await entryBRef.set({
      eventId: TEST_EVENT_ID,
      divisionId: divisionsSnap.empty ? TEST_DIVISION_ID : divisionsSnap.docs[0].id,
      teamId: TEST_TEAM_B,
      teamName: "노원FC",
      seasonId: "2026",
      applicationStatus: "approved",
      appliedBy: TEST_USER,
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: "admin_user",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Entry B 생성 및 승인 완료:", entryBRef.id);

    // Summary 생성 대기
    console.log("\n⏳ Summary 자동 생성 대기 중... (3초)");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Summary 확인
    const summariesSnap = await db
      .collection("team_event_summaries")
      .where("eventId", "==", TEST_EVENT_ID)
      .get();

    console.log("✅ 생성된 Summaries:", summariesSnap.size, "개");
    summariesSnap.docs.forEach(doc => {
      console.log("  -", doc.id, doc.data().teamId);
    });

    // 3️⃣ Match 생성
    console.log("\n3️⃣ Event Match 생성 중...");
    const matchRef = db.collection("event_matches").doc();
    await matchRef.set({
      eventId: TEST_EVENT_ID,
      divisionId: divisionsSnap.empty ? TEST_DIVISION_ID : divisionsSnap.docs[0].id,
      seasonId: "2026",
      homeTeamId: TEST_TEAM_A,
      homeTeamName: "야고FC",
      awayTeamId: TEST_TEAM_B,
      awayTeamName: "노원FC",
      scheduledAt: admin.firestore.Timestamp.fromDate(new Date("2026-05-05T14:00:00Z")),
      venueName: "노원구민체육센터",
      venueAddress: "서울시 노원구",
      roundCode: "R16",
      roundName: "16강",
      stageType: "knockout",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
      createdBy: TEST_USER,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Match 생성 완료:", matchRef.id);

    // 4️⃣ Match 완료 (핵심)
    console.log("\n4️⃣ Match 완료 처리 중...");
    await matchRef.update({
      status: "completed",
      homeScore: 2,
      awayScore: 1,
      winnerTeamId: TEST_TEAM_A,
      recordedBy: "admin_user",
      recordedAt: admin.firestore.FieldValue.serverTimestamp(),
      playedAt: admin.firestore.Timestamp.fromDate(new Date("2026-05-05T14:00:00Z")),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ Match 완료 처리 완료");

    // Cloud Function 실행 대기
    console.log("\n⏳ Cloud Function 실행 대기 중... (10초)");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 5️⃣ 결과 확인
    console.log("\n5️⃣ 결과 확인 중...\n");

    // team_games 확인
    const teamGamesSnap = await db
      .collection("team_games")
      .where("sourceType", "==", "event")
      .where("sourceId", "==", matchRef.id)
      .get();

    console.log("✅ 생성된 team_games:", teamGamesSnap.size, "개");
    teamGamesSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log("  -", doc.id, {
        teamId: data.homeTeamId === TEST_TEAM_A ? TEST_TEAM_A : TEST_TEAM_B,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        status: data.status,
      });
    });

    // teams.stats 확인
    const teamADoc = await db.doc(`teams/${TEST_TEAM_A}`).get();
    const teamBDoc = await db.doc(`teams/${TEST_TEAM_B}`).get();

    if (teamADoc.exists) {
      const stats = teamADoc.data()?.stats;
      console.log("\n✅ 야고FC 통계:", stats);
    } else {
      console.log("\n⚠️ 야고FC 팀 문서가 없습니다. (테스트용 팀 생성 필요)");
    }

    if (teamBDoc.exists) {
      const stats = teamBDoc.data()?.stats;
      console.log("✅ 노원FC 통계:", stats);
    } else {
      console.log("⚠️ 노원FC 팀 문서가 없습니다. (테스트용 팀 생성 필요)");
    }

    // summaries 확인
    const updatedSummariesSnap = await db
      .collection("team_event_summaries")
      .where("eventId", "==", TEST_EVENT_ID)
      .get();

    console.log("\n✅ 업데이트된 Summaries:");
    updatedSummariesSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log("  -", data.teamId, {
        played: data.played,
        won: data.won,
        drawn: data.drawn,
        lost: data.lost,
        goalsFor: data.goalsFor,
        goalsAgainst: data.goalsAgainst,
      });
    });

    console.log("\n✅ 테스트 완료!");
    console.log("\n📋 테스트 데이터:");
    console.log("  - Event ID:", TEST_EVENT_ID);
    console.log("  - Match ID:", matchRef.id);
    console.log("\n💡 Firestore Console에서 위 ID로 데이터를 확인하세요.");

  } catch (error: any) {
    console.error("\n❌ 테스트 실패:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 실행
testEventPlatform()
  .then(() => {
    console.log("\n✅ 모든 테스트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 테스트 중 오류:", error);
    process.exit(1);
  });
