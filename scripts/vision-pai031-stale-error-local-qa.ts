/**
 * PAI-031 — Stale Job Monitor error Minimal Fix Local Browser QA
 * Run: npx tsx scripts/vision-pai031-stale-error-local-qa.ts
 * No commit / deploy / Production data write
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { resolveVisionJobMonitorErrors } from "../src/lib/vision/visionJobMonitorTypes";

const require = createRequire(import.meta.url);
const root = process.cwd();
const admin = require(join(root, "functions/node_modules/firebase-admin"));

const TEAM_ID = "D7TUZaOtfxdBc4P0lQLx";
const MATCH_ID = "vision-pilot-pass01-clip-002";

const OUT_DIR = join(
  root,
  "data/vision/report/engineering/production_ops/vision_pai031_stale_error_qa"
);

function loadWebConfig(): Record<string, string> {
  const { existsSync } = require("fs") as typeof import("fs");
  const pick = (file: string) => {
    if (!existsSync(file)) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "").trim();
    }
    return out;
  };
  const env = {
    ...pick(join(root, ".env.production")),
    ...pick(join(root, ".env.local")),
  };
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
    projectId: "yago-vibe-spt",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "yago-vibe-spt.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || "",
  };
}

async function resolveBaseUrl(): Promise<string> {
  // Local QA must hit Vite with the Minimal Fix — never Production Hosting.
  const forceLocal = (process.env.VISION_QA_FORCE_LOCAL || "1").trim() !== "0";
  if (!forceLocal) {
    const override = (process.env.VISION_QA_BASE_URL || "").trim().replace(/\/$/, "");
    if (override) return override;
  }
  for (const port of [5173, 5174, 5175, 5176]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok || res.status === 200) return `http://127.0.0.1:${port}`;
    } catch {
      /* next */
    }
  }
  throw new Error("Vite not reachable (VISION_QA_FORCE_LOCAL=1)");
}

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

async function resolveParentUid(): Promise<string> {
  try {
    const u = await admin.auth().getUserByEmail("parent.test@gmail.com");
    return u.uid;
  } catch {
    return "wSlh4oDIqIP4GnV3Di1IeAQnFy13";
  }
}

