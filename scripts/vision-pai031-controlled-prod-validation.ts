/**
 * PAI-031 — CONTROLLED PRODUCTION SUCCESS WRITE validation
 * NOT a natural write. Production UI upload only.
 *
 *   npx tsx scripts/vision-pai031-controlled-prod-validation.ts
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { chromium, type Page } from "playwright";

const require = createRequire(import.meta.url);
const root = process.cwd();
const admin = require(join(root, "functions/node_modules/firebase-admin"));

const TEAM_ID = "D7TUZaOtfxdBc4P0lQLx";
/** Upload to stale-baseline match so Fix A/B clear can be observed (new mediaId, not reopen-only). */
const MATCH_ID = "vision-pilot-pass01-clip-002";
const SOURCE_VIDEO = "D:\\YAGO_AI\\VIDEOS\\pilot\\pass01_clip_001.mp4";
/** Team owner — has avatar + Validation Console access (coach lacks avatar → onboarding redirect). */
const ACTOR_UID = "iUZB8RjKlEhb3uotZ6yqtpWtUQE2";
const BASE = "https://yago-vibe-spt.web.app";
const OUT_DIR = join(
  root,
  "data/vision/report/engineering/production_ops/vision_pai031_controlled_validation"
);

const CF_DEPLOY_MS = Date.parse("2026-07-12T03:12:00.000Z");
const BASELINE_RUN = "3e3daf4ba52c49b89b18ea44";

function clearEmulatorEnv() {
  for (const key of [
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_FIRESTORE_EMULATOR_HOST",
    "FIREBASE_AUTH_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
  ]) {
    delete process.env[key];
  }
}

