import fs from "fs";
import path from "path";

const wrong = "w-full max-w-none md:max-w-3xl";
const modal = "w-full max-w-md";

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

const hints = ["shadow-xl", "shadow-2xl", "max-h-[80vh]", "max-h-[90vh]", "rounded-lg shadow"];
let n = 0;
for (const file of walk(path.join(process.cwd(), "src"))) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(wrong)) continue;
  const isModal = hints.some((h) => src.includes(h) && src.includes(wrong));
  if (!isModal) continue;
  const orig = src;
  src = src.split(wrong).join(modal);
  if (src !== orig) {
    fs.writeFileSync(file, src);
    n++;
    console.log("reverted", path.relative(process.cwd(), file));
  }
}
console.log("total", n);
