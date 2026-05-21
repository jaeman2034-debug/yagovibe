/**
 * 팀 플레이 HUD — 스냅샷 타입 (실데이터 연결 시 서비스/훅에서 채움)
 */

/** 경기 반영 시 HUD 위 "+N XP" 플로팅 (토큰으로 연속 트리거 구분) */
export type TeamPlayXpFloatPayload = {
  amount: number;
  token: number;
};

export type TeamPlayHudSnapshot = {
  ovr: number;
  ovrDelta: number;
  /** OVR 상승 "드라마" 한 줄 (예: 최근 N경기 상승) */
  ovrMomentumLabel: string;
  level: number;
  xpCurrent: number;
  xpToNext: number;
  recentMatchLine: string;
  conditionLabel: string;
  xpGainRecent: number;
  mvpRank: number;
  mvpLeadPoints: number;
  mvpTrendLabel: string;
  /** MVP 카드 긴장 한 줄 */
  mvpTurnaroundLine: string;
  /** 뒤에서 따라오는 순위 (0이면 표시 안 함) */
  mvpChaserRank: number;
  /** 나와 추격자 점수 차 */
  mvpChaserGapPoints: number;
  lastMatchResult: "W" | "D" | "L" | "—";
  lastMatchScore: string;
  lastMatchLabel: string;
  /** 반영된 경기 맥락 한 줄 (일정·상대 등 — 비우면 요약에서 생략) */
  lastMatchContextLine: string;
  streakWins: number;
};

export const TEAM_PLAY_HUD_DEMO: TeamPlayHudSnapshot = {
  ovr: 76,
  ovrDelta: 2,
  ovrMomentumLabel: "🔥 최근 3경기 연속 상승",
  level: 12,
  xpCurrent: 120,
  xpToNext: 300,
  recentMatchLine: "2골 1어시",
  conditionLabel: "좋음",
  xpGainRecent: 120,
  mvpRank: 2,
  mvpLeadPoints: 3,
  mvpTrendLabel: "1위와 격차",
  mvpTurnaroundLine: "⚠ 다음 경기만 잘하면 1위 역전 가능",
  mvpChaserRank: 3,
  mvpChaserGapPoints: 1,
  lastMatchResult: "W",
  lastMatchScore: "3 : 1",
  lastMatchLabel: "지난 주말 리그",
  lastMatchContextLine: "📅 지난 주말 리그 · vs 라이벌 FC",
  streakWins: 2,
};

export function mergeTeamPlayHud(snapshot?: Partial<TeamPlayHudSnapshot> | null): TeamPlayHudSnapshot {
  return { ...TEAM_PLAY_HUD_DEMO, ...(snapshot ?? {}) };
}
