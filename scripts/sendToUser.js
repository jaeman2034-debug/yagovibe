// scripts/sendToUser.js
/**
 * 🔥 로컬 테스트용 FCM 푸시 발송 스크립트
 * 
 * 사용 방법:
 * 1. Google Cloud Console에서 서비스 계정 키(JSON) 다운로드
 * 2. 이 파일과 같은 디렉토리에 serviceAccountKey.json 배치
 * 3. npm install firebase-admin
 * 4. TEST_UID를 실제 사용자 UID로 변경
 * 5. node scripts/sendToUser.js
 */

const admin = require("firebase-admin");
const path = require("path");

// 서비스 계정 키 파일 경로
const serviceAccount = require(path.join(__dirname, "..", "serviceAccountKey.json"));

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * 특정 uid에게 푸시 알림 보내기
 * - users/{uid}/devices 컬렉션에서 모든 FCM 토큰 읽어와서 발송
 */
async function sendNotificationToUser(uid, payload) {
  const devicesRef = db.collection(`users/${uid}/devices`);
  const snapshot = await devicesRef.get();

  if (snapshot.empty) {
    console.log("❌ 이 유저에 대한 등록된 디바이스 없음:", uid);
    return;
  }

  const tokens = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.token) {
      tokens.push(data.token);
    }
  });

  console.log("📲 발송 대상 토큰:", tokens);

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {}, // 알림 클릭 시 사용할 route 등
  };

  const response = await admin.messaging().sendMulticast(message);
  console.log("✅ 발송 결과:", response.successCount, "성공 /", response.failureCount, "실패");

  if (response.failureCount > 0) {
    console.log("⚠ 실패 상세:", response.responses.filter(r => !r.success));
  }
}

// === 실제 호출 부분 ===
// 테스트용 uid (Firebase Auth에서 확인한 uid 값으로 교체)
const TEST_UID = "여기에_테스트_사용자_uid_입력"; // 예: "SmoeD23Kfj3kfs..."

if (TEST_UID === "여기에_테스트_사용자_uid_입력") {
  console.error("❌ TEST_UID를 실제 사용자 UID로 변경해주세요!");
  console.log("📋 Firebase Console > Authentication > Users에서 UID 확인");
  process.exit(1);
}

sendNotificationToUser(TEST_UID, {
  title: "YAGO VIBE 테스트 알림",
  body: "지금 클릭하면 시설 상세 페이지로 이동합니다.",
  data: {
    route: "/facility/123", // 알림 클릭 시 이동할 경로
  },
})
  .then(() => {
    console.log("🎉 알림 전송 시도 완료");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 알림 전송 오류:", err);
    process.exit(1);
  });

