import fs from "fs";

const p =
  "C:/Users/samsung256g/.cursor/projects/c-Users-samsung256g-Desktop-yago-vibe-spt/agent-transcripts/7647af3e-85f1-41b9-93aa-a7710cf4e0cc/7647af3e-85f1-41b9-93aa-a7710cf4e0cc.jsonl";
const line = fs.readFileSync(p, "utf8").split("\n")[2187];
const obj = JSON.parse(line);
const tool = obj.message.content.find((c) => c.type === "tool_use" && c.input?.new_string?.includes("ownerPublicScoreResult"));
const s = tool.input.new_string;
console.log(s.slice(5400, 6200));
