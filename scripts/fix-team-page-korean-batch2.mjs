import fs from "fs";

const p = "src/pages/teams/TeamPage.tsx";
const lines = fs.readFileSync(p, "utf8").split("\n");

const patches = {
  754: '                ⚽',
  755: "              이 팀의 플레이·경기 기록은 팀원만 이용할 수 있어요",
  757: '            <p className="mt-2 font-semibold text-amber-900 dark:text-amber-100/95">팀에 가입하면 함께 쓸 수 있어요</p>',
  759: "              <li>경기 기록·전적 확인</li>",
  760: "              <li>MVP·활동 데이터</li>",
  761: "              <li>팀 일정 참석·알림</li>",
  769: "                팀 가입하기",
  781: "                닫기",
  793: '                ? "축하해요! 팀이 만들어졌어요. 공개 프로필을 확인해 보세요."',
  795: '                  ? "축하해요! 팀이 만들어졌어요. 소개를 직접 채워 보세요."',
  796: '                  : "축하해요! AI로 팀 페이지 초안을 채웠어요. 마음에 들면 그대로, 아니면 바로 수정해 보세요."}',
  800: "                AI 건너뛰기로 만들었어요. 아래에서 직접 수정할 수 있어요.",
  816: "              확인",
  1734: "                        팀 플레이 입장",
  1777: "                          카카오톡 공유",
  1793: "                          문의하기",
  1809: "                          가입 신청",
  1829: "                        팀 공유하기",
  1951: '                        title={profileEditMode ? "프로필 편집 중에는 AI 재생성을 할 수 없어요" : undefined}',
  1965: "                        AI로 자동 채우기",
  1158: '                        {showPublicStaffPreview ? "운영진 미리보기 숨기" : "운영진 미리보기 보기"}',
  1189: "                        프로필 편집",
  1206: "                          취소",
  1218: "                          저장",
  1976: '                <div className="text-sm font-medium text-gray-500 mb-1">경기</motion.div>',
  1979: "                  {summary.wins}승 {summary.draws}무 {summary.losses}패",
  1984: '                <div className="text-sm font-medium text-gray-500 mb-1">득점</motion.div>',
  1987: "                  실점 {summary.goalsAgainst} · 득실차 {summary.goalDifference > 0 ? \"+\" : \"\"}",
  1994: '                <motion.div className="text-sm font-medium text-gray-500 mb-1">우승</motion.div>',
  1997: "                  준우승 {summary.runnerUps} · 4강 {summary.semifinals}",
  2014: '            <TabsTrigger value="overview">개요</TabsTrigger>',
  2017: "              활동",
  2019: '            <TabsTrigger value="matches">경기</TabsTrigger>',
  2020: '            <TabsTrigger value="players">선수</TabsTrigger>',
  2021: '            <TabsTrigger value="records">기록</TabsTrigger>',
  2022: '            <TabsTrigger value="awards">수상</TabsTrigger>',
  2023: '            <TabsTrigger value="media">미디어</TabsTrigger>',
  2308: '                  <h2 className="text-lg font-semibold text-gray-900">공개 팀 페이지를 더 다듬어 볼까요?</h2>',
  2311: "                      ? `지금 완성도는 ${ownerPublicScoreResult.score}%예요. 소개·모집 문구를 채우면 가입 전환이 좋아져요.`",
  2312: '                      : "소개·추천·참여 문구를 채우면 방문자가 팀 분위기를 더 잘 이해해요."}',
  2320: "                    프로필 편집",
  2329: "                    AI로 자동 채우기",
  2354: "            <DialogTitle>AI로 프로필을 다시 생성할까요?</DialogTitle>",
  2356: "              기존 소개·추천·참여 문구가 AI 초안으로 다시 채워집니다. 저장된 직접 수정 내용은 일부 덮어쓸 수 있어요.",
  2361: "              취소",
  2372: "              재생성",
};

for (const k of Object.keys(patches)) {
  let v = patches[k];
  v = v.replace(/<\/?motion\.div/g, (m) => m.replace("motion.", ""));
  patches[k] = v;
}

for (const [ln, text] of Object.entries(patches)) {
  lines[Number(ln) - 1] = text;
}

if (lines[2023]?.includes('value="media"') && lines[2024]?.includes('value="media"')) {
  lines.splice(2023, 1);
}

fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("done");
