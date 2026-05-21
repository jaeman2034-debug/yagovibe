import fs from "fs";

const p = "src/pages/teams/TeamPage.tsx";
const lines = fs.readFileSync(p, "utf8").split(/\n/);

const patches = {
  844: '                    aria-label="팀 페이지 완성도 안내"',
  848: "                      팀 페이지 · 운영 모드",
  862: '                        ? "가입 전환·참여 문구도 한번 더 봐주시면 신규 멤버에게 도움이 돼요."',
  863: '                        : "아래는 방문자에게 보이는 미리보기예요. 소개·추천 문구·참여 문구를 채우면 관심이 훨씬 더 많아져요."}',
  867: "                        <span>팀 페이지 완성도 {ownerPublicScoreResult.score}%</span>",
  892: "                        <span>팀 소개 채우기</span>",
  900: "                        <span>이런 분께 추천 · 활동 스타일</span>",
  908: "                        <span>참여·가입 유도 문구</span>",
  924: "                        AI로 자동 채우기",
  937: "                        직접 수정하기",
  971: '                      title="AI로 생성된 소개·모집 문구가 적용되어 있어요"',
  974: "                      AI 생성",
  978: "                      브랜딩 적용",
};

for (const [ln, text] of Object.entries(patches)) {
  lines[Number(ln) - 1] = text;
}

fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("fixed", Object.keys(patches).length, "lines");
