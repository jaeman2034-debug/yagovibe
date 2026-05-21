/**
 * 과거: `functions-repair` 전용 코드베이스만 배포.
 * 현재: `repairTeamMembersSoTFromIndex`는 메인 `functions` 번들에 포함되므로
 * 기본 functions 배포와 동일하게 동작합니다.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.FUNCTIONS_DISCOVERY_TIMEOUT = process.env.FUNCTIONS_DISCOVERY_TIMEOUT || "120";

// eslint-disable-next-line no-console
console.log(
  "[deploy-functions-repair] repairTeamMembersSoTFromIndex → 메인 functions 번들. firebase deploy --only functions:default 실행…"
);

const r = spawnSync(
  "npx",
  ["firebase", "deploy", "--only", "functions:default", "--non-interactive"],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
  }
);
process.exit(r.status ?? 1);
