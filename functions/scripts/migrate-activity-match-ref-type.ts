/**
 * activities 레거시 매칭 문서의 refType/refCollection 보정
 *
 * 대상:
 * - refType === "market"
 * - type in ["match_created", "match_join_requested", "match_confirmed"]
 *
 * 실행:
 *   npx tsx functions/scripts/migrate-activity-match-ref-type.ts --dry-run
 *   npx tsx functions/scripts/migrate-activity-match-ref-type.ts
 */

import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    prod: argv.includes("--prod"),
  };
}

const MATCH_TYPES = new Set(["match_created", "match_join_requested", "match_confirmed"]);

async function migrateActivityMatchRefType() {
  const { dryRun, prod } = parseArgs();
  if (prod) {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    console.log("🌐 --prod mode: emulator env vars cleared");
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  const db = getFirestore();

  console.log("🔄 activities match refType migration start");
  if (dryRun) console.log("🧪 dry-run mode");

  const q = db.collection("activities").where("refType", "==", "market");
  const snap = await q.get();

  let scanned = 0;
  let target = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`📄 scanned docs: ${snap.size}`);

  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    scanned++;
    const data = docSnap.data() as { type?: string; refType?: string; refCollection?: string };
    const type = typeof data.type === "string" ? data.type : "";

    if (!MATCH_TYPES.has(type)) {
      skipped++;
      continue;
    }

    target++;
    if (dryRun) {
      console.log(`🧪 will update: ${docSnap.id} (${type})`);
      continue;
    }

    try {
      batch.update(docSnap.ref, {
        refType: "match",
        refCollection: "matches",
        migratedAt: FieldValue.serverTimestamp(),
        migratedBy: "script:migrate-activity-match-ref-type",
      });
      batchCount++;

      if (batchCount >= 400) {
        await batch.commit();
        updated += batchCount;
        batch = db.batch();
        batchCount = 0;
      }
    } catch (e) {
      failed++;
      console.error(`❌ update failed: ${docSnap.id}`, e);
    }
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
    updated += batchCount;
  }

  console.log("=".repeat(72));
  console.log("✅ migration summary");
  console.log(`- scanned: ${scanned}`);
  console.log(`- target(match legacy): ${target}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- updated: ${dryRun ? 0 : updated}`);
  console.log(`- failed: ${failed}`);
  if (dryRun) console.log("- dry-run only, no writes");
  console.log("=".repeat(72));
}

if (require.main === module) {
  migrateActivityMatchRefType()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("❌ migration aborted", e);
      process.exit(1);
    });
}

export { migrateActivityMatchRefType };

