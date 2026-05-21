/**
 * marketPosts / recruitPosts / matchPosts → activities 백필 (Admin)
 *
 * - 동일 refId + refCollection("market") 조합이 이미 있으면 스킵 (중복 방지)
 * - 원본 createdAt·createdAtMillis를 유지해 허브 최신순이 과거 타임라인과 맞도록 함
 *
 * 실행:
 *   cd functions
 *   npx ts-node scripts/backfillActivitiesFromLegacyPosts.ts
 *   npx ts-node scripts/backfillActivitiesFromLegacyPosts.ts --dry-run
 *   npx ts-node scripts/backfillActivitiesFromLegacyPosts.ts --limit=2000
 *   npx ts-node scripts/backfillActivitiesFromLegacyPosts.ts --with-matches
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";

if (getApps().length === 0) {
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(`✅ Admin 초기화 (project: ${serviceAccount.project_id})`);
  } else {
    initializeApp();
    console.log("✅ Admin 초기화 (기본 인증)");
  }
}

const db = getFirestore();

type LegacyCol = "marketPosts" | "recruitPosts" | "matchPosts";

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const withMatches = argv.includes("--with-matches");
  let limit = 5000;
  for (const a of argv) {
    if (a.startsWith("--limit=")) {
      const n = Number(a.split("=")[1]);
      if (Number.isFinite(n) && n > 0) limit = Math.floor(n);
    }
  }
  return { dryRun, limit, withMatches };
}

/** `activityHubScoreFormula` / 클라 `activityHubScore` 와 동기 (지수 감쇠 + explore) */
const HUB_DECAY_LAMBDA = 0.05;
const HUB_EXPLORE_H = 2;
const HUB_EXPLORE_BOOST = 5;

function hubScoreForBackfill(createdAtMillis: number, likes = 0, comments = 0, nowMs = Date.now()): number {
  const hours = Math.max(0, (nowMs - createdAtMillis) / (1000 * 60 * 60));
  let base = likes * 4 + comments * 7;
  base = Math.max(0, base);
  let s = base * Math.exp(-HUB_DECAY_LAMBDA * hours);
  if (hours < HUB_EXPLORE_H) s += HUB_EXPLORE_BOOST;
  return Math.round(Math.max(0, s) * 1000) / 1000;
}

function inferActivityType(data: Record<string, unknown>): {
  type: string;
  refType: string;
  refCollection: string;
} {
  const cat = String(data.category || "").toLowerCase();
  if (cat === "recruit") {
    return { type: "recruit_created", refType: "market", refCollection: "market" };
  }
  if (cat === "match") {
    return { type: "match_created", refType: "market", refCollection: "market" };
  }
  if (cat === "equipment") {
    return { type: "equipment_created", refType: "market", refCollection: "market" };
  }
  return { type: "market_created", refType: "market", refCollection: "market" };
}

async function alreadyHasActivity(refId: string, refCollection: string): Promise<boolean> {
  const snap = await db
    .collection("activities")
    .where("refId", "==", refId)
    .where("refCollection", "==", refCollection)
    .limit(1)
    .get();
  return !snap.empty;
}

/** `matches/{id}` 경기 매칭 글 (refCollection `matches`) */
async function backfillMatches(opts: {
  dryRun: boolean;
  limit: number;
  used: { n: number };
}): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;
  let last: QueryDocumentSnapshot | null = null;
  const page = 200;

  while (opts.used.n < opts.limit) {
    let q = db.collection("matches").orderBy("createdAt", "desc").limit(Math.min(page, opts.limit - opts.used.n));
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      if (opts.used.n >= opts.limit) break;
      opts.used.n++;
      const refId = docSnap.id;
      const refCollection = "matches";
      if (await alreadyHasActivity(refId, refCollection)) {
        skipped++;
        continue;
      }
      const data = docSnap.data();
      const teamName = typeof data.teamName === "string" ? data.teamName : "매칭";
      const title =
        typeof data.title === "string" && data.title.trim()
          ? data.title.trim()
          : `${teamName} 매칭`;
      const summary =
        typeof data.description === "string" && data.description.trim()
          ? String(data.description).trim().slice(0, 500)
          : undefined;
      const authorId =
        typeof data.authorId === "string" && data.authorId.trim() ? data.authorId.trim() : "system_backfill";
      const sportRaw = typeof data.sport === "string" ? data.sport : "soccer";
      const sport = sportRaw.toLowerCase().trim() || "soccer";
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : FieldValue.serverTimestamp();
      const createdAtMillis = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
      const teamId = typeof data.teamId === "string" ? data.teamId : undefined;

      const payload: Record<string, unknown> = {
        type: "match_created",
        refType: "match",
        refId,
        refCollection,
        authorId,
        title,
        visibility: "public",
        likeCount: 0,
        commentCount: 0,
        feedbackReportCount: 0,
        feedbackHideCount: 0,
        feedbackNotInterestedCount: 0,
        createdAt,
        createdAtMillis,
        hubScore: hubScoreForBackfill(createdAtMillis, 0, 0),
        sport,
      };
      if (summary) payload.summary = summary;
      if (teamId) payload.teamId = teamId;

      if (opts.dryRun) {
        console.log(`[dry-run] would add activity ← matches/${refId}`);
        written++;
        continue;
      }
      await db.collection("activities").add(payload);
      written++;
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < page) break;
  }
  return { written, skipped };
}

