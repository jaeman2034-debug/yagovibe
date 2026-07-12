/**
 * Vision Match Detail tab routing — Local Browser QA (click facts)
 * Run: npx tsx scripts/vision-tab-routing-local-qa.ts
 * Does NOT commit / PASS / deploy
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
const MATCH_PATH = `/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}`;

const OUT_DIR = join(
  root,
  "data/vision/report/engineering/production_ops/vision_tab_routing_qa"
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
  throw new Error("Vite not reachable on 5173–5176");
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

async function resolveCoachUid(db: ReturnType<typeof admin.firestore>): Promise<string> {
  const preferredUids = [
    "wSlh4oDIqIP4GnV3Di1IeAQnFy13",
    "jMLLIxyOVkN1HERAd2gz88uKj9e2",
    "3kSHZQJRt9NrE1uzQcBQ82piDh62",
  ];
  for (const uid of preferredUids) {
    const snap = await db.collection("teams").doc(TEAM_ID).collection("members").doc(uid).get();
    if (snap.exists) return uid;
  }
  const team = await db.collection("teams").doc(TEAM_ID).get();
  const owner =
    (team.data()?.ownerUid as string | undefined) ||
    (team.data()?.ownerUserId as string | undefined);
  if (owner) return owner;
  return preferredUids[0]!;
}

async function signIn(page: Page, token: string, webConfig: Record<string, string>) {
  await page.goto(`${await resolveBaseUrl()}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
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

async function sectionInViewport(page: Page, id: string): Promise<boolean> {
  return page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // section top near viewport (scrollIntoView start)
    return r.top < vh * 0.55 && r.bottom > 40;
  }, id);
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
  const coachUid = await resolveCoachUid(db);
  await db
    .collection("avatars")
    .doc(coachUid)
    .set(
      {
        schemaVersion: 1,
        uid: coachUid,
        spotcheckSeed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        appearance: { bodyType: "default" },
        progression: { level: 1, xp: 0 },
      },
      { merge: true }
    );

  const token = await admin.auth().createCustomToken(coachUid);
  const base = await resolveBaseUrl();
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await signIn(page, token, webConfig);
  await page.goto(`${base}${MATCH_PATH}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  if (page.url().includes("/login")) {
    await signIn(page, token, webConfig);
    await page.goto(`${base}${MATCH_PATH}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(3000);
  }

  await page.waitForSelector('[data-testid="vision-platform-nav"]', { timeout: 30000 });
  await page.waitForSelector('[data-testid="vision-match-detail-panel"]', { timeout: 30000 });
  // wait ranking so Parent gets playerId
  try {
    await page.waitForSelector('[data-testid="vision-fii-ranking-table"]', { timeout: 20000 });
  } catch {
    /* may still resolve from view */
  }
  await page.waitForTimeout(2000);

  const startUrl = page.url();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // --- Coach ---
  await page.getByTestId("vision-nav-coach").click();
  await page.waitForTimeout(800);
  const coachUrl = page.url();
  const coachHashEl = await page.locator("#vision-coach").count();
  const coachMoved = await sectionInViewport(page, "vision-coach");
  const coachPlay = coachUrl.includes("/play");

  // --- Match ---
  await page.getByTestId("vision-nav-match-detail").click();
  await page.waitForTimeout(800);
  const matchUrl = page.url();
  const matchHashCleared = !matchUrl.includes("#");
  const matchOk =
    matchUrl.includes(`/vision/match/${MATCH_ID}`) &&
    !matchUrl.includes("/play") &&
    (await page.getByTestId("vision-match-detail-panel").count()) > 0;

  // --- Timeline ---
  await page.getByTestId("vision-nav-timeline").click();
  await page.waitForTimeout(800);
  const timelineUrl = page.url();
  const timelineHashEl = await page.locator("#vision-timeline").count();
  const timelineMoved = await sectionInViewport(page, "vision-timeline");

  // --- Parent ---
  const parentNav = page.getByTestId("vision-nav-parent-report");
  const parentDisabled = (await parentNav.getAttribute("aria-disabled")) === "true";
  let parentUrl = "";
  let parentTeam = false;
  let parentPlayer = false;
  let parentMatch = false;
  let parentReportOk = false;
  let parentAdmin = false;

  if (parentDisabled) {
    parentUrl = "(disabled — no playerId)";
  } else {
    await parentNav.click();
    await page.waitForTimeout(2500);
    parentUrl = page.url();
    const u = new URL(parentUrl);
    parentTeam = u.searchParams.get("teamId") === TEAM_ID;
    parentPlayer = Boolean(u.searchParams.get("playerId")?.trim());
    parentMatch = u.searchParams.get("matchId") === MATCH_ID;
    parentAdmin = u.pathname.includes("/home/admin");
    parentReportOk =
      u.pathname.includes("/home/parent/vision/report") &&
      parentTeam &&
      parentPlayer &&
      parentMatch &&
      !parentAdmin;
    // confirm report surface or empty-state still on report route
    const onReport =
      (await page.getByTestId("parent-vision-report-page").count()) > 0 ||
      parentUrl.includes("/home/parent/vision/report");
    parentReportOk = parentReportOk && onReport;
  }

  const fact = {
    source: MATCH_PATH,
    startUrl,
    base,
    coachUid,
    Coach: {
      urlAfterClick: coachUrl,
      visionCoachExists: yn(coachHashEl > 0),
      scrolledToCoachSection: yn(coachMoved),
      enteredPlayLounge: yn(coachPlay),
    },
    Match: {
      urlAfterClick: matchUrl,
      hashCleared: yn(matchHashCleared),
      matchDetailOk: yn(matchOk),
    },
    Timeline: {
      urlAfterClick: timelineUrl,
      visionTimelineExists: yn(timelineHashEl > 0),
      scrolledToTimelineSection: yn(timelineMoved),
    },
    Parent: {
      urlAfterClick: parentUrl,
      disabled: parentDisabled,
      teamIdPreserved: yn(parentTeam),
      playerIdPreserved: yn(parentPlayer),
      matchIdPreserved: yn(parentMatch),
      parentReportOk: yn(parentReportOk),
      homeAdminRedirect: yn(parentAdmin),
    },
    pageErrors: errors,
  };

  writeFileSync(join(OUT_DIR, "local_browser_qa.json"), JSON.stringify(fact, null, 2), "utf8");
  await page.screenshot({ path: join(OUT_DIR, "after_parent.png"), fullPage: true });
  await browser.close();

  console.log("\n[Vision Tab Routing Local Browser QA]\n");
  console.log("Coach");
  console.log(`- 클릭 후 URL: ${fact.Coach.urlAfterClick}`);
  console.log(`- #vision-coach 존재: ${fact.Coach.visionCoachExists}`);
  console.log(`- Coach 섹션으로 실제 이동: ${fact.Coach.scrolledToCoachSection}`);
  console.log(`- Play Lounge 진입: ${fact.Coach.enteredPlayLounge}`);
  console.log("\nMatch");
  console.log(`- 클릭 후 URL: ${fact.Match.urlAfterClick}`);
  console.log(`- hash 제거: ${fact.Match.hashCleared}`);
  console.log(`- Match Detail 정상: ${fact.Match.matchDetailOk}`);
  console.log("\nTimeline");
  console.log(`- 클릭 후 URL: ${fact.Timeline.urlAfterClick}`);
  console.log(`- #vision-timeline 존재: ${fact.Timeline.visionTimelineExists}`);
  console.log(`- Timeline 섹션으로 실제 이동: ${fact.Timeline.scrolledToTimelineSection}`);
  console.log("\nParent");
  console.log(`- 클릭 후 URL: ${fact.Parent.urlAfterClick}`);
  console.log(`- teamId 보존: ${fact.Parent.teamIdPreserved}`);
  console.log(`- playerId 보존: ${fact.Parent.playerIdPreserved}`);
  console.log(`- matchId 보존: ${fact.Parent.matchIdPreserved}`);
  console.log(`- Parent Vision Report 정상 열람: ${fact.Parent.parentReportOk}`);
  console.log(`- /home/admin redirect: ${fact.Parent.homeAdminRedirect}`);
  console.log(`\n관측 오류: ${errors.length ? errors.join(" | ") : "없음"}`);
  console.log(`\nJSON: ${join(OUT_DIR, "local_browser_qa.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
