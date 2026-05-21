import fs from "fs";

const p =
  "C:/Users/samsung256g/.cursor/projects/c-Users-samsung256g-Desktop-yago-vibe-spt/agent-transcripts/7647af3e-85f1-41b9-93aa-a7710cf4e0cc/7647af3e-85f1-41b9-93aa-a7710cf4e0cc.jsonl";
const line = fs.readFileSync(p, "utf8").split("\n")[1911];
const obj = JSON.parse(line);
for (const c of obj.message.content) {
  if (c.type !== "tool_use") continue;
  const ns = c.input?.new_string;
  if (typeof ns === "string" && ns.includes("playMemberOnlyHint")) {
    const i = ns.indexOf("playMemberOnlyHint");
    console.log(ns.slice(i, i + 2500));
    break;
  }
}
