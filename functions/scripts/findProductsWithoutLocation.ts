/**
 * 🔥 market 상품 중 위치(lat/lng) 없는 상품 조회
 *
 * 사용법:
 * ```bash
 * cd functions
 * npx ts-node scripts/findProductsWithoutLocation.ts
 * ```
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(`✅ Firebase Admin 초기화 (프로젝트: ${serviceAccount.project_id})`);
  } else {
    admin.initializeApp();
    console.log("✅ Firebase Admin 초기화 (기본 인증)");
  }
}

process.env.FIRESTORE_EMULATOR_HOST = "";

const db = admin.firestore();

async function findProductsWithoutLocation() {
  console.log("🔥 [findProductsWithoutLocation] market 상품 조회 중...\n");

  const snap = await db.collection("market").get();
  const without: Array<{ id: string; name?: string; title?: string }> = [];

  snap.forEach((doc) => {
    const data = doc.data();
    const lat = data.latitude ?? data.lat;
    const lng = data.longitude ?? data.lng;
    const hasValid =
      lat != null &&
      lng != null &&
      !Number.isNaN(Number(lat)) &&
      !Number.isNaN(Number(lng));

    if (!hasValid) {
      without.push({
        id: doc.id,
        name: data.name ?? data.title,
      });
    }
  });

  console.log(`📊 전체: ${snap.size}개, 위치 없음: ${without.length}개\n`);
  if (without.length > 0) {
    console.log("위치 없는 상품 ID (처음 50개):");
    without.slice(0, 50).forEach((p) => {
      console.log(`  - ${p.id}  ${p.name || "(이름 없음)"}`);
    });
    if (without.length > 50) {
      console.log(`  ... 외 ${without.length - 50}개`);
    }
  }

  return without;
}

findProductsWithoutLocation()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ 오류:", e);
    process.exit(1);
  });
