/**
 * Firestore `matches` 테스트 문서 1건 추가
 *
 * ⚠️ DB 불일치 주의
 * - 이 프로젝트 `src/lib/firebase.ts`에는 connectFirestoreEmulator가 없음 → 웹앱은 항상 프로덕션 Firestore를 봄.
 * - FIRESTORE_EMULATOR_HOST가 잡혀 있으면 이 스크립트는 에뮬레이터에만 씀 → 화면에 안 보임.
 *
 * 프로덕션에 넣기 (권장, 앱과 같은 DB):
 *   npm run seed:match-test:production
 *   또는 PowerShell: Remove-Item Env:FIRESTORE_EMULATOR_HOST -ErrorAction SilentlyContinue; npm run seed:match-test
 *   또는 CMD: set FIRESTORE_EMULATOR_HOST= && npm run seed:match-test
 *
 * 에뮬레이터에만 넣기:
 *   $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8210"; npm run seed:match-test
 *   (앱에서 보려면 firebase.ts에 connectFirestoreEmulator 추가 필요)
 *
 * 프로덕션 쓰기: Application Default Credentials
 * (GOOGLE_APPLICATION_CREDENTIALS 또는 gcloud auth application-default login)
 */

import { createRequire } from "module";

const forceProduction = process.argv.includes("--production");
if (forceProduction && process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(
    "🔁 --production: 세션에 FIRESTORE_EMULATOR_HOST가 있어도 무시하고 프로덕션 Firestore에 씁니다."
  );
  delete process.env.FIRESTORE_EMULATOR_HOST;
}

const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "yago-vibe-spt";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("📍 FIRESTORE_EMULATOR_HOST =", process.env.FIRESTORE_EMULATOR_HOST);
  console.warn(
    "⚠️  에뮬레이터로 시드 중입니다. 웹앱은 프로덕션 DB만 보므로 /sports/...?tab=match 에 데이터가 안 보일 수 있습니다.\n" +
      "   프로덕션에 넣으려면 이 변수를 끄고 다시 실행하세요 (스크립트 상단 주석 참고)."
  );
} else {
  console.log(`📍 프로덕션 Firestore · ${PROJECT_ID}`);
}

async function main() {
  const dateStr = "2026-04-10";
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dateTs = admin.firestore.Timestamp.fromDate(new Date(y, mo - 1, d, 0, 0, 0, 0));

  const payload = {
    title: "테스트 경기",
    sport: "soccer",
    status: "open",
    date: dateTs,
    time: "18:00",
    location: { lat: 37.5, lng: 127.0 },
    stadiumLat: 37.5,
    stadiumLng: 127.0,
    teamId: "seed-test-team",
    teamName: "테스트 경기",
    authorId: "seed-test-author",
    region: "서울",
    stadium: "테스트 구장",
    level: "상관없음",
    contact: "채팅",
    description: "seed-match-test 스크립트로 생성",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("matches").add(payload);
  console.log("✅ matches 문서 생성:", ref.id);
  console.log(JSON.stringify({ ...payload, date: dateStr, createdAt: "(server)", updatedAt: "(server)" }, null, 2));
}

main().catch((e) => {
  const msg = String(e?.message || e);
  console.error("❌ 실패:", msg);
  if (/default credentials|Could not load/i.test(msg)) {
    console.error(`
📌 프로덕션 Firestore 쓰기에는 Google Application Default Credentials(ADC)가 필요합니다.

  방법 A — gcloud (개발 PC 권장)
    gcloud auth application-default login

  방법 B — 서비스 계정 JSON
    1) Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
    2) PowerShell (한 세션):
       $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"
       npm run seed:match-test:production

  방법 C — 콘솔에서 수동
    Firestore → matches → 문서 추가 (스크립트 주석의 필드 구조 참고)

에뮬레이터만 쓸 때는 FIRESTORE_EMULATOR_HOST를 켜고 npm run seed:match-test (앱은 connectFirestoreEmulator 없으면 콘솔 데이터와 안 맞음).
`);
  }
  process.exit(1);
});
