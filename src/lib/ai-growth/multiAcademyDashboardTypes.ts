/** Sprint G-1.1 — Multi Academy Dashboard */

export type MultiAcademyDashboardKpi = {
  academyCount: number;
  playerCount: number;
  trackedPlayers: number;
  avgOvr: number | null;
  avgGrowthRate: number | null;
  atRiskPlayerCount: number;
  activeCoachCount: number;
};

export type MultiAcademyDashboardRow = {
  teamId: string;
  teamName: string;
  playerCount: number;
  trackedPlayers: number;
  avgOvr: number | null;
  avgGrowthRate: number | null;
  atRiskPlayerCount: number;
  activeCoachCount: number;
};

export type MultiAcademyDashboardResult = {
  headline: string;
  subline: string | null;
  kpi: MultiAcademyDashboardKpi;
  academies: MultiAcademyDashboardRow[];
  isEmpty?: boolean;
};

export type AcademyIntelligenceSnapshot = {
  teamId: string;
  teamName: string;
  playerCount: number;
  trackedPlayers: number;
  avgOvr: number | null;
  avgGrowthRate: number | null;
  atRiskPlayerCount: number;
  activeCoachCount: number;
  /** G-1.2 — 위험 선수 / 추적·등록 선수 대비 % */
  atRiskPlayerPct: number | null;
  /** G-1.2 — 저출석 세션 / 활성 세션 대비 % */
  lowAttendanceSessionPct: number | null;
  /** G-1.2 — 출석 미기록 세션 / 활성 세션 대비 % */
  unrecordedSessionPct: number | null;
  activeSessionCount: number;
  /** G-1.3 — 코치 운영 출석 기록률 % */
  attendanceRecordingRate: number | null;
  /** G-1.3 — 코치 성과 평균 성장률 (기여도 proxy) */
  growthContributionRate: number | null;
  /** G-1.3 — 위험 선수 관리율 % */
  atRiskImprovementRate: number | null;
  /** G-1.4 — F-2.1 평균 출석률 % */
  avgAttendanceRatePct: number | null;
  /** G-1.4 — 세션 운영률 % (출석 기록 완료 비율 proxy) */
  sessionOperationRate: number | null;
  /** G-1.4 — 활성 코치 비율 % */
  activeCoachRatio: number | null;
  /** G-1.4 — 운영 건전성 점수 0–100 */
  operationalHealthScore: number | null;
};
