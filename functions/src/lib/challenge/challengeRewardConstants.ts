/**
 * PR-10A — 챌린지 보상 정책 (서버). 클라와 동일 수치 유지.
 * @see docs/architecture/pr-10a-challenge-rewards.md
 */

export const CHALLENGE_REWARD_XP_PER_GRANT = 10;
export const CHALLENGE_REWARD_MAX_GRANTS_PER_UTC_DAY = 2;
export const CHALLENGE_REWARD_ELIGIBLE_TEMPLATE_IDS = ["pk_challenge_v1", "dribble_challenge_v1"] as const;

export type ChallengeRewardEligibleTemplateId = (typeof CHALLENGE_REWARD_ELIGIBLE_TEMPLATE_IDS)[number];
