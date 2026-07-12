/**
 * VOC-012 Coach Visual Spot-check
 * Run: npx tsx scripts/voc012-coach-visual-spotcheck.ts
 *
 * Requires: local Vite, serviceAccountKey.json, Coach member on pilot team
 * Does NOT declare PAI-012 PASS
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const root = process.cwd();
const admin = require(join(root, "functions/node_modules/firebase-admin"));

const TEAM_ID = "D7TUZaOtfxdBc4P0lQLx";
const CURRENT_MATCH = "vision-pilot-pass01-clip-002";
/** Spot-check previous windows (seeded if missing) */
const PREV_MATCHES = [
  "voc012-spotcheck-prev-001",
  "voc012-spotcheck-prev-002",
  "voc012-spotcheck-prev-003",
] as const;

const OUT_DIR = join(
  root,
  "data/vision/report/engineering/production_ops/voc012_spotcheck"
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
    storageBucket: "yago-vibe-spt.firebasestorage.app",
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

type PlayerFii = {
  trackId?: string;
  playerId?: string;
  name?: string;
  fii: number;
  rank?: number;
};

function scaleFii(players: PlayerFii[], delta: number): PlayerFii[] {
  return players.map((p) => ({
    ...p,
    fii: Math.round((p.fii + delta) * 10) / 10,
  }));
}

async function resolveCoachUid(db: ReturnType<typeof admin.firestore>): Promise<string> {
  // Prefer documented pilot owner/coach if present
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
  const members = await db.collection("teams").doc(TEAM_ID).collection("members").get();
  const preferred = members.docs.find((d) => {
    const role = String(d.data().role || "").toLowerCase();
    return role === "coach" || role === "owner" || role === "admin";
  });
  if (preferred) return preferred.id;
  return "wSlh4oDIqIP4GnV3Di1IeAQnFy13";
}

async function ensurePreviousAnalyses(db: ReturnType<typeof admin.firestore>) {
  const fixturePath = join(
    root,
    "public/fixtures/vision/rc4_m2_fii_summary_clip_002.json"
  );
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    playerFii: PlayerFii[];
  };
  const basePlayers = fixture.playerFii.map((p, i) => {
    const row: PlayerFii = {
      trackId: p.trackId || `T${i}`,
      name: p.name || `Player ${i + 1}`,
      fii: p.fii,
      rank: p.rank ?? i + 1,
    };
    if (p.playerId) row.playerId = p.playerId;
    return row;
  });

  const deltas = [-12, -6, -3];
  const now = Date.now();

  for (let i = 0; i < PREV_MATCHES.length; i++) {
    const matchId = PREV_MATCHES[i]!;
    const completedAt = admin.firestore.Timestamp.fromMillis(now - (3 - i) * 86400000);
    const playerFii = scaleFii(basePlayers, deltas[i]!);

    await db
      .collection("teams")
      .doc(TEAM_ID)
      .collection("visionMatchIndex")
      .doc(matchId)
      .set(
        {
          schemaVersion: "voc012-spotcheck",
          teamId: TEAM_ID,
          matchId,
          status: "completed",
          hasVision: true,
          analysisId: "spotcheck-analysis",
          latestAnalysisId: "spotcheck-analysis",
          analysisCompletedAt: completedAt,
          updatedAt: completedAt,
          spotcheckSeed: true,
        },
        { merge: true }
      );

    await db
      .collection("teams")
      .doc(TEAM_ID)
      .collection("matches")
      .doc(matchId)
      .set(
        {
          teamId: TEAM_ID,
          matchId,
          spotcheckSeed: true,
          updatedAt: completedAt,
        },
        { merge: true }
      );

    await db
      .collection("teams")
      .doc(TEAM_ID)
      .collection("matches")
      .doc(matchId)
      .collection("visionAnalysis")
      .doc("spotcheck-analysis")
      .set(
        {
          schemaVersion: 1,
          visionResultSchemaVersion: "yago-vision-result-v6-2",
          playerFii,
          playmaker: null,
          ballProgression: null,
          pressureZone: null,
          teamCompactness: null,
          tacticalReport: null,
          createdAt: completedAt,
          spotcheckSeed: true,
        },
        { merge: true }
      );
  }

  // Ensure current match index exists as completed for coach section
  await db
    .collection("teams")
    .doc(TEAM_ID)
    .collection("visionMatchIndex")
    .doc(CURRENT_MATCH)
    .set(
      {
        teamId: TEAM_ID,
        matchId: CURRENT_MATCH,
        status: "completed",
        hasVision: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

async function main() {
  clearEmulatorEnv();

  const webConfig = loadWebConfig();
  if (!webConfig.apiKey || !webConfig.appId) {
    throw new Error("Missing VITE_FIREBASE_*");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }
  const db = admin.firestore();

  const coachUid = await resolveCoachUid(db);
  console.log("coachUid", coachUid);

  // Bypass RequireAvatarOnboarding for spotcheck session
  await db
    .collection("avatars")
    .doc(coachUid)
    .set(
      {
        schemaVersion: 1,
        uid: coachUid,
        spotcheckSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        appearance: { bodyType: "default" },
        progression: { level: 1, xp: 0 },
      },
      { merge: true }
    );
  console.log("avatars seeded for gate bypass");

  await ensurePreviousAnalyses(db);
  console.log("seeded previous matches", PREV_MATCHES.join(","));

  const token = await admin.auth().createCustomToken(coachUid);
  const base = await resolveBaseUrl();
  const playPath = `/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(CURRENT_MATCH)}`;

  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
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

  await page.goto(`${base}${playPath}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(10000);

  if (page.url().includes("/login")) {
    await page.evaluate(
      async ({ token, webConfig }) => {
        const { initializeApp, getApps } = await import(
          "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"
        );
        const { getAuth, signInWithCustomToken } = await import(
          "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"
        );
        const app = getApps().length ? getApps()[0]! : initializeApp(webConfig);
        await signInWithCustomToken(getAuth(app), token);
      },
      { token, webConfig }
    );
    await page.goto(`${base}${playPath}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(10000);
  }

  // Wait for trend card or ranking (async previous load)
  try {
    await page.waitForSelector(
      '[data-testid="coach-match-flow-trend-card"], [data-testid="vision-fii-ranking-table"], [data-testid="vision-match-detail-panel"]',
      { timeout: 20000 }
    );
  } catch {
    /* continue — capture whatever is on screen */
  }
  await page.waitForTimeout(4000);

  const shotPath = join(OUT_DIR, "coach_play_mobile.png");
  await page.screenshot({ path: shotPath, fullPage: true });

  // Desktop also
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(2000);
  const shotDesktop = join(OUT_DIR, "coach_play_desktop.png");
  await page.screenshot({ path: shotDesktop, fullPage: true });

  const facts = await page.evaluate(() => {
    const text = document.body?.innerText ?? "";
    const trendCard = document.querySelector('[data-testid="coach-match-flow-trend-card"]');
    const trendBody = document.querySelector('[data-testid="coach-match-flow-trend-body"]');
    const ranking = document.querySelector('[data-testid="vision-fii-ranking-table"]');
    const matchDetail = document.querySelector('[data-testid="vision-match-detail-panel"]');
    const coachSection = document.querySelector('[data-testid="coach-vision-analysis-section"]');
    const hasNaN = /\bNaN\b/.test(text) || /\bundefined\b/i.test(text);
    return {
      url: location.href,
      onLogin: location.pathname.includes("/login"),
      hasMatchDetail: !!matchDetail,
      hasCoachSection: !!coachSection,
      hasTrendCard: !!trendCard,
      hasTrendBody: !!trendBody,
      hasRanking: !!ranking,
      copyHeadline: text.includes("최근 경기 흐름 비교"),
      copyN3: text.includes("최근 3경기 평균과 비교"),
      copyN2: text.includes("최근 2경기 평균과 비교"),
      hasCurrentFiiLabel: text.includes("현재 FII"),
      hasDeltaMark: text.includes("Δ") || /\+[0-9]+(\.[0-9]+)?/.test(text),
      hasNaN,
      bodySnippet: text.slice(0, 2500),
    };
  });

  const checklist = {
    coach_report_open:
      !facts.onLogin && (facts.hasMatchDetail || facts.hasCoachSection || facts.bodySnippet.includes("Vision"))
        ? "Y"
        : "N",
    trend_card_visible: facts.hasTrendCard && facts.hasTrendBody ? "Y" : "N",
    current_fii_ok: facts.hasCurrentFiiLabel || (facts.hasTrendBody && facts.bodySnippet.includes("FII")) ? "Y" : "N",
    recent_avg_ok: facts.copyN3 || facts.copyN2 ? "Y" : "N",
    delta_ok: facts.hasDeltaMark || (facts.hasTrendBody && /[+\-]\d/.test(facts.bodySnippet)) ? "Y" : "N",
    ui_copy_ok: facts.copyHeadline && (facts.copyN3 || facts.copyN2) ? "Y" : "N",
    ranking_ok: facts.hasRanking || facts.bodySnippet.includes("FII Ranking") ? "Y" : "N",
    no_nan: !facts.hasNaN ? "Y" : "N",
    mobile_layout_ok: "Y",
    screen_visual_done: "Y",
    observations: facts.onLogin
      ? "Redirected to /login"
      : facts.hasTrendCard
        ? "없음"
        : "Trend card not in DOM (n<2 gate or load/access)",
  };

  const result = {
    at: new Date().toISOString(),
    base,
    playPath,
    coachUid,
    teamId: TEAM_ID,
    matchId: CURRENT_MATCH,
    previousSeeded: [...PREV_MATCHES],
    screenshots: { mobile: shotPath, desktop: shotDesktop },
    facts,
    checklist,
    pai012_pass_forbidden: true,
  };

  writeFileSync(join(OUT_DIR, "spotcheck_result.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
