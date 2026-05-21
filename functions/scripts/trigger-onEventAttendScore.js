/**
 * Firestore Emulator에서 onEventAttendScore 트리거 런타임 테스트
 *
 * 전제: firebase emulators:start --only functions,firestore 가 이미 실행 중
 *
 * 실행: cd functions && node scripts/trigger-onEventAttendScore.js
 */

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "yago-vibe-spt" });
}

const db = admin.firestore();

const TEAM_ID = "team_test_1";
const EVENT_ID = "event_1";

async function main() {
  console.log("1) 팀 문서 생성/유지...");
  await db.doc(`teams/${TEAM_ID}`).set({ name: "Test Team", type: "club" }, { merge: true });

  console.log("2) 이벤트 문서 생성 (attendees: [])...");
  await db.doc(`teams/${TEAM_ID}/events/${EVENT_ID}`).set({
    attendees: [],
    title: "Test Event",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("3) 1차 수정 (attendees: [\"user1\"])...");
  await db.doc(`teams/${TEAM_ID}/events/${EVENT_ID}`).update({
    attendees: ["user1"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("4) 2차 수정 (attendees: [\"user1\", \"user2\"]) → onEventAttendScore 트리거 예상...");
  await db.doc(`teams/${TEAM_ID}/events/${EVENT_ID}`).update({
    attendees: ["user1", "user2"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("완료. Functions 로그에서 [onEventAttendScore] 이벤트 업데이트 감지 를 확인하세요.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
