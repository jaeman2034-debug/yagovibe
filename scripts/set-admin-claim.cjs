/**
 * 플랫폼 관리자 일괄 반영 (한 번 실행 = Auth Custom Claims + Firestore users.role)
 *
 * - Custom Claims: admin=true, role="admin"  (앱 `platformRole` / Rules `isGlobalAdmin` 과 정렬)
 * - Firestore: users/{uid}.role = "ADMIN", uid 동기화  (저장값은 ADMIN|USER 권장)
 *
 * 사용: npm run set:admin -- <uid>
 * 키: 프로젝트 루트 serviceAccountKey.json 또는 환경변수 GOOGLE_APPLICATION_CREDENTIALS (존재하는 경로)
 */
const fs = require("fs");
const path = require("path");
function loadFirebaseAdmin() {
  try {
    return require("firebase-admin");
  } catch {
    return require(path.resolve(__dirname, "../functions/node_modules/firebase-admin"));
  }
}
const admin = loadFirebaseAdmin();
const STEP_TIMEOUT_MS = 20000;

const uid = process.argv[2];

if (!uid) {
  console.error("❌ UID 필요: npm run set:admin -- <uid>");
  process.exit(1);
}

async function run() {
  const keyFromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const keyPathDefault = path.resolve(__dirname, "../serviceAccountKey.json");
  const keyPath =
    keyFromEnv && fs.existsSync(path.resolve(keyFromEnv)) ? path.resolve(keyFromEnv) : keyPathDefault;

  if (!fs.existsSync(keyPath)) {
    console.error(`❌ 서비스 계정 키 파일이 없습니다: ${keyPath}`);
    console.error("   루트에 serviceAccountKey.json 을 두거나 GOOGLE_APPLICATION_CREDENTIALS 를 설정하세요.");
    process.exit(1);
  }

  const serviceAccount = require(keyPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const withTimeout = (promise, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} 타임아웃(${STEP_TIMEOUT_MS}ms)`)), STEP_TIMEOUT_MS)
      ),
    ]);

  const beforeUser = await withTimeout(admin.auth().getUser(uid), "사전 사용자 조회");
  console.log("[set-admin-claim] 시작", {
    projectId: admin.app().options.projectId || serviceAccount.project_id,
    uid,
    email: beforeUser.email || null,
  });

  await admin.auth().setCustomUserClaims(uid, {
    admin: true,
    role: "admin",
  });
  console.log("✅ Custom Claims: { admin: true, role: \"admin\" }");

  const db = admin.firestore();
  console.log("⏳ Firestore users.role = ADMIN (merge) …");
  await withTimeout(
    db.collection("users").doc(uid).set(
      {
        uid,
        role: "ADMIN",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    ),
    "users.role 동기화"
  );
  console.log("✅ Firestore users.role = ADMIN");

  const user = await withTimeout(admin.auth().getUser(uid), "claims 조회");
  const userDoc = await withTimeout(db.collection("users").doc(uid).get(), "users 문서 조회");
  const claims = user.customClaims || {};
  const fsRole = userDoc.exists ? userDoc.data()?.role : null;
  const tokenRole = typeof claims.role === "string" ? claims.role : null;

  console.log("[set-admin-claim] AUTH SETUP 완료", {
    uid: user.uid,
    email: user.email || null,
    tokenAdmin: claims.admin === true,
    tokenRole,
    firestoreRole: typeof fsRole === "string" ? fsRole : null,
    isPlatformAdmin:
      claims.admin === true ||
      (tokenRole && tokenRole.trim().toUpperCase() === "ADMIN") ||
      (typeof fsRole === "string" && fsRole.trim().toUpperCase() === "ADMIN"),
    rawClaims: claims,
  });

  console.log("🔥 다음: 브라우저에서 로그아웃 후 재로그인(또는 새 ID 토큰)으로 클레임 반영");

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ admin 설정 실패:", err);
  process.exit(1);
});
