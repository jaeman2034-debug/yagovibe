/** 플랫폼 참여 → 아바타 XP (PR-5 MVP) */

export const AVATAR_XP_SOURCES = [
  "team_rsvp_attendance",
  "team_invite_success",
  "team_membership_join",
  "team_activity_upload",
  /** PR-10A — 챌린지 역대 최고 갱신(Callable 전용, 일일·멱등 제한) */
  "challenge_best_improvement",
] as const;

export type AvatarXpSource = (typeof AVATAR_XP_SOURCES)[number];

export const AVATAR_XP_AMOUNTS: Record<AvatarXpSource, number> = {
  team_rsvp_attendance: 15,
  team_invite_success: 50,
  team_membership_join: 25,
  team_activity_upload: 10,
  challenge_best_improvement: 10,
};

/** 누적 XP 기준 레벨 (MVP: Lv1~4) */
export function levelFromTotalXp(totalXp: number): number {
  const x = Math.max(0, Math.floor(Number(totalXp) || 0));
  if (x >= 500) return 4;
  if (x >= 250) return 3;
  if (x >= 100) return 2;
  return 1;
}

export function xpAmountForSource(source: string): number | null {
  if (!AVATAR_XP_SOURCES.includes(source as AvatarXpSource)) return null;
  return AVATAR_XP_AMOUNTS[source as AvatarXpSource];
}
