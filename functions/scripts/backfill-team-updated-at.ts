/**
 * teams.updatedAt 이 없는 문서에 createdAt 또는 serverTimestamp 로 보정
 *
 *   npx tsx functions/scripts/backfill-team-updated-at.ts --dry-run
 *   npx tsx functions/scripts/backfill-team-updated-at.ts
 *   npx tsx functions/scripts/backfill-team-updated-at.ts --prod
 */

import * as admin from "firebase-admin";
import { FieldPath, FieldValue, getFirestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    prod: argv.includes("--prod"),
  };
}

const PAGE = 400;

async function main() {
  const { dryRun, prod } = parseArgs();
  if (prod) {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    console.log("🌐 --prod: emulator env cleared");
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  const db = getFirestore();

  let last: QueryDocumentSnapshot | undefined;
  let scanned = 0;
  let patched = 0;
  let batch = db.batch();
  let batchOps = 0;

  const flush = async () => {
    if (batchOps === 0) return;
    if (!dryRun) {
      await batch.commit();
    }
    batch = db.batch();
    batchOps = 0;
  };

  for (;;) {
    let q = db.collection("teams").orderBy(FieldPath.documentId()).limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const d of snap.docs) {
      scanned++;
      const data = d.data() as Record<string, unknown>;
      if (data.updatedAt) continue;

      patched++;
      const created = data.createdAt;
      const ts =
        created && typeof (created as { toMillis?: () => number }).toMillis === "function"
          ? (created as admin.firestore.Timestamp)
          : FieldValue.serverTimestamp();

      if (!dryRun) {
        batch.update(d.ref, { updatedAt: ts });
        batchOps++;
        if (batchOps >= 400) {
          await flush();
        }
      }
    }

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  await flush();

  console.log(JSON.stringify({ dryRun, scanned, patchedMissingUpdatedAt: patched }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
