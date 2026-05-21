import fs from "fs";

const lines = fs.readFileSync("src/pages/teams/TeamPage.tsx", "utf8").split("\n");

lines[1683] = "                      <h2";
lines[1684] = "                        className={cn(";
lines[1685] = '                          "text-sm font-semibold tracking-tight",';
lines[1686] = '                          profileThemeDark ? "text-slate-200" : "text-gray-800"';
lines[1687] = "                        )}";
lines[1688] = "                      >";
lines[1689] = "                        참여·가입 문구";
lines[1690] = "                      </h2>";
lines[1696] = "                        aiImproveEnabled={Boolean(profileEditMode && isTeamOwner && effectiveTeamId)}";
lines[1697] = "                        toneHint={selectionAiToneHint}";
lines[1698] = "                        inlineHints={profileScoreResult ? suggestionsForField(profileScoreResult, \"joinMessage\") : undefined}";
lines[1699] = "                        hintsDark={profileThemeDark}";
lines[1700] = "                        value={draftRecruitMessage}";
lines[1701] = "                        onChange={setDraftRecruitMessage}";
lines[1702] = '                        placeholder="가입을 고민하는 분에게 전할 한두 문장을 적어 주세요."';

fs.writeFileSync("src/pages/teams/TeamPage.tsx", lines.join("\n"), "utf8");
console.log("ok");