function loadWebConfig(): Record<string, string> {
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

function kstNow(): string {
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

async function readVisionState(mediaIdHint?: string | null) {
  const db = admin.firestore();
  const index = await db.doc(`teams/${TEAM_ID}/visionMatchIndex/${MATCH_ID}`).get();
  const idx = index.exists ? index.data() : null;
  const mediaId = mediaIdHint || idx?.mediaId || null;
  const runId = idx?.latestRunId || idx?.runId || null;
  let run: Record<string, unknown> | null = null;
  let media: Record<string, unknown> | null = null;
  if (mediaId && runId) {
    const r = await db.doc(`teams/${TEAM_ID}/aiIngest/${mediaId}/visionRuns/${runId}`).get();
    if (r.exists) run = r.data() as Record<string, unknown>;
  }
  if (mediaId) {
    const m = await db.doc(`teams/${TEAM_ID}/aiIngest/${mediaId}`).get();
    if (m.exists) media = m.data() as Record<string, unknown>;
  }
  return { idx, mediaId, runId, run, media };
}

async function main() {
  clearEmulatorEnv();
  mkdirSync(OUT_DIR, { recursive: true });

  const phase1 = {
    validationType: "CONTROLLED_PRODUCTION_SUCCESS_WRITE",
    sourceFilePath: SOURCE_VIDEO,
    sourceExists: existsSync(SOURCE_VIDEO),
    sourceBytes: existsSync(SOURCE_VIDEO) ? statSync(SOURCE_VIDEO).size : null,
    sourceClassification: "existing public dataset test video (Pass_01 / YAGO_AI pilot)",
    candidatesChecked: [
      "D:\\YAGO_AI\\VIDEOS\\pilot\\pass01_clip_001.mp4",
      "D:\\YAGO_AI\\VIDEOS\\pilot\\pass01_clip_002.mp4",
      "D:\\YAGO_AI\\VIDEOS\\pilot\\pass01_clip_003.mp4",
      "D:\\YAGO_AI\\VIDEOS\\pilot\\pass01_clip_004.mp4",
    ],
  };

  if (!phase1.sourceExists) {
    writeFileSync(join(OUT_DIR, "phase1_stop.json"), JSON.stringify(phase1, null, 2));
    console.error("PHASE1 STOP — source video missing");
    process.exit(2);
  }

  const webConfig = loadWebConfig();
  if (!webConfig.apiKey || !webConfig.appId) throw new Error("Missing VITE_FIREBASE_*");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }

  const token = await admin.auth().createCustomToken(ACTOR_UID);
  const uploadStartedAtKst = kstNow();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await signIn(page, token, webConfig);

  const consoleUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/validation-console?matchId=${encodeURIComponent(MATCH_ID)}`;
  await page.goto(consoleUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);
  if (page.url().includes("/login")) {
    await signIn(page, token, webConfig);
    await page.goto(consoleUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(4000);
  }

  // Prefer MP4 path
  const mp4Tab = page.getByRole("button", { name: /MP4|영상|파일/i }).first();
  if (await mp4Tab.count()) {
    await mp4Tab.click().catch(() => undefined);
    await page.waitForTimeout(500);
  }
  // Click text buttons that switch to mp4
  await page.locator("text=MP4").first().click({ timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(800);

  await page.waitForSelector("#academy-mp4-upload-anchor", { timeout: 60000 });
  const fileInput = page.locator("#academy-mp4-upload-anchor input[type='file']").first();
  await fileInput.setInputFiles(SOURCE_VIDEO);
  await page.waitForTimeout(1000);

  await page.locator("#consent-upload-right").check({ force: true });
  await page.locator("#consent-ai-analysis").check({ force: true });
  await page.locator("#consent-guardian").check({ force: true });
  await page.waitForTimeout(500);

  // Upload
  await page.locator("#academy-mp4-upload-anchor").getByRole("button", { name: /^업로드$/ }).click();
  console.log("[upload] clicked", uploadStartedAtKst);

  // Wait for uploaded phase / media id in DOM or network
  let mediaIdFromUi: string | null = null;
  for (let i = 0; i < 180; i++) {
    await page.waitForTimeout(2000);
    const body = await page.locator("body").innerText();
    const m = body.match(/Media ID:\s*([a-zA-Z0-9]+)/);
    if (m) mediaIdFromUi = m[1];
    if (body.includes("업로드 완료") || body.includes("Status: uploaded") || mediaIdFromUi) {
      console.log("[upload] uploaded phase detected", { mediaIdFromUi, t: i });
      break;
    }
    if (body.includes("실패") && body.includes("업로드")) {
      writeFileSync(
        join(OUT_DIR, "upload_failed.json"),
        JSON.stringify({ bodySnippet: body.slice(0, 2000), pageErrors }, null, 2)
      );
      await page.screenshot({ path: join(OUT_DIR, "upload_failed.png"), fullPage: true });
      await browser.close();
      throw new Error("Upload failed in UI");
    }
  }

  // Start AI analysis (Whisper path in Product UI)
  const analyzeBtn = page.locator("#academy-mp4-upload-anchor").getByRole("button", { name: /분석 시작/ });
  if (await analyzeBtn.isEnabled().catch(() => false)) {
    await analyzeBtn.click();
    console.log("[ingest] 분석 시작 clicked");
  } else {
    console.log("[ingest] 분석 시작 not enabled yet — waiting");
    await page.waitForTimeout(5000);
    if (await analyzeBtn.isEnabled().catch(() => false)) {
      await analyzeBtn.click();
      console.log("[ingest] 분석 시작 clicked (retry)");
    }
  }

  await page.screenshot({ path: join(OUT_DIR, "after_upload.png"), fullPage: true });

  // Optionally trigger Vision from Match Detail Coach Product UI (startVisionAnalysis)
  const matchUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;
  await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);
  const visionBtn = page.getByRole("button", { name: /Vision 분석 실행|Vision 분석 재시도/ }).first();
  if ((await visionBtn.count()) > 0) {
    await visionBtn.click().catch(() => undefined);
    console.log("[vision] Coach Vision 분석 button clicked (Product UI)");
  }

  // Poll Firestore for NEW completed run after CF deploy, different from baseline
  let verified: Record<string, unknown> | null = null;
  const pollStarted = Date.now();
  const maxMs = 45 * 60 * 1000;
  while (Date.now() - pollStarted < maxMs) {
    const st = await readVisionState(mediaIdFromUi);
    const runId = st.runId;
    const updatedMs = st.idx?.updatedAt?.toMillis?.() ?? 0;
    const isNewRun = runId && runId !== BASELINE_RUN;
    const completed =
      st.idx?.status === "completed" &&
      st.run?.status === "completed" &&
      !st.run?.errorCode &&
      !st.run?.errorMessage;
    const cleared =
      !st.idx?.errorCode &&
      !st.idx?.errorMessage &&
      st.media?.visionStatus === "completed" &&
      !st.media?.visionLastError;

    console.log("[poll]", {
      elapsedMin: Math.round((Date.now() - pollStarted) / 60000),
      mediaId: st.mediaId,
      runId,
      isNewRun,
      indexStatus: st.idx?.status,
      runStatus: st.run?.status,
      indexError: st.idx?.errorCode ?? null,
      mediaLastError: st.media?.visionLastError ? "PRESENT" : null,
      gev: st.run?.gevEventCount ?? null,
    });

    if (isNewRun && completed && cleared && updatedMs >= CF_DEPLOY_MS) {
      verified = {
        validationType: "CONTROLLED_PRODUCTION_SUCCESS_WRITE",
        matchId: MATCH_ID,
        mediaId: st.mediaId,
        runId,
        observedAtKst: kstNow(),
        sourceFilePath: SOURCE_VIDEO,
        sourceClassification: phase1.sourceClassification,
        uploadStartedAtKst,
        teamId: TEAM_ID,
        latestRunStatus: st.run?.status,
        latestRunErrorCode: st.run?.errorCode ?? null,
        latestRunErrorMessage: st.run?.errorMessage ?? null,
        gevEventCount: st.run?.gevEventCount ?? null,
        indexStatus: st.idx?.status,
        indexErrorCode: st.idx?.errorCode ?? null,
        indexErrorMessage: st.idx?.errorMessage ?? null,
        mediaStatus: st.media?.visionStatus ?? null,
        mediaVisionLastError: st.media?.visionLastError ?? null,
        productionManualPatch: "N",
        forcedReanalysis: "N",
        directFirestoreWrite: "N",
        pageErrors,
      };
      break;
    }
    await new Promise((r) => setTimeout(r, 30000));
  }

  // Job Monitor banner check on Production Hosting
  let jobMonitor = { errorBannerCount: null as number | null, completedVisible: null as boolean | null };
  try {
    await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(3500);
    const errCount = await page.getByTestId("vision-job-monitor-error").count();
    const panelText = ((await page.getByTestId("vision-job-monitor-panel").first().innerText()) || "").trim();
    jobMonitor = {
      errorBannerCount: errCount,
      completedVisible: panelText.includes("완료"),
    };
  } catch {
    /* ignore UI poll errors */
  }

  const fact = {
    phase1,
    validationType: "CONTROLLED_PRODUCTION_SUCCESS_WRITE",
    note: "NOT a natural write",
    pai031Gate: "DEPLOYED_VERIFICATION_PENDING",
    verified: verified
      ? {
          ...verified,
          jobMonitorStaleRedBannerCount: jobMonitor.errorBannerCount,
          jobMonitorCompletedVisible: jobMonitor.completedVisible,
        }
      : null,
    incomplete: !verified,
    jobMonitor,
    pageErrors,
  };

  writeFileSync(join(OUT_DIR, "controlled_validation_fact.json"), JSON.stringify(fact, null, 2), "utf8");
  await page.screenshot({ path: join(OUT_DIR, "final.png"), fullPage: true });
  await browser.close();

  console.log("\n[PAI-031 CONTROLLED PRODUCTION VALIDATION]");
  console.log(JSON.stringify(fact.verified ?? { incomplete: true, jobMonitor }, null, 2));
  if (!verified) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
