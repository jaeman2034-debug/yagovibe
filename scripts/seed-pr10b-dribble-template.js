/**
 * Firestore `challenge_templates/dribble_challenge_v1` 시드 (PR-10B)
 *
 * ⚠️ DB 불일치 주의 — `scripts/seed-match-test.js` 상단 주석과 동일.
 */

import { createRequire } from "module";

const forceProduction = process.argv.includes("--production");
if (forceProduction && process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("🔁 --production: FIRESTORE_EMULATOR_HOST 무시 후 프로덕션에 씁니다.");
  delete process.env.FIRESTORE_EMULATOR_HOST;
}

const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "yago-vibe-spt";
const TEMPLATE_ID = "dribble_challenge_v1";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("📍 FIRESTORE_EMULATOR_HOST =", process.env.FIRESTORE_EMULATOR_HOST);
} else {
  console.log(`📍 프로덕션 Firestore · ${PROJECT_ID}`);
}

const ref = db.collection("challenge_templates").doc(TEMPLATE_ID);
const now = admin.firestore.FieldValue.serverTimestamp();

await ref.set(
  {
    slug: "dribble_challenge",
    title: "드리블 챌린지",
    mode: "dribble",
    scoringType: "high_score",
    isActive: true,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  },
  { merge: true },
);

console.log(`✅ challenge_templates/${TEMPLATE_ID} upsert 완료`);
