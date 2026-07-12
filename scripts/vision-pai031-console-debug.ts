/**
 * Debug: Production validation-console accessibility for PAI-031 controlled upload
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

const TEAM = "D7TUZaOtfxdBc4P0lQLx";
const MATCH = "vision-pilot-pass01-clip-002";
const COACH = "jMLLIxyOVkN1HERAd2gz88uKj9e2";
const BASE = "https://yago-vibe-spt.web.app";
const OUT = join(
  root,
  "data/vision/report/engineering/production_ops/vision_pai031_controlled_validation"
);

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }
  const webConfig = loadWebConfig();
  const token = await admin.auth().createCustomToken(COACH);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
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
  const url = `${BASE}/teams/${encodeURIComponent(TEAM)}/validation-console?matchId=${encodeURIComponent(MATCH)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: join(OUT, "console_debug.png"), fullPage: true });
  const text = (await page.locator("body").innerText()).slice(0, 3000);
  const hasAnchor = (await page.locator("#academy-mp4-upload-anchor").count()) > 0;
  writeFileSync(
    join(OUT, "console_debug.json"),
    JSON.stringify({ url: page.url(), hasAnchor, text }, null, 2),
    "utf8"
  );
  console.log(JSON.stringify({ url: page.url(), hasAnchor, textPreview: text.slice(0, 600) }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
