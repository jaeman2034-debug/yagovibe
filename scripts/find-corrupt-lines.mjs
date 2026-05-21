import fs from "fs";

const lines = fs.readFileSync("src/pages/teams/TeamPage.tsx", "utf8").split(/\n/);

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (
    l.includes("\uFFFD") ||
    l.includes("?") ||
    l.includes("") ||
    /AI\?/.test(l) ||
    /AI/.test(l)
  ) {
    console.log(`${i + 1}: ${l.trim().slice(0, 110)}`);
  }
}
