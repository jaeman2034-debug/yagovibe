export const TEAM_DEFAULT_FORMATIONS = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"] as const;
export type TeamDefaultFormation = (typeof TEAM_DEFAULT_FORMATIONS)[number];

export const TEAM_DEFAULT_STRATEGIES = ["balanced", "young", "senior"] as const;
export type TeamDefaultStrategy = (typeof TEAM_DEFAULT_STRATEGIES)[number];

/**
 * 팀 운영(라인업·멤버 UX·알림) 설정 — `teams/{teamId}.settings` 에 저장
 */
export type TeamOperationalSettings = {
  defaultFormation?: TeamDefaultFormation;
  defaultStrategy?: TeamDefaultStrategy;
  autoLineupName?: boolean;

  allowDuplicateJersey?: boolean;
  defaultAvailable?: boolean;
  showAge?: boolean;

  reminderCooldownMinutes?: number;
  autoReminder?: boolean;

  /**
   * 회비 자동 마감(Cloud Scheduler) — 전원 `paid`일 때만 마감.
   * `feeAutoCloseDayOfMonth`: 서울 달력 기준, 해당 월에는 이 날(또는 말일) 이후에만 같은 달 마감 시도(말일=31).
   * 마감월이 지난 회차는 매일 시도(이미 마감일 지남).
   */
  feeAutoCloseEnabled?: boolean;
  /** 1–31, 기본 31(해당 월 말일) */
  feeAutoCloseDayOfMonth?: number;
  /** true면 자동 마감 조건만 검사하고 Firestore는 갱신하지 않음(운영 검증용) */
  feeAutoCloseDryRun?: boolean;
};
