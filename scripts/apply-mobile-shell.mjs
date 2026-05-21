import fs from "fs";
import path from "path";

const SHELL = "w-full max-w-none px-3 md:mx-auto md:max-w-3xl";
const SHELL_4XL = "w-full max-w-none px-3 md:mx-auto md:max-w-4xl";
const SHELL_LG = "w-full max-w-none px-3 md:mx-auto md:max-w-lg";
const SHELL_2XL = "w-full max-w-none px-3 md:mx-auto md:max-w-2xl";
const SHELL_480 = "w-full max-w-none px-3 md:mx-auto md:max-w-[480px]";

const replacements = [
  ["max-w-md md:max-w-4xl mx-auto px-0 py-1", `${SHELL_4XL} py-1 px-0`],
  ["max-w-md md:max-w-4xl mx-auto p-3 md:p-4 space-y-2", `${SHELL_4XL} p-0 md:p-4 space-y-2`],
  ["max-w-md md:max-w-4xl mx-auto p-3 md:p-4", `${SHELL_4XL} p-0 md:p-4`],
  ["mx-auto w-full max-w-md px-4", SHELL],
  ["mx-auto max-w-md px-4", SHELL],
  ["container mx-auto px-4 py-6 max-w-md", `${SHELL} py-6`],
  ["mx-auto max-w-lg px-4", SHELL_LG],
  ["mx-auto max-w-2xl p-6", `${SHELL_2XL} p-3 md:p-6`],
  ["mx-auto max-w-[480px] px-4", SHELL_480],
  ["mx-auto max-w-4xl px-4 py-4", "w-full max-w-none px-3 py-4 md:mx-auto md:max-w-4xl"],
  ["mx-auto max-w-3xl px-4 py-6 pb-24", "w-full max-w-none px-3 py-6 pb-24 md:mx-auto md:max-w-3xl"],
  ["mx-auto max-w-3xl px-4 py-6", "w-full max-w-none px-3 py-6 md:mx-auto md:max-w-3xl"],
  ["mx-auto max-w-3xl", "w-full max-w-none px-3 md:mx-auto md:max-w-3xl"],
  ["max-w-md mx-auto p-6", `${SHELL} p-3 md:p-6`],
  ["max-w-md mx-auto", SHELL],
  ["w-full max-w-md", "w-full max-w-none md:max-w-3xl"],
  ["max-w-md w-full", "w-full max-w-none md:max-w-3xl"],
  ["text-center max-w-md", "w-full max-w-none text-center md:mx-auto md:max-w-3xl"],
  ["mx-auto max-w-md p-4", `${SHELL} md:p-4`],
  ["max-w-md mx-auto p-4", `${SHELL} md:p-4`],
  ["mx-auto max-w-[820px] px-4 py-4", "w-full max-w-none px-3 py-4 md:mx-auto md:max-w-[820px]"],
];

const skipDirs = new Set(["admin", "voice"]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (skipDirs.has(ent.name)) continue;
      walk(p, files);
    } else if (ent.name.endsWith(".tsx")) {
      files.push(p);
    }
  }
  return files;
}

const roots = [
  path.join(process.cwd(), "src", "pages"),
  path.join(process.cwd(), "src", "features"),
  path.join(process.cwd(), "src", "components"),
].filter((r) => fs.existsSync(r));

let changed = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    if (file.includes(`${path.sep}admin${path.sep}`)) continue;
    let src = fs.readFileSync(file, "utf8");
    const orig = src;
    for (const [from, to] of replacements) {
      if (src.includes(from)) src = src.split(from).join(to);
    }
    if (src !== orig) {
      fs.writeFileSync(file, src);
      changed++;
      console.log("updated", path.relative(process.cwd(), file));
    }
  }
}
console.log("total", changed);