async function backfillCollection(
  col: LegacyCol,
  opts: { dryRun: boolean; limit: number; used: { n: number } }
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;
  let last: QueryDocumentSnapshot | null = null;
  const page = 300;

  while (opts.used.n < opts.limit) {
    let q = db.collection(col).orderBy("createdAt", "desc").limit(Math.min(page, opts.limit - opts.used.n));
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      if (opts.used.n >= opts.limit) break;
      opts.used.n++;

      const data = docSnap.data();
      const refId = docSnap.id;
      const { type, refType, refCollection } = inferActivityType(data);

      if (await alreadyHasActivity(refId, refCollection)) {
        skipped++;
        continue;
      }

      const title =
        typeof data.title === "string" && data.title.trim()
          ? data.title.trim()
          : `[${col}] ${refId.slice(0, 8)}`;
      const summary =
        typeof data.description === "string" && data.description.trim()
          ? String(data.description).trim().slice(0, 500)
          : undefined;
      const thumb =
        (typeof data.thumbnailUrl === "string" && data.thumbnailUrl) ||
        (Array.isArray(data.images) && typeof data.images[0] === "string" && data.images[0]) ||
        undefined;
      const authorId =
        typeof data.authorId === "string" && data.authorId.trim() ? data.authorId.trim() : "system_backfill";
      const sportRaw = typeof data.sport === "string" ? data.sport : "soccer";
      const sport = sportRaw.toLowerCase().trim() || "soccer";
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : FieldValue.serverTimestamp();
      const createdAtMillis = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();

      const payload: Record<string, unknown> = {
        type,
        refType,
        refId,
        refCollection,
        authorId,
        title,
        visibility: "public",
        likeCount: 0,
        commentCount: 0,
        feedbackReportCount: 0,
        feedbackHideCount: 0,
        feedbackNotInterestedCount: 0,
        createdAt,
        createdAtMillis,
        hubScore: hubScoreForBackfill(createdAtMillis, 0, 0),
        sport,
      };
      if (summary) payload.summary = summary;
      if (thumb) payload.thumbnailUrl = thumb;
      const price = typeof data.price === "number" && Number.isFinite(data.price) ? data.price : undefined;
      if (price != null && price > 0) payload.price = price;

      if (opts.dryRun) {
        console.log(`[dry-run] would add activity ← ${col}/${refId} (${type})`);
        written++;
        continue;
      }

      await db.collection("activities").add(payload);
      written++;
    }

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < page) break;
  }

  return { written, skipped };
}

async function main() {
  const { dryRun, limit, withMatches } = parseArgs();
  console.log(
    `\n🔥 backfill activities ← legacy posts (dryRun=${dryRun}, limit=${limit}, withMatches=${withMatches})\n`
  );

  const used = { n: 0 };
  let totalW = 0;
  let totalS = 0;

  const cols: LegacyCol[] = ["marketPosts", "recruitPosts", "matchPosts"];
  for (const c of cols) {
    try {
      const { written, skipped } = await backfillCollection(c, { dryRun, limit, used });
      console.log(`✅ ${c}: written=${written}, skipped(duplicate)=${skipped}`);
      totalW += written;
      totalS += skipped;
    } catch (e: unknown) {
      console.warn(`⚠️ ${c} 처리 중 오류 (인덱스·필드 없음 등):`, e);
    }
  }

  if (withMatches) {
    try {
      const { written, skipped } = await backfillMatches({ dryRun, limit, used });
      console.log(`✅ matches: written=${written}, skipped(duplicate)=${skipped}`);
      totalW += written;
      totalS += skipped;
    } catch (e: unknown) {
      console.warn("⚠️ matches 처리 중 오류 (createdAt 인덱스·필드 없음 등):", e);
    }
  }

  console.log(`\n📊 합계: written=${totalW}, skipped=${totalS}, scanned≈${used.n}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
