/**
 * Local QA — Team Hub wording → 팀 플레이 (no Production analysis)
 *   npx tsx scripts/vision-team-play-wording-local-qa.ts
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
const ACTOR_UID = "iUZB8RjKlEhb3uotZ6yqtpWtUQE2";
const BASE_OVERRIDE = (process.env.VISION_QA_BASE_URL || "").trim().replace(/\/$/, "");
const BASE = BASE_OVERRIDE || "http://127.0.0.1:5173";
const IS_PROD_SMOKE = BASE.includes("web.app") || BASE.includes("firebaseapp.com");
const OUT = join(
  root,
  "data/vision/report/engineering/production_ops/vision_team_play_wording_qa",
  IS_PROD_SMOKE ? "prod_smoke" : ""
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

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }
  const webConfig = loadWebConfig();
  const token = await admin.auth().createCustomToken(ACTOR_UID);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

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

  const detailUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;
  await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);

  const teamPlayNav = page.getByRole("link", { name: /^팀 플레이$/ }).first();
  const staleHubNav = page.getByRole("link", { name: /^팀 허브$/ });
  const backLink = page.getByRole("link", { name: /팀 플레이로 돌아가기/ });

  const navHref = (await teamPlayNav.count()) > 0 ? await teamPlayNav.getAttribute("href") : null;
  const expectedPath = `/teams/${TEAM_ID}/play?matchId=${MATCH_ID}`;

  const detailFacts = {
    detailUrl,
    teamPlayNavVisible: (await teamPlayNav.count()) > 0,
    staleHubNavCount: await staleHubNav.count(),
    navHref,
    routeTargetOk: Boolean(navHref && navHref.includes("/play") && navHref.includes(MATCH_ID)),
    backLinkOk: (await backLink.count()) > 0,
  };

  await page.screenshot({ path: join(OUT, "match_detail_nav.png"), fullPage: true });

  if (detailFacts.teamPlayNavVisible) {
    await teamPlayNav.click();
    await page.waitForTimeout(4000);
  }

  await page.evaluate(() => {
    for (const d of Array.from(document.querySelectorAll("details"))) {
      const t = d.querySelector("summary")?.textContent ?? "";
      if (t.includes("Vision Coach")) d.open = true;
    }
  });
  await page.waitForTimeout(1500);

  const playFacts = {
    finalUrl: page.url(),
    playLoungeOk: page.url().includes("/play"),
    matchIdPreserved: page.url().includes(MATCH_ID),
    visionMountSlot: (await page.getByTestId("play-tab-vision-mount-slot").count()) > 0,
    visionRunBtn: (await page.getByTestId("vision-run-analysis-button").count()) > 0,
    coachSection: (await page.getByTestId("coach-vision-analysis-section").count()) > 0,
  };
  await page.screenshot({ path: join(OUT, "play_after_nav.png"), fullPage: true });
  await browser.close();

  const report = {
    track: "TEAM_PLAY_WORDING_ALIGNMENT",
    expectedPath,
    detailFacts,
    playFacts,
    pass:
      detailFacts.teamPlayNavVisible &&
      detailFacts.staleHubNavCount === 0 &&
      detailFacts.routeTargetOk &&
      detailFacts.backLinkOk &&
      playFacts.playLoungeOk &&
      playFacts.matchIdPreserved &&
      playFacts.visionMountSlot &&
      playFacts.coachSection,
  };
  writeFileSync(join(OUT, "local_qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
