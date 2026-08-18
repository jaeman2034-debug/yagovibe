/** Sprint D-5.5 — AI Growth Summary (deterministic narrative from engines) */

export type CoachGrowthAiSummarySections = {
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendedTraining: string[];
};

export type GrowthAiSummaryResult = {
  paragraphs: string[];
  fullText: string;
  coach: CoachGrowthAiSummarySections;
};