async function signIn(page: Page, base: string, token: string, webConfig: Record<string, string>) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.evaluate(
    async ({ token, webConfig }) => {
      const { initializeApp, getApps } = await import(
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"
      );
      const {
        getAuth,
        signInWithCustomToken,
        indexedDBLocalPersistence,
        setPersistence,
      } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
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

function yn(v: boolean): "Y" | "N" {
  return v ? "Y" : "N";
}

async function main() {
  clearEmulatorEnv();
  const webConfig = loadWebConfig();
  if (!webConfig.apiKey || !webConfig.appId) throw new Error("Missing VITE_FIREBASE_*");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }

  // Logic fixture: Production-like completed + stale index (no data write)
  const logicGuard = resolveVisionJobMonitorErrors({
    uiStatus: "completed",
    runErrorCode: null,
    runErrorMessage: null,
    indexErrorCode: "VISION_ANALYSIS_FAILED",
    indexErrorMessage:
      "no GEV events: /tmp/yago-worker/vision-1783164468430-e246e63c/tracking/gev_rc3_1_phase_c/gev_events.jsonl",
  });
  const failedFixture = resolveVisionJobMonitorErrors({
    uiStatus: "failed",
    runErrorCode: "VISION_ANALYSIS_FAILED",
    runErrorMessage: "no GEV events: /tmp/fail.jsonl",
    indexErrorCode: null,
    indexErrorMessage: null,
  });

  const parentUid = await resolveParentUid();
  const token = await admin.auth().createCustomToken(parentUid);
  const base = await resolveBaseUrl();
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await signIn(page, base, token, webConfig);

  const matchUrl = `${base}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;
  await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3500);
  if (page.url().includes("/login")) {
    await signIn(page, base, token, webConfig);
    await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(3500);
  }

  await page.waitForSelector('[data-testid="vision-job-monitor-panel"]', { timeout: 45000 });
  await page.waitForTimeout(2000);

  const errorBannerCount = await page.getByTestId("vision-job-monitor-error").count();
  const panels = page.getByTestId("vision-job-monitor-panel");
  const panelCount = await panels.count();
  let anyCompleted = false;
  let staleFailedCopyVisible = false;
  const panelDebug: Array<{ textSnippet: string }> = [];
  for (let i = 0; i < panelCount; i++) {
    const el = panels.nth(i);
    const panelText = ((await el.innerText()) || "").trim();
    panelDebug.push({
      textSnippet: panelText.slice(0, 160).replace(/\s+/g, " "),
    });
    if (panelText.includes("완료") || /completed/i.test(panelText)) anyCompleted = true;
    if (panelText.includes("VISION_ANALYSIS_FAILED") || panelText.includes("no GEV events")) {
      staleFailedCopyVisible = true;
    }
  }

  const teamFiiOk =
    (await page.getByTestId("vision-team-fii-card").count()) > 0 ||
    (await page.locator("text=TEAM FII").count()) > 0 ||
    (await page.locator("text=Football Intelligence Index").count()) > 0;
  const rankingOk =
    (await page.getByTestId("vision-fii-ranking-table").count()) > 0 ||
    (await page.locator("text=Top 3").count()) > 0 ||
    (await page.locator("text=P0100").count()) > 0;
  const trendOk =
    (await page.getByTestId("coach-match-flow-trend-card").count()) > 0 ||
    (await page.locator("text=최근 3경기").count()) > 0 ||
    (await page.locator("text=평균과 비교").count()) > 0;

  const fact = {
    base,
    matchUrl,
    matchId: MATCH_ID,
    LogicFixture: {
      completedStaleIndexBannerSuppressed: yn(
        logicGuard.errorCode == null && logicGuard.errorMessage == null
      ),
      failedRunBannerKept: yn(
        failedFixture.errorCode === "VISION_ANALYSIS_FAILED" &&
          Boolean(failedFixture.errorMessage)
      ),
    },
    MatchDetail: {
      jobMonitorPanel: yn(panelCount > 0),
      jobMonitorPanelCount: panelCount,
      completedVisible: yn(anyCompleted),
      errorBannerCount,
      staleErrorBannerHidden: yn(errorBannerCount === 0 && !staleFailedCopyVisible),
      panelDebug,
      teamFii: yn(teamFiiOk),
      ranking: yn(rankingOk),
      trend: yn(trendOk),
    },
    pageErrors,
  };

  writeFileSync(join(OUT_DIR, "local_browser_qa.json"), JSON.stringify(fact, null, 2), "utf8");
  await page.screenshot({ path: join(OUT_DIR, "match_detail_job_monitor.png"), fullPage: true });
  await browser.close();

  console.log("\n[PAI-031 Stale Error — Local Browser QA]\n");
  console.log("Logic fixture");
  console.log(
    `- completed+stale suppressed: ${fact.LogicFixture.completedStaleIndexBannerSuppressed}`
  );
  console.log(`- failed run kept: ${fact.LogicFixture.failedRunBannerKept}`);
  console.log("\nMatch Detail");
  console.log(`- Job Monitor panel: ${fact.MatchDetail.jobMonitorPanel}`);
  console.log(`- completed visible: ${fact.MatchDetail.completedVisible}`);
  console.log(`- error banner count: ${fact.MatchDetail.errorBannerCount}`);
  console.log(`- stale error banner hidden: ${fact.MatchDetail.staleErrorBannerHidden}`);
  console.log(`- Team FII: ${fact.MatchDetail.teamFii}`);
  console.log(`- Ranking: ${fact.MatchDetail.ranking}`);
  console.log(`- Trend: ${fact.MatchDetail.trend}`);
  console.log(`\n관측 오류: ${pageErrors.length ? pageErrors.join(" | ") : "없음"}`);
  console.log(`JSON: ${join(OUT_DIR, "local_browser_qa.json")}`);

  const pass =
    fact.LogicFixture.completedStaleIndexBannerSuppressed === "Y" &&
    fact.LogicFixture.failedRunBannerKept === "Y" &&
    fact.MatchDetail.staleErrorBannerHidden === "Y" &&
    fact.MatchDetail.completedVisible === "Y";
  if (!pass) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
