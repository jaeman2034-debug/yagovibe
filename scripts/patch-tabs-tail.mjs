import fs from "fs";

const lines = fs.readFileSync("src/pages/teams/TeamPage.tsx", "utf8").split("\n");

const tail = `          {/* Records Tab */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>기록</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  기록 데이터는 준비 중입니다. (Cloud Function 연동 예정)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Awards Tab */}
          <TabsContent value="awards">
            <Card>
              <CardHeader>
                <CardTitle>수상</CardTitle>
              </CardHeader>
              <CardContent>
                {awards.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">수상 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {awards.map((award) => (
                      <div
                        key={award.id}
                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200"
                      >
                        <Trophy className="w-8 h-8 text-yellow-600" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {safeReactText(award.title, "수상").trim() || "수상"}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(award.awardedAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  미디어 갤러리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MediaGallery entityType="team" entityId={effectiveTeamId} />
              </CardContent>
            </Card>
          </TabsContent>`;

lines.splice(2240, 60, ...tail.split("\n"));

lines[2193] = "                <CardTitle>등록 멤버</CardTitle>";
lines[2197] = '                  <p className="text-gray-500 text-center py-8">등록된 멤버가 없습니다.</p>';
lines[2207] = "                            이름";

fs.writeFileSync("src/pages/teams/TeamPage.tsx", lines.join("\n"), "utf8");
console.log("ok");
