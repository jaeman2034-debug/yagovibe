import fs from "fs";

const p = "src/pages/teams/TeamPage.tsx";
const lines = fs.readFileSync(p, "utf8").split(/\n/);

lines[2330] = "            ) : (";
lines[2331] = "              <>";
lines[2332] = "                <div>";
lines[2333] = '                  <h2 className="text-lg font-semibold text-gray-900">이 팀에 가입하고 싶으신가요?</h2>';
lines[2334] = '                  <p className="text-sm text-gray-600 mt-1">';
lines[2335] = "                    팀 활동과 일정을 함께하려면 가입 요청을 보내 주세요.";
lines[2336] = "                  </p>";
lines[2337] = "                </div>";
lines[2338] = "                <Button";
lines[2339] = '                  className="shrink-0 bg-blue-600 hover:bg-blue-700"';
lines[2340] = "                  onClick={() => navigate(`/join?teamId=${encodeURIComponent(effectiveTeamId)}`)}";
lines[2341] = "                >";
lines[2342] = "                  가입하기";
lines[2343] = "                </Button>";

fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("fixed owner/join card footer");
