import type { TeamPlayHudSnapshot } from "@/components/team/play/hud/teamPlayHudTypes";

export const TEAM_PLAY_HUD_REVEAL_EVENT = "yago:team-play-hud-reveal" as const;

/** HUD 스냅샷 패치 + 한 번성 연출 메타 (스냅샷 merge에는 넣지 않음) */
export type TeamPlayHudRevealDetail = Partial<TeamPlayHudSnapshot> & {
  /** 짧은 레벨업 플래시 — `useTeamPlayHudReveal`에서만 소비 */
  levelUpBurst?: { fromLevel: number; toLevel: number };
};

/** 경기 기록·피드백 완료 등 HUD 순차 갱신을 요청 (TeamPlayPage에서 수신) */
export function dispatchTeamPlayHudReveal(detail: TeamPlayHudRevealDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TEAM_PLAY_HUD_REVEAL_EVENT, { detail }));
}
