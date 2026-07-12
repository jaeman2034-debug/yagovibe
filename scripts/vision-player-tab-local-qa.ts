/**
 * Player tab minimal fix — Local Browser QA (Case A / Case B)
 * Run: npx tsx scripts/vision-player-tab-local-qa.ts
 * No commit / deploy / PASS declaration
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
const TRACK_ONLY = "P0100";
const CANONICAL_PLAYER = "player-ap-63d56190";

const OUT_DIR = join(
  root,
  "data/vision/report/engineering/production_ops/vision_player_tab_qa"
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
  const override = (process.env.VISION_QA_BASE_URL || "").trim().replace(/\/$/, "");
  if (override) return override;
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

async function resolveParentUid(db: ReturnType<typeof admin.firestore>): Promise<string> {
  try {
    const u = await admin.auth().getUserByEmail("parent.test@gmail.com");
    return u.uid;
  } catch {
    /* fallback known pilot */
  }
  return "wSlh4oDIqIP4GnV3Di1IeAQnFy13";
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

function parentReportUrl(base: string, playerId: string): string {
  const q = new URLSearchParams({
    teamId: TEAM_ID,
    playerId,
    matchId: MATCH_ID,
  });
  return `${base}/home/parent/vision/report?${q.toString()}`;
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
  const db = admin.firestore();
  const parentUid = await resolveParentUid(db);
  await db
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

  // ─── CASE A: trackId only ───
  const caseAUrl = parentReportUrl(base, TRACK_ONLY);
  await page.goto(caseAUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  if (page.url().includes("/login")) {
    await signIn(page, base, token, webConfig);
    await page.goto(caseAUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(2000);
  }
  await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 30000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 30000 });

  const caseAUrlAfter = page.url();
  const caseAPlayerTabCount = await page.getByTestId("vision-nav-player-profile").count();
  const caseADenied = (await page.getByText("이 선수 프로필에 접근할 수 없습니다").count()) > 0;
  const caseAChildRoute = caseAUrlAfter.includes(`/home/parent/child/`) && caseAUrlAfter.includes(TRACK_ONLY);
  const caseAParentOk =
    caseAUrlAfter.includes("/home/parent/vision/report") &&
    caseAUrlAfter.includes(`playerId=${TRACK_ONLY}`) &&
    (await page.getByTestId("parent-vision-report-page").count()) > 0;

  // Peer benchmark card if present (non-blocking)
  const peerVisible =
    (await page.getByTestId("parent-peer-benchmark-card").count()) > 0 ||
    (await page.locator("text=팀 평균과 비교").count()) > 0 ||
    (await page.locator("text=또래").count()) > 0;

  // ─── CASE B: canonical playerId ───
  const caseBUrl = parentReportUrl(base, CANONICAL_PLAYER);
  await page.goto(caseBUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 30000 });

  const caseBUrlBeforeClick = page.url();
  const caseBPlayerTabCount = await page.getByTestId("vision-nav-player-profile").count();
  let caseBUrlAfterClick = "";
  let caseBProfileOk = false;
  let caseBDenied = false;

  if (caseBPlayerTabCount > 0) {
    await page.getByTestId("vision-nav-player-profile").first().click();
    await page.waitForTimeout(3000);
    caseBUrlAfterClick = page.url();
    caseBDenied = (await page.getByText("이 선수 프로필에 접근할 수 없습니다").count()) > 0;
    const onChild =
      caseBUrlAfterClick.includes(`/home/parent/child/`) &&
      caseBUrlAfterClick.includes(CANONICAL_PLAYER);
    caseBProfileOk = onChild && !caseBDenied;
  }

  // Quick regression: Match Detail Coach hash still works
  const matchPath = `/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;
  await page.goto(`${base}${matchPath}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  let matchNavOk = false;
  let matchPlayerHidden = false;
  try {
    await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 20000 });
    matchNavOk = true;
    matchPlayerHidden = (await page.getByTestId("vision-nav-player-profile").count()) === 0;
    await page.getByTestId("vision-nav-coach").click();
    await page.waitForTimeout(600);
  } catch {
    /* coach may need data */
  }
  const coachHashOk = page.url().includes("#vision-coach");

  const fact = {
    base,
    parentUid,
    CaseA: {
      url: caseAUrlAfter,
      playerIdContext: TRACK_ONLY,
      playerTabVisible: yn(caseAPlayerTabCount > 0),
      navigatedToChildP0100: yn(caseAChildRoute),
      accessDeniedShown: yn(caseADenied),
      parentReportOk: yn(caseAParentOk),
      peerBenchmarkVisible: yn(peerVisible),
    },
    CaseB: {
      urlBeforeClick: caseBUrlBeforeClick,
      playerIdContext: CANONICAL_PLAYER,
      playerTabVisible: yn(caseBPlayerTabCount > 0),
      urlAfterClick: caseBUrlAfterClick || "(no click — tab hidden)",
      profileOpenedOk: yn(caseBProfileOk),
      accessDeniedShown: yn(caseBDenied),
    },
    Regression: {
      matchDetailNav: yn(matchNavOk),
      matchDetailPlayerTabHiddenForTrackRanking: yn(matchPlayerHidden),
      coachHashRouting: yn(coachHashOk),
    },
    pageErrors,
  };

  writeFileSync(join(OUT_DIR, "local_browser_qa.json"), JSON.stringify(fact, null, 2), "utf8");
  await page.screenshot({ path: join(OUT_DIR, "case_b_after.png"), fullPage: true });
  await browser.close();

  console.log("\n[Player Tab Minimal Fix — Local Browser QA]\n");
  console.log("CASE A — trackId only (P0100)");
  console.log(`- 실제 URL: ${fact.CaseA.url}`);
  console.log(`- Player 탭 노출: ${fact.CaseA.playerTabVisible}`);
  console.log(`- /home/parent/child/.../P0100 이동: ${fact.CaseA.navigatedToChildP0100}`);
  console.log(`- 접근 거부 화면: ${fact.CaseA.accessDeniedShown}`);
  console.log(`- Parent Report 정상: ${fact.CaseA.parentReportOk}`);
  console.log(`- Peer Benchmark 관측: ${fact.CaseA.peerBenchmarkVisible}`);
  console.log("\nCASE B — canonical playerId");
  console.log(`- 실제 URL (클릭 전): ${fact.CaseB.urlBeforeClick}`);
  console.log(`- Player 탭 노출: ${fact.CaseB.playerTabVisible}`);
  console.log(`- 클릭 후 URL: ${fact.CaseB.urlAfterClick}`);
  console.log(`- 프로필 열람(접근 거부 없음): ${fact.CaseB.profileOpenedOk}`);
  console.log(`- 접근 거부 화면: ${fact.CaseB.accessDeniedShown}`);
  console.log("\nREGRESSION");
  console.log(`- Match Detail nav: ${fact.Regression.matchDetailNav}`);
  console.log(`- Match Detail Player 숨김(track ranking): ${fact.Regression.matchDetailPlayerTabHiddenForTrackRanking}`);
  console.log(`- Coach #vision-coach: ${fact.Regression.coachHashRouting}`);
  console.log(`\n관측 오류: ${pageErrors.length ? pageErrors.join(" | ") : "없음"}`);
  console.log(`JSON: ${join(OUT_DIR, "local_browser_qa.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
