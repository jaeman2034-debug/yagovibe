import fs from "fs";
import path from "path";

/** AppShell 내부 팀 페이지: AppContent가 이미 px-3·md:max-w-3xl 제공 → 중복 셸 제거 */
const from = "w-full max-w-none px-3 md:mx-auto md:max-w-3xl";
const to = "w-full";

const fromPy6 = `${from} py-6`;
const toPy6 = "w-full py-6";

const fromP3 = `${from} p-3 md:p-6`;
const toP3 = "w-full p-0 md:p-6";

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

const root = path.join(process.cwd(), "src", "pages", "team");
let n = 0;
for (const file of walk(root)) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;
  for (const [a, b] of [
    [fromP3, toP3],
    [fromPy6, toPy6],
    [from, to],
    ["w-full max-w-none px-3 py-6 pb-24 md:mx-auto md:max-w-3xl", "w-full py-6 pb-24"],
    ["w-full max-w-none px-3 md:mx-auto md:max-w-3xl py-6", "w-full py-6"],
  ]) {
    if (src.includes(a)) src = src.split(a).join(b);
  }
  if (src !== orig) {
    fs.writeFileSync(file, src);
    n++;
    console.log("stripped", path.relative(process.cwd(), file));
  }
}
console.log("total", n);
