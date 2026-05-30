/**
 * G2 automated slice — URL validation logic (browser QA는 별도)
 * Run: node scripts/smoke-g2-team-ai-analysis-lite.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// tsx 없이 순수 로직 복제 (teamAiAnalysisLite.ts 와 동일)
const YOUTUBE_ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

function isValidYoutubeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return YOUTUBE_ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
}

const cases = [
  ["https://naver.com", false],
  ["https://www.naver.com", false],
  ["http://naver.com", false],
  ["https://www.youtube.com/watch?v=test", true],
  ["https://youtu.be/jNQXAC9IVRw", true],
  ["https://m.youtube.com/watch?v=x", true],
  ["", false],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = isValidYoutubeUrl(input);
  if (got !== expected) {
    failed += 1;
    console.error("FAIL", { input, got, expected });
  }
}

if (failed === 0) {
  console.log("G2-1 URL validation: PASS (" + cases.length + " cases)");
  process.exit(0);
}

console.error("G2-1 URL validation: FAIL (" + failed + " cases)");
process.exit(1);
