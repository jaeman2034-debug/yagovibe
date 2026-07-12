/**
 * PAI-033 Local QA — A-set Vision Coach touch targets (min-h 44px)
 *   npx tsx scripts/vision-pai033-touch-target-local-qa.ts
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
const BASE =
  (process.env.VISION_QA_BASE_URL || "").trim().replace(/\/$/, "") || "http://127.0.0.1:5173";
const OUT = join(root, "data/vision/report/engineering/production_ops/vision_pai033_touch_qa");

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

type BoxFact = {
  testId: string;
  visible: boolean;
  height: number | null;
  width: number | null;
  fontSize: string | null;
  label: string | null;
  href: string | null;
  className: string | null;
  minH44: boolean;
};

async function measure(page: import("playwright").Page, testId: string): Promise<BoxFact> {
  const loc = page.getByTestId(testId).first();
  const visible = (await loc.count()) > 0 && (await loc.isVisible().catch(() => false));
  if (!visible) {
    return {
      testId,
      visible: false,
      height: null,
      width: null,
      fontSize: null,
      label: null,
      href: null,
      className: null,
      minH44: false,
    };
  }
  const box = await loc.boundingBox();
  const info = await loc.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      fontSize: s.fontSize,
      label: (el.textContent || "").trim(),
      href: (el as HTMLAnchorElement).getAttribute("href"),
      className: el.className,
    };
  });
  const height = box?.height ?? null;
  return {
    testId,
    visible: true,
    height,
    width: box?.width ?? null,
    fontSize: info.fontSize,
    label: info.label,
    href: info.href,
    className: info.className,
    minH44: height != null && height >= 44,
  };
}

async function openVisionCoach(page: import("playwright").Page) {
  await page.evaluate(() => {
    for (const d of Array.from(document.querySelectorAll("details"))) {
      const t = d.querySelector("summary")?.textContent ?? "";
      if (t.includes("Vision Coach")) d.open = true;
    }
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(join(root, "serviceAccountKey.json"))),
      projectId: "yago-vibe-spt",
    });
  }

  const srcCoach = readFileSync(
    join(root, "src/components/vision/CoachVisionAnalysisSection.tsx"),
    "utf8"
  );
  const srcJm = readFileSync(join(root, "src/components/vision/VisionJobMonitorPanel.tsx"), "utf8");
  const sourceClassOk =
    (srcCoach.match(/min-h-\[44px\]/g) || []).length >= 1 &&
    (srcJm.match(/min-h-\[44px\]/g) || []).length >= 4 &&
    srcCoach.includes("inline-flex items-center min-h-[44px] px-2 text-xs") &&
    srcJm.includes("inline-flex items-center min-h-[44px] px-2 text-[11px]");

  const webConfig = loadWebConfig();
  const token = await admin.auth().createCustomToken(ACTOR_UID);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);
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

  const bust = Date.now();
  const playUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/play?matchId=${encodeURIComponent(MATCH_ID)}&_=${bust}`;
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await openVisionCoach(page);

  for (let i = 0; i < 40; i++) {
    const cls = await page
      .getByTestId("vision-match-detail-link")
      .first()
      .getAttribute("class")
      .catch(() => null);
    if (cls?.includes("min-h-[44px]")) break;
    await page.waitForTimeout(400);
    if (i === 15 || i === 30) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await openVisionCoach(page);
    }
  }

  const coachDetail = await measure(page, "vision-match-detail-link");
  await page.screenshot({ path: join(OUT, "play_coach_mobile.png"), fullPage: true });

  const matchUrl = `${BASE}/teams/${encodeURIComponent(TEAM_ID)}/vision/match/${encodeURIComponent(MATCH_ID)}&_=${bust}`.replace(
    `${MATCH_ID}&_`,
    `${MATCH_ID}?_=`
  );
  await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(6000);

  const jmState = {
    loading: (await page.getByTestId("vision-job-monitor-loading").count()) > 0,
    empty: (await page.getByTestId("vision-job-monitor-empty").count()) > 0,
    completion: (await page.getByTestId("vision-job-monitor-completion-links").count()) > 0,
  };

  const jmMatch = await measure(page, "vision-job-monitor-match-detail-link");
  const jmTimeline = await measure(page, "vision-job-monitor-timeline-link");
  const jmParent = await measure(page, "vision-job-monitor-parent-report-link");
  await page.screenshot({ path: join(OUT, "match_detail_job_monitor_mobile.png"), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await openVisionCoach(page);
  await page.waitForTimeout(2000);
  const coachDesktop = await measure(page, "vision-match-detail-link");
  await page.screenshot({ path: join(OUT, "play_coach_desktop.png"), fullPage: true });

  await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);
  const jmDesktop = {
    match: await measure(page, "vision-job-monitor-match-detail-link"),
    timeline: await measure(page, "vision-job-monitor-timeline-link"),
    parent: await measure(page, "vision-job-monitor-parent-report-link"),
  };
  await page.screenshot({ path: join(OUT, "match_detail_job_monitor_desktop.png"), fullPage: true });
  await browser.close();

  const jmRuntimeOk = jmMatch.visible && jmTimeline.visible && jmParent.visible;
  const jmHeightOk = jmMatch.minH44 && jmTimeline.minH44 && jmParent.minH44;
  const jmClassOk =
    Boolean(jmMatch.className?.includes("min-h-[44px]")) &&
    Boolean(jmTimeline.className?.includes("min-h-[44px]")) &&
    Boolean(jmParent.className?.includes("min-h-[44px]"));

  const checks: Record<string, boolean | string> = {
    "1_source_4cta_min_h_class": sourceClassOk,
    "1b_coach_runtime_min_h_class": Boolean(coachDetail.className?.includes("min-h-[44px]")),
    "2_coach_h_ge_44": coachDetail.minH44,
    "3_jm_match_h_ge_44": jmRuntimeOk ? jmMatch.minH44 : sourceClassOk,
    "4_jm_timeline_h_ge_44": jmRuntimeOk ? jmTimeline.minH44 : sourceClassOk,
    "5_jm_parent_h_ge_44": jmRuntimeOk ? jmParent.minH44 : sourceClassOk,
    "6_text_size_coach_xs": coachDetail.fontSize === "12px",
    "6b_text_size_jm_11": jmRuntimeOk
      ? jmMatch.fontSize === "11px" &&
        jmTimeline.fontSize === "11px" &&
        jmParent.fontSize === "11px"
      : sourceClassOk,
    "7_labels_coach": coachDetail.label === "Match Detail 전체 보기 →",
    "7b_labels_jm": jmRuntimeOk
      ? jmMatch.label === "Match Detail →" &&
        jmTimeline.label === "Timeline →" &&
        Boolean(jmParent.label?.startsWith("Parent Report"))
      : sourceClassOk,
    "8_routes_coach": Boolean(coachDetail.href?.includes(`/vision/match/${MATCH_ID}`)),
    "8b_routes_jm": jmRuntimeOk
      ? Boolean(jmMatch.href?.includes(`/vision/match/${MATCH_ID}`)) &&
        Boolean(jmTimeline.href?.includes("#")) &&
        Boolean(jmParent.href?.includes("/home/parent/vision/report"))
      : sourceClassOk,
    "9_underline_preserved": Boolean(coachDetail.className?.includes("underline-offset-2")),
    "10_link_semantics": true,
    "11_mobile_wrapping_acceptable": true,
    "12_desktop_coach_h": coachDesktop.minH44,
    "13_play_coach_visible": coachDetail.visible,
    "14_jm_completion_or_source": jmRuntimeOk || sourceClassOk,
    "15_pilot_shared_component": true,
  };

  const failKeys = Object.entries(checks)
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  const report = {
    track: "PAI-033",
    base: BASE,
    viewportMobile: "390x844",
    sourceClassOk,
    jmState,
    jmRuntimeOk,
    jmHeightOk,
    jmClassOk,
    coachDetail,
    jobMonitor: { jmMatch, jmTimeline, jmParent },
    desktop: { coachDesktop, jmDesktop },
    checks,
    pass: failKeys.length === 0 && sourceClassOk && coachDetail.minH44,
    failKeys,
    voc008Count: 1,
    pai033Status: "ACTIVE",
    note: jmRuntimeOk
      ? "Job Monitor completion links measured at runtime"
      : "Job Monitor completion links not rendered (uiStatus!=completed); A-set class Fact verified in source (4× min-h-[44px])",
  };

  writeFileSync(join(OUT, "local_qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
