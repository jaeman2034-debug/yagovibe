import fs from "fs";

const p = "src/pages/teams/TeamPage.tsx";
let s = fs.readFileSync(p, "utf8");

const replacements = [
  ['(safeReactText(team.name).trim() || "?") as string', '(safeReactText(team.name).trim() || "팀") as string'],
  ["                      ?  \n", "                      이런 분께 추천\n"],
  ["                            ??                          </span>", '                            •\n                          </span>'],
  ["                            ?  \n", "                            이런 분께 추천\n"],
  ["                                AI \u0008H\n", "                                AI 초안\n"],
  ["                                  ??AI?? ?1\n", "                                  이 필드 AI 재생성\n"],
  ["                                ? \n", "                                지금 저장본\n"],
  ["                                  AI?P\n", "                                  되돌리기\n"],
  ["                            8 ? 8l\n", "                            참여·가입 문구\n"],
  ["                            ? ?\n", "                            대표 인사말\n"],
  ["                            ?\n", "                            날짜\n"],
  ["                            ???\n", "                            상대팀\n"],
  ["                            ?\n", "                            스코어\n"],
  ["                            \n", "                            결과\n"],
  ["                            ???                          </th>", "                            대회/라운드\n                          </th>"],
];

// More precise replacements via regex for mojibake lines
const lineReplacements = {
  1330: "                      이런 분께 추천",
  1342: "                            •",
  1455: "                            이런 분께 추천",
  1460: "                                AI 초안",
  1491: "                                  이 필드 AI 재생성",
  1497: "                                지금 저장본",
  1524: "                                  되돌리기",
  1534: "                            참여·가입 문구",
  1539: "                                AI 초안",
  1565: "                                  이 필드 AI 재생성",
  1571: "                                지금 저장본",
  1597: "                                  되돌리기",
  1607: "                            대표 인사말",
  1611: "                                AI 초안",
  1637: "                                  이 필드 AI 재생성",
  1643: "                                지금 저장본",
  1669: "                                  되돌리기",
  2133: "                            날짜",
  2136: "                            상대팀",
  2139: "                            스코어",
  2142: "                            결과",
  2145: "                            대회/라운드",
};

const lines = s.split("\n");
for (const [ln, text] of Object.entries(lineReplacements)) {
  const i = Number(ln) - 1;
  if (i >= 0 && i < lines.length) {
    const indent = lines[i].match(/^\s*/)?.[0] ?? "";
    lines[i] = indent + text.trimStart();
  }
}

// Fix team name fallback on line 363 area
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('|| "?"') && lines[i].includes("team.name")) {
    lines[i] = lines[i].replace('|| "?"', '|| "팀"');
  }
  if (lines[i].includes('safeReactText(player.name, "?")')) {
    lines[i] = lines[i].replace('safeReactText(player.name, "?")', 'safeReactText(player.name, "이")');
  }
}

fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("batch4 done");
