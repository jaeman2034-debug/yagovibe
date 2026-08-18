import type { CoachGrowthAiSummarySections } from "@/lib/ai-growth/growthAiSummaryTypes";

/** Sprint E-1.3 — 코치용 팀 요약 탭 (E-1.1 + E-1.2 + D-5.5 통합) */

export type TeamPlayerCoachSummary = {
  playerId: string;
  playerName: string;
  ovr: number;
  level: number;
  coach: CoachGrowthAiSummarySections;
};

export type TeamGrowthSummary = {
  headline: string;
  overviewBullets: string[];
  playerSummaries: TeamPlayerCoachSummary[];
  closingParagraphs: string[];
  fullText: string;
};
