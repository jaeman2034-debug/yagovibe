/**
 * VISION_START Product Entry — Local Browser QA (wiring only)
 * Does NOT run Production Vision analysis (CF calls intercepted).
 *
 *   npx tsx scripts/vision-start-product-entry-local-qa.ts
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
const BASE = "http://127.0.0.1:5173";
const OUT = join(
  root,
  "data/vision/report/engineering/production_ops/vision_start_product_entry"
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

  const beforeRuns = await db
    .collection(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}/visionRuns`)
    .limit(5)
    .get();
  const runCountBefore = beforeRuns.size;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const callableHits: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.includes("cloudfunctions.net") || url.includes("cloudfunctions")) {
      const name =
        url.includes("startVisionAnalysis")
          ? "startVisionAnalysis"
          : url.includes("retryVisionAnalysis")
            ? "retryVisionAnalysis"
            : url.includes("processVisionUploadQueue")
              ? "processVisionUploadQueue"
              : url.includes("cancelVisionAnalysis")
                ? "cancelVisionAnalysis"
                : "otherCallable";
      if (
        name === "startVisionAnalysis" ||
        name === "retryVisionAnalysis" ||
        name === "processVisionUploadQueue"
      ) {
        callableHits.push(name);
        // Block real Production analysis — wiring probe only
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              ok: true,
              status: "idempotent",
              teamId: TEAM_ID,
              mediaId: MEDIA_ID,
              runId: "local-qa-stub",
              matchId: MATCH_ID,
              pipelineElapsedMs: 0,
              idempotent: true,
            },
          }),
        });
        return;
      }
    }
    await route.continue();
  });

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

  const playUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/play?matchId=${encodeURIComponent(MATCH_ID)}`;
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(5000);

  // Force-open Vision Coach <details> accordion
  await page.evaluate(() => {
    for (const d of Array.from(document.querySelectorAll("details"))) {
      const t = d.querySelector("summary")?.textContent ?? "";
      if (t.includes("Vision Coach")) d.open = true;
    }
  });
  await page.waitForTimeout(1500);

  const slot = page.getByTestId("play-tab-vision-mount-slot");
  const coachSection = page.getByTestId("coach-vision-analysis-section");
  const runBtn = page.getByTestId("vision-run-analysis-button").first();
  const matchDetailLink = page.getByRole("link", { name: /팀 프로필|팀 홈/i }).first();

  const facts = {
    observedAtKst: kstNow(),
    playUrl,
    finalUrl: page.url(),
    matchIdPreserved: page.url().includes(MATCH_ID),
    slotCount: await slot.count(),
    slotVisible: (await slot.count()) > 0,
    coachSectionVisible: (await coachSection.count()) > 0,
    runButtonCount: await page.getByTestId("vision-run-analysis-button").count(),
    runButtonVisible: (await runBtn.count()) > 0 && (await runBtn.isVisible().catch(() => false)),
    runButtonAttached: (await runBtn.count()) > 0,
    runButtonText: (await runBtn.count()) > 0 ? await runBtn.innerText() : null,
    playLoungeStillPresent: (await page.getByText("내 선수 카드").count()) > 0,
  };

  await page.screenshot({ path: join(OUT, "local_qa_play_tab.png"), fullPage: true });

  let clickWiring: Record<string, unknown> | null = null;
  if (facts.runButtonAttached) {
    await runBtn.click({ force: true });
    await page.waitForTimeout(2500);
    clickWiring = {
      callableHits: [...callableHits],
      calledStartVisionAnalysis: callableHits.includes("startVisionAnalysis"),
      calledRetryVisionAnalysis: callableHits.includes("retryVisionAnalysis"),
      calledProcessVisionUploadQueue: callableHits.includes("processVisionUploadQueue"),
      note: "CF responses stubbed — no Production analysis executed",
    };
  }

  const afterRuns = await db
    .collection(`teams/${TEAM_ID}/aiIngest/${MEDIA_ID}/visionRuns`)
    .limit(5)
    .get();
  const runCountAfter = afterRuns.size;

  // Vision Match Detail regression smoke (no VisionRunControl expected; Job Monitor ok)
  const detailUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;
  await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(3000);
  const detailFacts = {
    detailUrl,
    matchDetailPanel: (await page.getByTestId("vision-match-detail-panel").count()) > 0,
    jobMonitorPresent:
      (await page.getByTestId("vision-job-monitor-panel").count()) > 0 ||
      (await page.getByTestId("vision-job-monitor-empty").count()) > 0 ||
      (await page.getByTestId("vision-job-monitor-loading").count()) > 0,
    unintendedPlayRedirect: page.url().includes("/play"),
  };
  await page.screenshot({ path: join(OUT, "local_qa_match_detail.png"), fullPage: true });

  const report = {
    track: "VISION_START_PRODUCT_ENTRY",
    notPai031Fix: true,
    localQa: {
      ...facts,
      clickWiring,
      runCountBefore,
      runCountAfter,
      visionRunsUnchanged: runCountBefore === runCountAfter,
      detailFacts,
      matchDetailLinkProbe: (await matchDetailLink.count()) >= 0,
    },
  };
  writeFileSync(join(OUT, "local_browser_qa_fact.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();

  const pass =
    facts.matchIdPreserved &&
    facts.slotVisible &&
    facts.coachSectionVisible &&
    facts.runButtonAttached &&
    facts.playLoungeStillPresent &&
    runCountBefore === runCountAfter &&
    detailFacts.matchDetailPanel &&
    !detailFacts.unintendedPlayRedirect &&
    (clickWiring == null ||
      (Boolean(clickWiring.calledStartVisionAnalysis || clickWiring.calledRetryVisionAnalysis) &&
        !clickWiring.calledProcessVisionUploadQueue));

  if (!pass) {
    console.error("LOCAL QA FAIL");
    process.exit(1);
  }
  console.log("LOCAL QA PASS (wiring only)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
