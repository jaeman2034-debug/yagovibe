import fs from "fs";
import path from "path";

function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f.name)) out.push(p);
  }
  return out;
}

for (const p of [...walk("src/components/team"), ...walk("src/pages/teams")]) {
  const lines = fs.readFileSync(p, "utf8").split("\n");
  lines.forEach((l, i) => {
    if (!/[\uFFFD]/.test(l) && !/\?/.test(l)) return;
    if (l.includes("http") || l.includes("teamId") || l.includes("encodeURIComponent")) return;
    if (/^\s*\/\//.test(l) || /console\./.test(l)) return;
    if (/\? :|\?\?|`\$\{|searchParams|\.includes\(/.test(l)) return;
    if (/[\uFFFD]/.test(l) || (/>[^<]*\?/.test(l) && /["'`]/.test(l))) {
      console.log(`${p}:${i + 1}:${l.trim().slice(0, 100)}`);
    }
  });
}
