import fs from "fs";

const p = "src/pages/teams/TeamPage.tsx";
const lines = fs.readFileSync(p, "utf8").split("\n");

const patches = {
  740: '    return n || "팀";',
  1020: "                  {foundedYearForUi ? <motion.div>창단 {foundedYearForUi}</motion.div> : null}",
  1084: '                    aria-label="대표 인사말 직접 수정"',
  1092: "                      대표 인사말 직접 수정",
  1095:
    "                      직접 입력한 문구는 공개 팀 페이지에 그대로 반영돼요. 저장 후에도 AI 재생성으로 다시 채울 수 있어요.",
  1114: '                      placeholder="팀을 소개하는 인사말을 작성해 주세요."',
  1125: "                        닫기",
  1137: "                        저장",
  1239: "                      팀 소개",
  1251: '                      placeholder="팀 분위기·활동 일정·모집 성향을 자연스럽게 적어 주세요."',
  1270: "                      팀 소개",
  1292: "                      이런 분께 추천",
  1300: "                      한 줄에 하나씩 입력해 주세요 (빈 줄로 구분)",
  1366: "                      AI 초안과 지금 저장본 비교",
  1375: "                        아래는 방문자에게 보이는 문구예요. 초록은 저장본, 보라는 AI 초안이에요.",
  1378: '                        <span className={diffMarkCurrent}>초록</span>은 지금 저장본,{" "}',
  1379: '                        <span className={diffMarkAi}>보라</span>는 AI 초안이에요.',
  1383: '                          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">팀 소개</div>',
  1387: "                                AI 초안",
  1413: "                                  이 필드 AI 재생성",
  1419: "                                지금 저장본",
  1445: "                                  되돌리기",
  1686: "                        참여·가입 문구",
  1698: '                        placeholder="가입을 고민하는 분에게 전할 한두 문장을 적어 주세요."',
  1854: '                          aria-label="최근 경기 미리보기"',
  1863: "                              최근 경기",
  1875: "                              전체 보기",
  2035: "                <CardTitle>최근 경기</CardTitle>",
  2039: "                  <p className=\"text-gray-500 text-center py-8\">등록된 경기 기록이 없습니다.</p>",
  2058: "                            {formatDate(match.matchDate)} · {match.stageLabel || \"-\"}",
  2103: "                  팀 활동",
  2122: "                <CardTitle>경기 기록</CardTitle>",
  2126: "                  <p className=\"text-gray-500 text-center py-8\">등록된 경기 기록이 없습니다.</p>",
  2242: "                <CardTitle>기록</CardTitle>",
  2258: "                  <p className=\"text-gray-500 text-center py-8\">수상 기록이 없습니다.</p>",
  2289: "                  미디어 갤러리",
};

for (const k of Object.keys(patches)) {
  let v = patches[k];
  v = v.replace(/<\/?motion\.div/g, (m) => m.replace("motion.", ""));
  lines[Number(k) - 1] = v;
}

fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("batch3", Object.keys(patches).length);
