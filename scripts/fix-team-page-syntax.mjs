import fs from "fs";
import * as esbuild from "esbuild";

const p = "src/pages/teams/TeamPage.tsx";
const lines = fs.readFileSync(p, "utf8").split(/\n/);

const lineFixes = {
  377: '        toast.success("링크를 복사했어요. 카카오톡·문자에 붙여 넣어 주세요.");',
  379: '        toast.success("카카오 공유 창을 열었어요.");',
  381: '        toast.success("공유 창을 열었어요.");',
  384: '      toast.error(e instanceof Error ? e.message : "공유에 실패했어요.");',
  569: '      toast.error("한 가지 이상 입력해 주세요.");',
  573: '    const t = toast.loading("저장하는 중…");',
  583: '      toast.success("공개 프로필을 저장했어요.");',
  592: '        toast.error("팀 소유자만 수정할 수 있어요.");',
  594: '        toast.error(shortDetail || "입력 내용을 확인해 주세요.");',
  596: '        toast.error(shortDetail || "저장에 실패했어요. 다시 시도해 주세요.");',
  590: "      const shortDetail = detail.length > 220 ? `${detail.slice(0, 220)}…` : detail;",
  613: '    const t = toast.loading("AI로 문구를 다시 생성하는 중…");',
  618:
    '      toast.success(out.source === "openai" ? "AI로 문구를 갱신했어요." : "기본 템플릿으로 문구를 채웠어요.");',
  631: '            ? "대표 인사말은 운영 권한이 있는 분만 AI 재생성할 수 있어요."',
  632: '            : "팀 소유자만 AI 재생성을 할 수 있어요."',
  635: '        toast.error(detail.length > 0 ? detail : "요청 내용을 확인해 주세요.");',
  637: "        const shown = detail.length > 200 ? `${detail.slice(0, 200)}…` : detail;",
  655: '        toast.info("되돌릴 AI 초안이 없어요.");',
  657: '        toast.success("AI 초안으로 되돌렸어요.");',
  663: '        toast.error("팀 소유자만 되돌릴 수 있어요.");',
  665: '        toast.error("되돌리기에 실패했어요. 다시 시도해 주세요.");',
  677: '      toast.error("팀 정보가 없어 재생성할 수 없어요.");',
  852: '                        ? "팀 페이지가 잘 갖춰져 있어요"',
  853: '                        : "팀 페이지 완성도를 더 올려볼까요?"}',
  862: '                        ? "이제 가입 전환에 유리한 수준이에요. 일정·모집 문구만 더 다듬으면 좋아요."',
  863: '                        : "소개·한 줄 소개·가입 문구를 채우면 완성도가 빠르게 올라가요. AI 재생성도 활용해 보세요."}',
  892: '                        <span>팀 소개 입력</span>',
  900: '                        <span>한 줄 소개·모집 문구</span>',
  908: '                        <span>가입·문의 경로</span>',
  1158: '                        {showPublicStaffPreview ? "운영진 미리보기 숨기" : "운영진 미리보기"}',
  1749: '                        ? "다른 팀 가입하기"',
  1753: '                            : "가입하기")}',
  2221: '                              {safeReactText(player.name, "이름 없음").trim() || "이름 없음"}',
  731: '          <p className="text-gray-500 mb-4">팀을 찾을 수 없어요.</p>',
  1084: '                    aria-label="대표 인사말 직접 수정"',
  1092: '                      대표 인사말 직접 수정',
  1095:
    '                      직접 입력한 문구는 공개 팀 페이지에 그대로 반영돼요. 저장 후에도 AI 재생성으로 다시 채울 수 있어요.',
  1308: '                      placeholder="한 줄에 하나씩 입력해 주세요"',
  1921: '                                    {match.result === "win" ? "승" : match.result === "loss" ? "패" : "무"}',
  2068: '                                {match.result === "win" ? "승" : match.result === "loss" ? "패" : "무"}',
  2149: '                                "상대 미정"}',
  2166: '                                {match.result === "win" ? "승" : match.result === "loss" ? "패" : "무"}',
};

for (const [ln, text] of Object.entries(lineFixes)) {
  const i = Number(ln) - 1;
  if (i >= 0 && i < lines.length) lines[i] = text;
}

const src = lines.join("\n");
fs.writeFileSync(p, src, "utf8");

try {
  await esbuild.transform(src, { loader: "tsx" });
  console.log("parse OK");
} catch (e) {
  console.error(String(e.message || e).slice(0, 1200));
  process.exit(1);
}
