/** Sprint F-1.2 — Academy Weekly Digest (E-1.2 academy rollup) */

export type AcademyWeeklyDigestAiSummary = {
  paragraphs: string[];
  fullText: string;
};

export type AcademyWeeklyDigest = {
  weekKey: string;
  weekLabel: string;
  academyName: string;
  teamCount: number;
  trackedPlayers: number;
  rosterCount: number;
  avgOvr: number;
  avgLevel: number;
  /** 추적 선수 평균 주간 OVR 변화 (없으면 null) */
  avgOvrDelta: number | null;
  riskPlayerCount: number;
  newBadges: string[];
  focusTraining: string | null;
  summary: AcademyWeeklyDigestAiSummary;
};
