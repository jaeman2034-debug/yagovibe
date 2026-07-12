/**
 * PAI-032 — Duplicate Nav Minimal Fix Local Browser QA
 * Run: npx tsx scripts/vision-pai032-duplicate-nav-local-qa.ts
 * No commit / deploy
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium, type Page } from "playwright";

const require = createRequire(import.meta.url);
const root = process.cwd();
const admin = require(join(root, "functions/node_modules/firebase-admin"));

const TEAM_ID = "D7TUZaOtfxdBc4P0lQLx";
const MATCH_ID = "vision-pilot-pass01-clip-002";
const CANONICAL_PLAYER = "player-ap-63d56190";
const TRACK_ONLY = "P0100";

const OUT_DIR = join(
  root,
  "data/vision/report/engineering/production_ops/vision_pai032_nav_qa"
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
  throw new Error("Vite not reachable");
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
  const parentUid = await resolveParentUid();
  await admin
    .firestore()
    .collection("avatars")
    .doc(parentUid)
    .set(
      {
        schemaVersion: 1,
        uid: parentUid,
        spotcheckSeed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        appearance: { bodyType: "default" },
        progression: { level: 1, xp: 0 },
      },
      { merge: true }
    );

  const token = await admin.auth().createCustomToken(parentUid);
  const base = await resolveBaseUrl();
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await signIn(page, base, token, webConfig);

  // Parent Report
  const reportQs = new URLSearchParams({
    teamId: TEAM_ID,
    playerId: CANONICAL_PLAYER,
    matchId: MATCH_ID,
  });
  await page.goto(`${base}/home/parent/vision/report?${reportQs}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(3000);
  if (page.url().includes("/login")) {
    await signIn(page, base, token, webConfig);
    await page.goto(`${base}/home/parent/vision/report?${reportQs}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(3000);
  }
  await page.waitForSelector('[data-testid="parent-vision-report-page"]', { timeout: 30000 });
  await page.waitForSelector('[data-testid="parent-intelligence-grid"]', { timeout: 30000 });

  const parentNavCount = await page.getByTestId("vision-platform-nav").count();
  const parentActive = await page
    .locator('[data-testid="vision-nav-parent-report"][aria-current="page"]')
    .count();
  const peerOk =
    (await page.getByTestId("parent-peer-benchmark-card").count()) > 0 ||
    (await page.locator("text=팀 평균과 비교").count()) > 0;
  const cardsOk = (await page.getByTestId("parent-intelligence-grid").count()) > 0;

  // Player tab guard: trackId context
  const trackQs = new URLSearchParams({
    teamId: TEAM_ID,
    playerId: TRACK_ONLY,
    matchId: MATCH_ID,
  });
  await page.goto(`${base}/home/parent/vision/report?${trackQs}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2000);
  await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 20000 });
  const playerTabHidden = (await page.getByTestId("vision-nav-player-profile").count()) === 0;
  const trackNavCount = await page.getByTestId("vision-platform-nav").count();

  // Growth Profile
  await page.goto(
    `${base}/home/parent/child/${encodeURIComponent(TEAM_ID)}/${encodeURIComponent(CANONICAL_PLAYER)}?matchId=${encodeURIComponent(MATCH_ID)}`,
    { waitUntil: "domcontentloaded", timeout: 90000 }
  );
  await page.waitForTimeout(3000);
  const growthDenied = (await page.getByText("이 선수 프로필에 접근할 수 없습니다").count()) > 0;
  let growthNavCount = 0;
  let growthActive = 0;
  let growthParentActive = 0;
  if (!growthDenied) {
    try {
      await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 15000 });
      growthNavCount = await page.getByTestId("vision-platform-nav").count();
      growthActive = await page
        .locator('[data-testid="vision-nav-player-profile"][aria-current="page"]')
        .count();
      growthParentActive = await page
        .locator('[data-testid="vision-nav-parent-report"][aria-current="page"]')
        .count();
    } catch {
      /* nav may be absent if no match intelligence */
    }
  }

  // Match Detail coach regression
  await page.goto(
    `${base}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`,
    { waitUntil: "domcontentloaded", timeout: 90000 }
  );
  await page.waitForTimeout(2500);
  let coachOk = false;
  try {
    await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 15000 });
    await page.getByTestId("vision-nav-coach").first().click();
    await page.waitForTimeout(600);
    coachOk = page.url().includes("#vision-coach");
  } catch {
    coachOk = false;
  }

  const fact = {
    base,
    ParentReport: {
      url: `${base}/home/parent/vision/report?${reportQs}`,
      navRenderCount: parentNavCount,
      navCountIsOne: yn(parentNavCount === 1),
      activeParentReport: yn(parentActive >= 1),
      peerBenchmark: yn(peerOk),
      intelligenceCards: yn(cardsOk),
    },
    PlayerTabGuard: {
      trackIdNavCount: trackNavCount,
      trackIdNavIsOne: yn(trackNavCount === 1),
      playerTabHidden: yn(playerTabHidden),
    },
    GrowthProfile: {
      accessDenied: yn(growthDenied),
      navRenderCount: growthNavCount,
      navCountIsOne: yn(growthNavCount === 1),
      activePlayerProfile: yn(growthActive >= 1),
      wrongActiveParentReport: yn(growthParentActive > 0),
    },
    Regression: {
      coachHash: yn(coachOk),
    },
    pageErrors,
  };

  writeFileSync(join(OUT_DIR, "local_browser_qa.json"), JSON.stringify(fact, null, 2), "utf8");
  await page.screenshot({ path: join(OUT_DIR, "parent_report.png"), fullPage: true });
  await browser.close();

  console.log("\n[PAI-032 Duplicate Nav — Local Browser QA]\n");
  console.log("Parent Report");
  console.log(`- Nav render count: ${fact.ParentReport.navRenderCount}`);
  console.log(`- Nav count === 1: ${fact.ParentReport.navCountIsOne}`);
  console.log(`- active parent-report: ${fact.ParentReport.activeParentReport}`);
  console.log(`- Peer Benchmark: ${fact.ParentReport.peerBenchmark}`);
  console.log(`- Intelligence cards: ${fact.ParentReport.intelligenceCards}`);
  console.log("\nPlayer Tab ID Guard");
  console.log(`- trackId context Nav count: ${fact.PlayerTabGuard.trackIdNavCount}`);
  console.log(`- Player tab hidden: ${fact.PlayerTabGuard.playerTabHidden}`);
  console.log("\nGrowth Profile");
  console.log(`- accessDenied: ${fact.GrowthProfile.accessDenied}`);
  console.log(`- Nav render count: ${fact.GrowthProfile.navRenderCount}`);
  console.log(`- Nav count === 1: ${fact.GrowthProfile.navCountIsOne}`);
  console.log(`- active player-profile: ${fact.GrowthProfile.activePlayerProfile}`);
  console.log(`- wrong active parent-report: ${fact.GrowthProfile.wrongActiveParentReport}`);
  console.log("\nRegression");
  console.log(`- Coach #vision-coach: ${fact.Regression.coachHash}`);
  console.log(`\n관측 오류: ${pageErrors.length ? pageErrors.join(" | ") : "없음"}`);
  console.log(`JSON: ${join(OUT_DIR, "local_browser_qa.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
