import fs from "fs";

const lines = fs.readFileSync("src/pages/teams/TeamPage.tsx", "utf8").split(/\n/);

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (
    l.includes("\uFFFD") ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(l) ||
    (l.includes("?") && /[가-힣]/.test(l) === false && /["'`>]/.test(l) && !l.includes("??") && !l.includes("?.") && !l.includes("?."))
  ) {
    continue;
  }
  if (l.includes("?") && /[A-Za-z]/.test(l) && /["'>]/.test(l)) {
    const q = (l.match(/\?/g) || []).length;
    if (q >= 2) console.log(`${i + 1}: ${l.trim().slice(0, 120)}`);
  }
}
