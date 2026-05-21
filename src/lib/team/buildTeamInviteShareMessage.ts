/**
 * 팀 초대 링크 공유용 문구 (카카오/문자/클립보드 공통)
 * 단톡·오픈채팅 붙여넣기에 읽기 쉽게: 요약 → 한 줄 설명 → 링크 → 보조 정보
 */
export function buildTeamInviteShareMessage(input: {
  teamName: string;
  teamIntro?: string | null;
  inviteLink: string;
}): string {
  const name = input.teamName.trim() || "팀";
  const link = input.inviteLink.trim();
  const intro = (input.teamIntro ?? "").trim().replace(/\s+/g, " ");
  const introLine =
    intro.length > 0
      ? `\n${intro.slice(0, 100)}${intro.length > 100 ? "…" : ""}\n`
      : "\n";

  return `⚽ ${name} 팀원 모집합니다!

같이 운동할 팀원을 찾고 있어요 💪
편하게 참여하실 분 환영합니다 🙂${introLine}👇 바로 신청
${link}

✔ 팀장 승인 후 바로 참여
✔ 초보·경험자 모두 환영`;
}

/** 모바일 기본 문자 앱으로 본문 전달 */
export function openSmsWithBody(body: string): void {
  if (typeof window === "undefined") return;
  window.location.href = `sms:?body=${encodeURIComponent(body)}`;
}
