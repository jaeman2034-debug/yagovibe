import fs from "fs";

const lines = fs.readFileSync("src/pages/teams/TeamPage.tsx", "utf8").split("\n");

const block = `                        <section
                          className={cn(
                            "rounded-xl border p-4 shadow-sm sm:p-5",
                            profileThemeDark
                              ? "border-slate-600/80 bg-slate-800/30 text-slate-100"
                              : "border-gray-200 bg-white/95 text-gray-900"
                          )}
                          aria-label="최근 경기 미리보기"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2
                              className={cn(
                                "text-sm font-semibold tracking-tight",
                                profileThemeDark ? "text-slate-100" : "text-gray-900"
                              )}
                            >
                              최근 경기
                            </h2>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 text-xs font-medium",
                                profileThemeDark ? "text-violet-200 hover:bg-white/10" : "text-indigo-700 hover:bg-indigo-50"
                              )}
                              onClick={() => setActiveTab("matches")}
                            >
                              전체 보기
                            </Button>
                          </div>`;

const start = 1848; // 0-based line 1849
const end = 1878; // inclusive line 1879 in 1-based
const newLines = block.split("\n");
lines.splice(start, end - start + 1, ...newLines);

fs.writeFileSync("src/pages/teams/TeamPage.tsx", lines.join("\n"), "utf8");
console.log("patched match preview header");
