/**
 * 🔥 market 상품 keywordTokens / searchText 재생성 스크립트
 *
 * 기존 상품에 동의어(박스↔box)가 없어 검색 결과가 달라지는 문제 해결.
 * buildSearchMetaFromProduct로 keywordTokens, searchText를 갱신합니다.
 *
 * 사용법:
 * ```bash
 * cd functions
 * npx ts-node scripts/rebuildSearchMeta.ts
 * ```
 */

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import { buildSearchMetaFromProduct } from "../src/searchMetaUtils";

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

const db = getFirestore();

async function rebuildSearchMeta() {
  console.log("🔥 [rebuildSearchMeta] market 상품 검색 메타 재생성 시작...\n");

  const snap = await db.collection("market").get();
  console.log(`📊 전체 상품: ${snap.size}개\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const name = data.name ?? data.title ?? data.productName ?? "";

    if (!name && !data.description) {
      skipped++;
      continue;
    }

    try {
      const meta = buildSearchMetaFromProduct({
        name,
        productName: name,
        title: data.title,
        category: data.category,
        description: data.description,
        brand: data.brand,
        tags: Array.isArray(data.tags) ? data.tags : [],
      });

      await doc.ref.update({
        keywordTokens: meta.keywordTokens,
        searchText: meta.searchText,
        ...(meta.tags.length > 0 ? { tags: meta.tags } : {}),
      });

      updated++;
      if (updated % 10 === 0) {
        console.log(`  updated: ${updated}/${snap.size}`);
      }
    } catch (err: any) {
      errors++;
      console.error(`  ❌ ${doc.id}:`, err.message);
    }
  }

  console.log(`\n✅ 완료: ${updated}건 갱신, ${skipped}건 스킵, ${errors}건 오류`);
}

rebuildSearchMeta().catch((e) => {
  console.error("❌ 스크립트 오류:", e);
  process.exit(1);
});
