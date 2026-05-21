import fs from "fs";

const lines = fs.readFileSync("src/pages/teams/TeamPage.tsx", "utf8").split(/\n/);

function hasUnclosedString(line) {
  let inStr = false;
  let esc = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\") {
      esc = true;
      continue;
    }
    if (c === '"') inStr = !inStr;
  }
  return inStr;
}

for (let i = 0; i < lines.length; i++) {
  if (hasUnclosedString(lines[i])) {
    console.log(`${i + 1}: ${lines[i].slice(0, 120)}`);
  }
}
