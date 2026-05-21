/**
 * Firebase Functions 배포·에뮬레이터 시 CLI가 엔트리 모듈을 분석하는데,
 * 기본 10초 안에 로드가 끝나지 않으면 "Timeout after 10000 · Cannot determine backend specification" 이 난다.
 * (이 레포 `functions/lib/index.js` require만 해도 Windows에서 ~11초 이상 걸릴 수 있음.)
 *
 * FUNCTIONS_DISCOVERY_TIMEOUT(초)를 기본 120으로 올린 뒤 `firebase`를 실행한다.
 * ⚠️ `firebase deploy` / `firebase emulators:start`를 직접 치면 기본 10초라 동일 오류가 납니다.
 *
 * 사용:
 *   npm run deploy:functions
 *   npm run emulators        또는  npm run emulators:functions
 *   node scripts/deploy-functions.mjs deploy --only functions:xxx
 *
 * PowerShell에서 firebase만 쓸 때:
 *   $env:FUNCTIONS_DISCOVERY_TIMEOUT='120'; firebase emulators:start
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.FUNCTIONS_DISCOVERY_TIMEOUT) {
  process.env.FUNCTIONS_DISCOVERY_TIMEOUT = "120";
}

const extra = process.argv.slice(2);
const args = extra.length > 0 ? extra : ["deploy", "--only", "functions"];

const child = spawn("firebase", args, {
  stdio: "inherit",
  shell: true,
  cwd: rootDir,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code === null || code === undefined ? 1 : code);
});
