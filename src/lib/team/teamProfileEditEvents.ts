/**
 * 팀 공개 프로필 편집 — 점수 카드 등에서 특정 필드의 AI 개선 플로우를 요청할 때 사용.
 * PublicProfileTextareaWithAi 가 동일 field 에서 수신한다.
 */

export const TEAM_PROFILE_AI_IMPROVE = "yago:team-profile-ai-improve";

export type TeamProfileAiImproveRequestDetail = {
  field: "intro" | "oneLine" | "joinMessage";
  /** true: 본문 앞부분(최대 400자)을 선택한 뒤 AI 개선 Callable 호출 */
  selectAll?: boolean;
};

export function requestTeamProfileAiImprove(detail: TeamProfileAiImproveRequestDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TEAM_PROFILE_AI_IMPROVE, { detail }));
}
