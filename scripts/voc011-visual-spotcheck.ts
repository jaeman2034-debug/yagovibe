/**
 * VOC-011 Parent Visual Spot-check (mobile viewport)
 * Run: npx tsx scripts/voc011-visual-spotcheck.ts
 *
 * Requires: local Vite (5173/5174), serviceAccountKey.json, network to Firebase Auth
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const root = process.cwd();
const admin = require(join(root, "functions/node_modules/firebase-admin"));

const PARENT_UID = "wSlh4oDIqIP4GnV3Di1IeAQnFy13";
const TEAM_ID = "D7TUZaOtfxdBc4P0lQLx";
const PLAYER_ID = "player-ap-63d56190";
const MATCH_ID = "vision-pilot-pass01-clip-002";

const OUT_DIR = join(root, "data/vision/report/engineering/production_ops/voc011_spotcheck");

function loadWebConfig(): Record<string, string> {
  const envPath = join(root, ".env.production");
  const localPath = join(root, ".env.local");
  const { readFileSync, existsSync } = require("fs") as typeof import("fs");
  const pick = (file: string) => {
    if (!existsSync(file)) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "").trim();
    }
    return out;
  };
  const env = { ...pick(envPath), ...pick(localPath) };
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
  for (const port of [5174, 5173, 5175]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status === 200) return `http://127.0.0.1:${port}`;
    } catch {
      /* try next */
    }
  }
  throw new Error("Vite dev server not reachable on 5173/5174/5175");
}

async function main() {
  for (const key of [
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_FIRESTORE_EMULATOR_HOST",
    "FIREBASE_AUTH_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
  ]) {
    delete process.env[key];
  }

  const webConfig = loadWebConfig();
  if (!webConfig.apiKey || !webConfig.appId) {
    throw new Error("Missing VITE_FIREBASE_* in .env.production / .env.local");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }

  const token = await admin.auth().createCustomToken(PARENT_UID);
  const base = await resolveBaseUrl();
  const reportPath =
    `/home/parent/vision/report?teamId=${encodeURIComponent(TEAM_ID)}` +
    `&playerId=${encodeURIComponent(PLAYER_ID)}` +
    `&matchId=${encodeURIComponent(MATCH_ID)}` +
    `&playerName=${encodeURIComponent("Pilot Child")}`;

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

  // Land first so origin matches persistence
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
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
      const cred = await signInWithCustomToken(auth, token);
      (window as unknown as { __voc011Uid?: string }).__voc011Uid = cred.user.uid;
    },
    { token, webConfig }
  );

  // Hard reload so AuthProvider picks persistence
  await page.goto(`${base}${reportPath}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);

  // If redirected to login, retry once after another sign-in
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
    await page.goto(`${base}${reportPath}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(7000);
  }

  const shotPath = join(OUT_DIR, "parent_report_mobile.png");
  await page.screenshot({ path: shotPath, fullPage: true });

  const facts = await page.evaluate(() => {
    const text = document.body?.innerText ?? "";
    const peerCard = document.querySelector('[data-testid="parent-peer-benchmark-card"]');
    const peerBody = document.querySelector('[data-testid="parent-peer-benchmark-body"]');
    const reportPage = document.querySelector('[data-testid="parent-vision-report-page"]');
    const session = document.querySelector('[data-testid="parent-session-summary-card"]');
    const hasNaN = /\bNaN\b/.test(text) || text.includes("undefined");
    const copyPrimary = text.includes("같은 팀·연령 선수 평균과 비교");
    const copyFallback = text.includes("팀 평균과 비교");
    const childLabel = text.includes("우리 아이");
    const peerAvgLabel = text.includes("또래 평균");
    return {
      url: location.href,
      title: document.title,
      hasReportPage: !!reportPage,
      hasPeerCard: !!peerCard,
      hasPeerBody: !!peerBody,
      copyPrimary,
      copyFallback,
      childLabel,
      peerAvgLabel,
      hasNaN,
      hasSessionSummary: !!session || text.includes("경기 요약"),
      onLogin: location.pathname.includes("/login"),
      bodySnippet: text.slice(0, 1200),
    };
  });

  const checklist = {
    "1_parent_report_open": !facts.onLogin && facts.hasReportPage ? "Y" : "N",
    "2_peer_card_visible": facts.hasPeerCard && facts.hasPeerBody ? "Y" : "N",
    "3_ui_copy_ok": facts.copyPrimary || facts.copyFallback ? "Y" : "N",
    "4_child_fii_shown": facts.childLabel && facts.hasPeerBody ? "Y" : "N",
    "5_peer_mean_shown": facts.peerAvgLabel && facts.hasPeerBody ? "Y" : "N",
    "6_no_nan_empty_card": !facts.hasNaN && !(facts.hasPeerCard && !facts.hasPeerBody) ? "Y" : "N",
    "7_fii_summary_ok": facts.hasSessionSummary || facts.bodySnippet.includes("성장") ? "Y" : "N",
    "8_mobile_layout_ok": "PENDING_VISUAL",
    screen_visual_done: "Y",
    observations: facts.onLogin
      ? "Redirected to /login — session did not stick"
      : facts.hasPeerCard
        ? "없음"
        : "Peer card not in DOM (possible n<5 or load empty)",
  };

  const result = {
    at: new Date().toISOString(),
    base,
    reportPath,
    parentUid: PARENT_UID,
    screenshot: shotPath,
    facts,
    checklist,
  };

  writeFileSync(join(OUT_DIR, "spotcheck_result.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
