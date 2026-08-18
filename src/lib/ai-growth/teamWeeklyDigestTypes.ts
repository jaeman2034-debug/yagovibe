/** Sprint E-1.2 — Team Weekly Digest (D-5.3 team rollup) */

export type TeamWeeklyDigestRiskPlayer = {
  playerId: string;
  playerName: string;
  riskLabels: string[];
};

export type TeamWeeklyDigestRecommendation = {
  label: string;
  playerCount: number;
};

export type TeamWeeklyDigestAiDigest = {
  paragraphs: string[];
  fullText: string;
};

export type TeamWeeklyDigest = {
  weekKey: string;
  weekLabel: string;
  trackedPlayers: number;
  rosterCount: number;
  avgOvr: number;
  avgLevel: number;
  riskPlayerCount: number;
  riskPlayers: TeamWeeklyDigestRiskPlayer[];
  newBadges: string[];
  focusTraining: string | null;
  topRecommendations: TeamWeeklyDigestRecommendation[];
  summary: TeamWeeklyDigestAiDigest;
};
