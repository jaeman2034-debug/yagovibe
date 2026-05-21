import fs from "fs";
const p = "src/pages/teams/TeamPage.tsx";
const lines = fs.readFileSync(p, "utf8").split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("team.name") && lines[i].includes("as string")) {
    lines[i] = '    const name = (safeReactText(team.name).trim() || "팀") as string;';
    console.log("fixed line", i + 1);
    break;
  }
}
fs.writeFileSync(p, lines.join("\n"), "utf8");
