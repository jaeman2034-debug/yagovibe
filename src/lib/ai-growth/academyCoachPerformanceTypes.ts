/** Sprint F-1.3 — Academy Coach Performance rollup */

export type AcademyCoachPerformanceKpi = {
  playerCount: number;
  avgOvr: number;
  avgGrowthRate: number | null;
  riskManagementRate: number;
  badgeCount: number;
};

export type AcademyCoachPerformanceRow = {
  coachId: string;
  coachName: string;
  coachLabel: string;
  playerCount: number;
  avgOvr: number;
  avgGrowthRate: number | null;
  atRiskCount: number;
  riskManagementRate: number;
  badgeCount: number;
  assignedPlayerNames: string[];
};

export type AcademyCoachingImpact = {
  recoveryRiskCount: number;
  declineCount: number;
  needsFocusCount: number;
};

export type AcademyCoachPerformanceAiSummary = {
  paragraphs: string[];
  fullText: string;
};

export type AcademyCoachPerformanceResult = {
  headline: string;
  kpi: AcademyCoachPerformanceKpi;
  coaches: AcademyCoachPerformanceRow[];
  impact: AcademyCoachingImpact;
  summary: AcademyCoachPerformanceAiSummary;
};
