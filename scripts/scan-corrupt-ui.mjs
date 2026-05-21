import fs from "fs";

const lines = fs.readFileSync("src/pages/teams/TeamPage.tsx", "utf8").split("\n");

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes("\uFFFD") || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(l)) {
    console.log(`${i + 1}: ${l.trim().slice(0, 100)}`);
    continue;
  }
  // suspicious: has ? but not ?. ?? ?: ?) ?,
  if (l.includes("?") && !/\?\.|\?\?|\?:|\?\)|\?,|\? \?|\?;/.test(l)) {
    if (/["'`>].*\?|^\s*\?/.test(l) || /AI\?|>\?/.test(l)) {
      console.log(`${i + 1}: ${l.trim().slice(0, 100)}`);
    }
  }
}
