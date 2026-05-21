import fs from "fs";
import path from "path";

const SHELL = "w-full max-w-none md:mx-auto md:max-w-3xl";
const SHELL_4XL = "w-full max-w-none md:mx-auto md:max-w-4xl";
const SHELL_5XL = "w-full max-w-none md:mx-auto md:max-w-5xl";
const SHELL_6XL = "w-full max-w-none md:mx-auto md:max-w-6xl";
const SHELL_2XL = "w-full max-w-none md:mx-auto md:max-w-2xl";
const SHELL_LG = "w-full max-w-none md:mx-auto md:max-w-lg";

const replacements = [
  ["container mx-auto px-4 py-6 max-w-4xl", `${SHELL_4XL} py-6`],
  ["container mx-auto px-4 py-6 max-w-6xl", `${SHELL_6XL} py-6`],
  ["container mx-auto px-4 py-6 max-w-2xl", `${SHELL_2XL} py-6`],
  ["container mx-auto px-4 py-6 max-w-5xl", `${SHELL_5XL} py-6`],
  ["container mx-auto px-4 py-4", `${SHELL} py-4`],
  ["container mx-auto px-4 py-6", `${SHELL} py-6`],
  ["max-w-4xl mx-auto px-4 py-6", `${SHELL_4XL} py-6`],
  ["max-w-5xl mx-auto p-6", `${SHELL_5XL} py-6 md:p-6`],
  ["max-w-5xl mx-auto px-4 py-6", `${SHELL_5XL} py-6`],
  ["max-w-6xl mx-auto p-6", `${SHELL_6XL} py-6 md:p-6`],
  ["max-w-2xl mx-auto p-6", `${SHELL_2XL} py-6 md:p-6`],
  ["max-w-4xl mx-auto p-6", `${SHELL_4XL} py-6 md:p-6`],
  ["mx-auto w-full max-w-3xl pb-8", "w-full pb-8"],
  ["mx-auto w-full max-w-3xl space-y-4 px-4 py-4", "w-full space-y-4 py-4"],
  ["mx-auto w-full max-w-5xl space-y-4 px-4 py-4", `${SHELL_5XL} space-y-4 py-4`],
  ["mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3", "flex w-full flex-wrap items-center gap-x-3 gap-y-2 py-3"],
  ["min-h-screen bg-gray-50 px-4 py-10", "min-h-screen bg-gray-50 px-3 py-10"],
  ["min-h-screen bg-gray-50 px-4 py-8", "min-h-screen bg-gray-50 px-3 py-8"],
  ["w-full max-w-md text-center", "w-full max-w-none text-center md:max-w-md"],
  ["max-w-md w-full text-center", "w-full max-w-none text-center md:max-w-md"],
];

const teamRoots = [
  path.join(process.cwd(), "src", "pages", "team"),
  path.join(process.cwd(), "src", "pages", "teams"),
  path.join(process.cwd(), "src", "components", "team"),
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

let changed = 0;
for (const root of teamRoots) {
  for (const file of walk(root)) {
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
