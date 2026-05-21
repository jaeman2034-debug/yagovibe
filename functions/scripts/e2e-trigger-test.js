/**
 * YAGO SPORTS Cloud Functions E2E 실전 테스트
 *
 * 전제: firebase emulators:start --only functions,firestore 가 이미 실행 중
 *
 * 실행: cd functions && node scripts/e2e-trigger-test.js
 *
 * 예상 로그:
 * - onTeamCreated: 🔥 [onTeamCreated] 팀 생성 감지
 * - onEventCreated: 📅 [onEventCreated] 이벤트 생성 감지
 * - onEventAttendScore: 🎟️ [onEventAttendScore] 이벤트 업데이트 감지, ✅ 모든 참석자 점수 적립 완료
 * - onNoticeScore: 📌 [onNoticeScore] 공지 생성 감지
 */

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "yago-vibe-spt" });
}

const db = admin.firestore();
const TEAM_ID = "team_test_1";
const EVENT_ID = "event_1";
const NOTICE_ID = "notice_1";
const OWNER_UID = "user_owner";

async function main() {
  console.log("\n========== YAGO SPORTS E2E Trigger Test ==========\n");

  // STEP 2 — 팀 생성 (onTeamCreated 트리거)
  console.log("STEP 2 — 팀 생성 (teams/team_test_1)");
  await db.doc(`teams/${TEAM_ID}`).set({
    name: "Test Team",
    ownerUid: OWNER_UID,
    type: "club",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("  ✓ 예상 로그: 🔥 [onTeamCreated] 팀 생성 감지\n");

  // onTeamCreated가 채팅방을 만들려면 members가 필요
  // (ownerUid 있으면 채팅방 생성됨)
  // members 생성 (onEventAttendScore, onNoticeScore 점수 적립용)
  console.log("  — 팀 멤버 문서 생성 (user_owner, user1, user2)");
  const members = [
    { uid: OWNER_UID, role: "owner", score: 0, eventCount: 0, noticeCount: 0 },
    { uid: "user1", role: "member", score: 0, eventCount: 0, noticeCount: 0 },
    { uid: "user2", role: "member", score: 0, eventCount: 0, noticeCount: 0 },
  ];
  for (const m of members) {
    await db.doc(`teams/${TEAM_ID}/members/${m.uid}`).set({
      role: m.role,
      score: m.score,
      eventCount: m.eventCount,
      noticeCount: m.noticeCount,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log("  ✓ 멤버 3명 생성 완료\n");

  // STEP 3 — 이벤트 생성 (onEventCreated 트리거)
  console.log("STEP 3 — 이벤트 생성 (teams/.../events/event_1)");
  await db.doc(`teams/${TEAM_ID}/events/${EVENT_ID}`).set({
    title: "Test Event",
    attendees: [],
    createdBy: OWNER_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("  ✓ 예상 로그: 📅 [onEventCreated] 이벤트 생성 감지\n");

  // STEP 4 — 참석 업데이트 1차, 2차 (onEventAttendScore 트리거)
  console.log("STEP 4 — 참석 업데이트 1차 (attendees: [user1])");
  await db.doc(`teams/${TEAM_ID}/events/${EVENT_ID}`).update({
    attendees: ["user1"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("STEP 4 — 참석 업데이트 2차 (attendees: [user1, user2])");
  await db.doc(`teams/${TEAM_ID}/events/${EVENT_ID}`).update({
    attendees: ["user1", "user2"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("  ✓ 예상 로그: 🎟️ [onEventAttendScore] 이벤트 업데이트 감지");
  console.log("  ✓ 예상 로그: ✅ [onEventAttendScore] 모든 참석자 점수 적립 완료\n");

  // STEP 5 — 공지 생성 (onNoticeScore 트리거)
  console.log("STEP 5 — 공지 생성 (teams/.../notices/notice_1)");
  await db.doc(`teams/${TEAM_ID}/notices/${NOTICE_ID}`).set({
    title: "Test Notice",
    content: "Hello",
    authorId: OWNER_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("  ✓ 예상 로그: 📌 [onNoticeScore] 공지 생성 감지\n");

  console.log("========== E2E 테스트 데이터 생성 완료 ==========");
  console.log("로그 확인: http://127.0.0.1:4001/logs (Emulator UI)");
  console.log("또는 에뮬레이터 실행 터미널에서 확인\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
