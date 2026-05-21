/**
 * 게임 XP·레벨 단일 정책 (클라 입력 상한 / 레벨 분모)
 * 수정 시 Functions 전반과 클라 레벨 표시(levelNames) 일관성 유지 권장.
 */
export const XP_AWARD_SOURCES = [
  "miniShotDaily",
  "miniShotSession",
  "marketComplete",
  "marketReview",
  /** 시즌 보상 클레임 — 캡은 `bypassGameXpCap` 경로에서 생략 */
  "seasonSettlement",
] as const;

export type XpAwardSource = (typeof XP_AWARD_SOURCES)[number];

export const XP_POLICY = {
  /** users.xp·progression 기준 레벨: floor(xp / LEVEL_XP_PER_LEVEL) + 1 */
  LEVEL_XP_PER_LEVEL: 100,

  /** 일·주간 총액 + 소스별 일일 누적 상한 (Asia/Seoul 자정·ISO 주 기준) */
  CAP: {
    DAILY_TOTAL: 300,
    WEEKLY_TOTAL: 1500,
    DAILY_BY_SOURCE: {
      miniShotDaily: 100,
      miniShotSession: 200,
      marketComplete: 100,
      marketReview: 10,
      seasonSettlement: 1_000_000,
    } satisfies Record<XpAwardSource, number>,
  },

  /** 시즌 보상 등 서버 단발 XP — 단일 클레임 상한(치팅·오설정 방지) */
  SEASON_SETTLEMENT: {
    MAX_BONUS_XP_PER_CLAIM: 500,
  },

  MINI_SHOT_DAILY: {
    /** 클라가 보내는 rewardXp 상한 (조작 방지) */
    MAX_REWARD_XP: 100,
    MAX_REWARD_SCORE: 50_000,
  },

  MINI_SHOT_SESSION: {
    /** 세션 1회 지급 XP 상한 (공식 결과에 적용) */
    MAX_XP_PER_SESSION: 80,
  },

  MARKET: {
    COMPLETE_BASE_XP: 10,
  },

  REVIEW: {
    MARKET_PRODUCT_DELTA: 3,
  },
} as const;

export function levelFromTotalXp(totalXp: number): number {
  const div = XP_POLICY.LEVEL_XP_PER_LEVEL;
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
  return Math.floor(xp / div) + 1;
}
