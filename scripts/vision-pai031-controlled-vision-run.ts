/**
 * PAI-031 controlled validation — Phase 3: Product UI Vision 분석 실행
 * media already uploaded: 21c9234af1f843d3aa0b73b0
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const root = process.cwd();
const admin = require(join(root, "functions/node_modules/firebase-admin"));

for (const key of [
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIREBASE_STORAGE_EMULATOR_HOST",
]) {
  delete process.env[key];
}

const TEAM_ID = "D7TUZaOtfxdBc4P0lQLx";
const MATCH_ID = "vision-pilot-pass01-clip-002";
const MEDIA_ID = "21c9234af1f843d3aa0b73b0";
const ACTOR_UID = "iUZB8RjKlEhb3uotZ6yqtpWtUQE2";
const BASE = "https://yago-vibe-spt.web.app";
const BASELINE_RUN = "3e3daf4ba52c49b89b18ea44";
const OUT = join(
  root,
  "data/vision/report/engineering/production_ops/vision_pai031_controlled_validation"
);

function loadWebConfig() {
  const pick = (file: string) => {
    if (!existsSync(file)) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "").trim();
    }
    return out;
  };
  const env = { ...pick(join(root, ".env.production")), ...pick(join(root, ".env.local")) };
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
    projectId: "yago-vibe-spt",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "yago-vibe-spt.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || "",
  };
}

function kstNow() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T") + "+09:00";
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }
  const db = admin.firestore();
  const webConfig = loadWebConfig();
  const token = await admin.auth().createCustomToken(ACTOR_UID);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.evaluate(
    async ({ token, webConfig }) => {
      const { initializeApp, getApps } = await import(
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"
      );
      const { getAuth, signInWithCustomToken, indexedDBLocalPersistence, setPersistence } =
        await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
      const app = getApps().length ? getApps()[0]! : initializeApp(webConfig);
      const auth = getAuth(app);
      try {
        await setPersistence(auth, indexedDBLocalPersistence);
      } catch {
        /* ignore */
      }
      await signInWithCustomToken(auth, token);
    },
    { token, webConfig }
  );

  const playUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/play?matchId=${encodeURIComponent(MATCH_ID)}`;
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: join(OUT, "before_vision_click.png"), fullPage: true });

  const btn = page.getByRole("button", { name: /Vision 분석 실행|Vision 분석 재시도/ });
  const btnCount = await btn.count();
  console.log("[ui] playUrl", playUrl);
  console.log("[ui] vision button count", btnCount);
  console.log((await page.locator("body").innerText()).slice(0, 1000));
  if (btnCount > 0) {
    await btn.first().click();
    console.log("[ui] Vision 분석 clicked at", kstNow());
    await page.waitForTimeout(10000);
  } else {
    console.log("[ui] Vision button not found on Play tab");
  }
  await page.screenshot({ path: join(OUT, "after_vision_click.png"), fullPage: true });

  let verified: Record<string, unknown> | null = null;
  const started = Date.now();
  while (Date.now() - started < 50 * 60 * 1000) {
    const media = (await db.doc(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}`).get()).data() || {};
    const runsSnap = await db
      .collection(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}/visionRuns`)
      .orderBy("createdAt", "desc")
      .limit(3)
      .get()
      .catch(async () =>
        db.collection(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}/visionRuns`).limit(5).get()
      );
    const idx = (await db.doc(`teams/${TEAM_ID}/visionMatchIndex/${MATCH_ID}`).get()).data() || {};
    const latestRunDoc = runsSnap.docs[0];
    const run = latestRunDoc?.data() || null;
    const runId = latestRunDoc?.id || null;

    console.log("[poll]", {
      min: Math.round((Date.now() - started) / 60000),
      mediaVisionStatus: media.visionStatus ?? null,
      mediaStatus: media.status ?? null,
      runs: runsSnap.size,
      runId,
      runStatus: run?.status ?? null,
      indexStatus: idx.status ?? null,
      indexError: idx.errorCode ?? null,
      indexMediaId: idx.mediaId ?? null,
      gev: run?.gevEventCount ?? null,
    });

    if (
      runId &&
      runId !== BASELINE_RUN &&
      run?.status === "completed" &&
      !run?.errorCode &&
      !run?.errorMessage &&
      idx.status === "completed" &&
      !idx.errorCode &&
      !idx.errorMessage &&
      media.visionStatus === "completed" &&
      !media.visionLastError
    ) {
      verified = {
        validationType: "CONTROLLED_PRODUCTION_SUCCESS_WRITE",
        matchId: MATCH_ID,
        mediaId: MEDIA_ID,
        runId,
        observedAtKst: kstNow(),
        sourceFilePath: "D:\\YAGO_AI\\VIDEOS\\pilot\\pass01_clip_001.mp4",
        sourceClassification: "existing public dataset test video (Pass_01 / YAGO_AI pilot)",
        teamId: TEAM_ID,
        latestRunStatus: run.status,
        latestRunErrorCode: null,
        latestRunErrorMessage: null,
        gevEventCount: run.gevEventCount ?? null,
        indexStatus: idx.status,
        indexErrorCode: null,
        indexErrorMessage: null,
        mediaStatus: media.visionStatus,
        mediaVisionLastError: null,
        productionManualPatch: "N",
        forcedReanalysis: "N",
        directFirestoreWrite: "N",
      };
      break;
    }

    if (run?.status === "failed") {
      writeFileSync(
        join(OUT, "vision_failed_fact.json"),
        JSON.stringify(
          {
            validationType: "CONTROLLED_PRODUCTION_SUCCESS_WRITE",
            failed: true,
            mediaId: MEDIA_ID,
            runId,
            errorCode: run.errorCode ?? null,
            errorMessage: run.errorMessage ?? null,
            observedAtKst: kstNow(),
          },
          null,
          2
        )
      );
      console.log("[FAIL] vision run failed — STOP without PAI-031 PASS/FAIL");
      await browser.close();
      process.exit(4);
    }

    await new Promise((r) => setTimeout(r, 20000));
  }

  const matchUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;
  await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);
  const errorBannerCount = await page.getByTestId("vision-job-monitor-error").count();
  const fiiOk =
    (await page.getByTestId("vision-team-fii-card").count()) > 0 ||
    (await page.locator("text=TEAM FII").count()) > 0;
  const rankingOk =
    (await page.getByTestId("vision-fii-ranking-table").count()) > 0 ||
    (await page.locator("text=P0100").count()) > 0;
  const trendOk =
    (await page.getByTestId("coach-match-flow-trend-card").count()) > 0 ||
    (await page.locator("text=최근 3경기").count()) > 0;

  const fact = {
    note: "NOT a natural write — CONTROLLED PRODUCTION SUCCESS WRITE",
    pai031Gate: "DEPLOYED_VERIFICATION_PENDING",
    verified: verified
      ? {
          ...verified,
          jobMonitorStaleRedBannerCount: errorBannerCount,
          fiiOk,
          rankingOk,
          trendOk,
        }
      : null,
    incomplete: !verified,
    errorBannerCount,
    fiiOk,
    rankingOk,
    trendOk,
  };
  writeFileSync(join(OUT, "controlled_validation_fact.json"), JSON.stringify(fact, null, 2));
  await page.screenshot({ path: join(OUT, "final_verify.png"), fullPage: true });
  await browser.close();
  console.log(JSON.stringify(fact, null, 2));
  if (!verified) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
