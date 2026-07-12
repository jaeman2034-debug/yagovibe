/**
 * VISION_START Product Entry — Production UI validation
 * Real Product click → startVisionAnalysis (no stub, no direct CF invoke outside UI)
 *
 *   npx tsx scripts/vision-start-product-entry-prod-validation.ts
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium, type Page } from "playwright";

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
const BASELINE_RUN = "3e3daf4ba52c49b89b18ea44";
const BASE = "https://yago-vibe-spt.web.app";
const OUT = join(
  root,
  "data/vision/report/engineering/production_ops/vision_start_product_entry"
);
const MAX_POLL_MS = 50 * 60 * 1000;
const POLL_MS = 20_000;

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

async function signIn(page: Page, token: string, webConfig: Record<string, string>) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
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
}

async function readState(db: ReturnType<typeof admin.firestore>) {
  const idxSnap = await db.doc(`teams/${TEAM_ID}/visionMatchIndex/${MATCH_ID}`).get();
  const mediaSnap = await db.doc(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}`).get();
  const runsSnap = await db
    .collection(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}/visionRuns`)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get()
    .catch(async () =>
      db.collection(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}/visionRuns`).limit(10).get()
    );

  const idx = idxSnap.exists ? idxSnap.data()! : null;
  const media = mediaSnap.exists ? mediaSnap.data()! : null;
  const runs = runsSnap.docs.map((d) => {
    const data = d.data();
    return {
      runId: d.id,
      status: data.status ?? null,
      errorCode: data.errorCode ?? null,
      errorMessage: data.errorMessage ?? null,
      gevEventCount: data.gevEventCount ?? data.gevCount ?? null,
      pipelineStep: data.pipelineStep ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      completedAt: data.completedAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });

  const latestRunId = idx?.latestRunId ?? idx?.runId ?? runs[0]?.runId ?? null;
  let latestRun: (typeof runs)[0] | null = runs.find((r) => r.runId === latestRunId) ?? runs[0] ?? null;
  if (latestRunId && MEDIA_ID) {
    const r = await db.doc(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}/visionRuns/${latestRunId}`).get();
    if (r.exists) {
      const data = r.data()!;
      latestRun = {
        runId: latestRunId,
        status: data.status ?? null,
        errorCode: data.errorCode ?? null,
        errorMessage: data.errorMessage ?? null,
        gevEventCount: data.gevEventCount ?? data.gevCount ?? null,
        pipelineStep: data.pipelineStep ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        completedAt: data.completedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    }
  }

  return {
    index: idx
      ? {
          status: idx.status ?? null,
          mediaId: idx.mediaId ?? null,
          latestRunId: idx.latestRunId ?? idx.runId ?? null,
          errorCode: idx.errorCode ?? null,
          errorMessage: idx.errorMessage ?? null,
          progress: idx.progress ?? null,
          pipelineStep: idx.pipelineStep ?? null,
          updatedAt: idx.updatedAt?.toDate?.()?.toISOString?.() ?? null,
        }
      : null,
    media: media
      ? {
          status: media.status ?? null,
          visionStatus: media.visionStatus ?? null,
          visionLastError: media.visionLastError ?? null,
          matchId: media.matchId ?? null,
        }
      : null,
    runCount: runsSnap.size,
    runs,
    latestRun,
  };
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

  const before = await readState(db);
  writeFileSync(join(OUT, "prod_before_click.json"), JSON.stringify({ observedAtKst: kstNow(), ...before }, null, 2));

  if (before.runCount !== 0) {
    console.warn("[warn] visionRuns already present before click", before.runCount);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const callableHits: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("startVisionAnalysis")) callableHits.push("startVisionAnalysis");
    if (url.includes("retryVisionAnalysis")) callableHits.push("retryVisionAnalysis");
    if (url.includes("processVisionUploadQueue")) callableHits.push("processVisionUploadQueue");
  });

  await signIn(page, token, webConfig);

  const playUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/play?matchId=${encodeURIComponent(MATCH_ID)}`;
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(6000);

  await page.evaluate(() => {
    for (const d of Array.from(document.querySelectorAll("details"))) {
      const t = d.querySelector("summary")?.textContent ?? "";
      if (t.includes("Vision Coach")) d.open = true;
    }
  });
  await page.waitForTimeout(2000);

  const entry = {
    playUrl,
    finalUrl: page.url(),
    matchIdPreserved: page.url().includes(MATCH_ID),
    slotVisible: (await page.getByTestId("play-tab-vision-mount-slot").count()) > 0,
    coachVisible: (await page.getByTestId("coach-vision-analysis-section").count()) > 0,
    runBtnCount: await page.getByTestId("vision-run-analysis-button").count(),
    runBtnText:
      (await page.getByTestId("vision-run-analysis-button").count()) > 0
        ? await page.getByTestId("vision-run-analysis-button").first().innerText()
        : null,
    runCountBeforeClick: before.runCount,
  };
  await page.screenshot({ path: join(OUT, "prod_entry_before_click.png"), fullPage: true });

  if (!entry.slotVisible || !entry.coachVisible || entry.runBtnCount < 1) {
    writeFileSync(
      join(OUT, "prod_entry_fail.json"),
      JSON.stringify({ observedAtKst: kstNow(), entry, callableHits }, null, 2)
    );
    await browser.close();
    throw new Error("Production UI entry FAIL — Vision mount/button missing");
  }

  const clickedAtKst = kstNow();
  // Do not await CF completion on the page — fire click and poll Firestore
  await page.getByTestId("vision-run-analysis-button").first().click({ force: true, timeout: 15000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: join(OUT, "prod_after_click.png"), fullPage: true });

  const clickFact = {
    clickedAtKst,
    clickedAction: entry.runBtnText,
    backendHitsObserved: [...callableHits],
    calledStartVisionAnalysis: callableHits.includes("startVisionAnalysis"),
    calledRetryVisionAnalysis: callableHits.includes("retryVisionAnalysis"),
    calledProcessVisionUploadQueue: callableHits.includes("processVisionUploadQueue"),
  };
  writeFileSync(join(OUT, "prod_click_fact.json"), JSON.stringify({ entry, clickFact }, null, 2));
  console.log("[click]", clickFact);

  // Keep browser open briefly then close — analysis continues server-side
  await page.waitForTimeout(5000);
  await browser.close();

  const progression: Array<Record<string, unknown>> = [];
  const pollStarted = Date.now();
  let finalState = await readState(db);
  let successfulWrite = false;

  while (Date.now() - pollStarted < MAX_POLL_MS) {
    finalState = await readState(db);
    const tick = {
      elapsedMin: Math.round((Date.now() - pollStarted) / 60000),
      observedAtKst: kstNow(),
      runCount: finalState.runCount,
      latestRunId: finalState.index?.latestRunId ?? null,
      indexStatus: finalState.index?.status ?? null,
      runStatus: finalState.latestRun?.status ?? null,
      indexError: finalState.index?.errorCode ?? null,
      mediaVisionStatus: finalState.media?.visionStatus ?? null,
      mediaLastError: finalState.media?.visionLastError ?? null,
      gev: finalState.latestRun?.gevEventCount ?? null,
    };
    progression.push(tick);
    console.log("[poll]", tick);
    writeFileSync(join(OUT, "prod_poll_progress.json"), JSON.stringify(progression, null, 2));

    const isNewRun =
      finalState.latestRun &&
      finalState.latestRun.runId !== BASELINE_RUN &&
      finalState.runCount > 0;
    const completed =
      isNewRun &&
      finalState.latestRun?.status === "completed" &&
      !finalState.latestRun?.errorCode &&
      !finalState.latestRun?.errorMessage &&
      finalState.index?.status === "completed";

    if (completed) {
      successfulWrite = true;
      break;
    }

    // Terminal failure on NEW run
    if (
      isNewRun &&
      (finalState.latestRun?.status === "failed" || finalState.index?.status === "failed")
    ) {
      console.warn("[poll] new run failed — stop polling");
      break;
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  // Job Monitor stale banner smoke (read-only page open)
  const browser2 = await chromium.launch({ headless: true });
  const page2 = await browser2.newPage({ viewport: { width: 1280, height: 900 } });
  await signIn(page2, token, webConfig);
  const detailUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;
  await page2.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page2.waitForTimeout(4000);
  const bodyText = await page2.locator("body").innerText();
  const staleBanner =
    /VISION_ANALYSIS_FAILED|no GEV events/i.test(bodyText) &&
    /완료|completed/i.test(bodyText);
  const hasFii = /FII|Team FII|팀 FII/i.test(bodyText);
  const hasRanking = /Ranking|순위|Top 3/i.test(bodyText);
  const hasTrend = /흐름|Trend|최근 .*경기/i.test(bodyText);
  await page2.screenshot({ path: join(OUT, "prod_match_detail_after.png"), fullPage: true });
  await browser2.close();

  const tenItem = {
    "1_latest_run_status_completed": finalState.latestRun?.status === "completed",
    "2_latest_run_error_absent":
      !finalState.latestRun?.errorCode && !finalState.latestRun?.errorMessage,
    "3_gev_count": finalState.latestRun?.gevEventCount ?? null,
    "4_index_status_completed": finalState.index?.status === "completed",
    "5_index_errorCode_absent": !finalState.index?.errorCode,
    "6_index_errorMessage_absent": !finalState.index?.errorMessage,
    "7_media_status_completed":
      finalState.media?.visionStatus === "completed" ||
      finalState.media?.status === "completed",
    "8_media_visionLastError_absent": !finalState.media?.visionLastError,
    "9_job_monitor_stale_red_banner_absent": successfulWrite ? !staleBanner : null,
    "10_fii_ranking_trend_ok": successfulWrite ? hasFii && hasRanking : null,
    notes: {
      staleBannerHeuristic: staleBanner,
      hasFii,
      hasRanking,
      hasTrend,
      validationType: "CONTROLLED_PRODUCTION_SUCCESS_WRITE",
      productionManualPatch: "N",
      forcedReanalysis: "N",
      directFirestoreWrite: "N",
    },
  };

  const report = {
    track: "VISION_START_PRODUCT_ENTRY",
    notPai031Fix: true,
    commitHash: "605ff549de0c7b4c3881535b3950166d7abd00e9",
    pushBranch: "vision-v2-i13",
    deployTarget: "Firebase Hosting / yago-vibe-spt → https://yago-vibe-spt.web.app",
    mediaId: MEDIA_ID,
    matchId: MATCH_ID,
    teamId: TEAM_ID,
    observedAtKst: kstNow(),
    productionUiEntry: entry.slotVisible && entry.coachVisible && entry.runBtnCount > 0 ? "PASS" : "FAIL",
    clickedAction: clickFact.clickedAction,
    backendAction: clickFact.calledStartVisionAnalysis
      ? "startVisionAnalysis"
      : clickFact.calledRetryVisionAnalysis
        ? "retryVisionAnalysis"
        : callableHits[0] ?? "unknown/not-observed",
    clickFact,
    visionRunId: finalState.latestRun?.runId ?? null,
    runProgression: progression,
    successfulWrite,
    productionSnapshot: finalState,
    pai031TenItem: tenItem,
    pai031Gate: "DEPLOYED / VERIFICATION PENDING",
    passCompleteClosedDeclared: false,
  };

  writeFileSync(join(OUT, "prod_validation_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
