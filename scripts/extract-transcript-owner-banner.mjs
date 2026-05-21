import fs from "fs";

const p =
  "C:/Users/samsung256g/.cursor/projects/c-Users-samsung256g-Desktop-yago-vibe-spt/agent-transcripts/7647af3e-85f1-41b9-93aa-a7710cf4e0cc/7647af3e-85f1-41b9-93aa-a7710cf4e0cc.jsonl";
const lines = fs.readFileSync(p, "utf8").split("\n");
for (const line of lines) {
  if (!line.includes("ownerPublicScoreResult") || !line.includes("StrReplace")) continue;
  const idx = line.indexOf('"new_string":');
  if (idx < 0) continue;
  const slice = line.slice(idx + 14);
  try {
    const parsed = JSON.parse(slice.slice(0, slice.lastIndexOf('"') + 1));
    if (parsed.includes("팀 페이지") || parsed.includes("완성도")) {
      const i = parsed.indexOf("ownerPublicScoreResult");
      console.log(parsed.slice(Math.max(0, i - 200), i + 2500));
      break;
    }
  } catch {
    /* skip */
  }
}
