/** Sprint F-1.1 — Academy Dashboard snapshot */

export type AcademyDashboardSnapshot = {
  /** 등록 선수 (active roster) */
  totalPlayers: number;
  /** 성장 추적 중인 선수 */
  trackedPlayers: number;
  /** 팀 평균 OVR */
  avgOvr: number;
  /** 추적 선수 평균 Level */
  avgLevel: number;
  /** 즉시 조치 필요 선수 */
  atRiskCount: number;
  /** active parentLinks 기준 고유 보호자 수 */
  activeGuardianCount: number;
  /** 아카데미 소속 팀 수 (단일 팀 파일럿 = 1) */
  teamCount: number;
};

export type AcademyDashboardResult = {
  headline: string;
  subline: string | null;
  snapshot: AcademyDashboardSnapshot;
};
