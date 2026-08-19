import type { TeamMember } from "@/hooks/useMyTeams";

function memberStatusActive(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === "") return true;
  const s = String(raw).trim().toLowerCase();
  return s === "active" || s === "approved" || s === "joined";
}

/** I-2.1 — 저장·목록에 쓸 팀 (본인 active 멤버십만; 데모 teamId fallback 없음) */
export function buildVocTeamOptions(teamMembers: TeamMember[]) {
  const ids = [
    ...new Set(
      teamMembers
        .filter((m) => m.teamId && memberStatusActive(m.status))
        .map((m) => m.teamId.trim())
        .filter(Boolean)
    ),
  ];
  return ids.map((id) => ({ id, label: id }));
}

export function formatVocPermissionError(message: string): string {
  if (/permission/i.test(message)) {
    return "저장 권한이 없습니다. 본인이 속한 팀을 선택했는지 확인해 주세요. (팀 회장·멤버 계정 필요)";
  }
  return message;
}
