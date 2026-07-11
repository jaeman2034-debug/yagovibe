/**
 * RC4-2 M2 / RC4-3 M3 — fii_summary.json contract (yago-vision-fii-summary-v1)
 */

export const FII_SUMMARY_SCHEMA = "yago-vision-fii-summary-v1" as const;

export type FiiSummaryPlayer = {
  trackId: string;
  name: string;
  fii: number;
  rank: number;
  axes?: Partial<Record<"spatial" | "vision" | "decision" | "pressure" | "tactics", number>>;
};

export type FiiSummaryTeam = {
  overall: number | null;
  axes?: Partial<Record<"spatial" | "vision" | "decision" | "pressure" | "tactics", number>>;
  playerCount?: number;
  ballProgression?: {
    forwardPassRate?: number;
    backwardPassRate?: number;
    lateralPassRate?: number;
    totalPasses?: number;
    progressivePasses?: number;
  };
  playmaker?: {
    trackId?: string;
    name?: string;
    score?: number;
    keyPasses?: number;
  } | null;
};

export type FiiSummaryMatch = {
  headline: string;
  summary: string;
  eventHighlights?: {
    passes?: number;
    receives?: number;
    turnovers?: number;
    transitions?: number;
    totalEvents?: number;
  };
  possessionChain?: {
    totalCompletedChains?: number;
    activePlayers?: number;
  };
};

export type FiiSummaryCoachPlayerFocus = {
  trackId: string;
  name: string;
  focus: string;
  oneLiner: string;
};

export type FiiSummaryReviewHook = {
  label: string;
  headlineMetric: string;
  suggestedAction: string;
};

export type FiiSummaryCoachDecisionBrief = {
  keyChangeToday: string;
  nextTrainingFocus: string;
  playersToCoach: FiiSummaryCoachPlayerFocus[];
};

export type FiiSummaryCoachInsights = {
  insightVersion?: string;
  coachDecisionBrief?: FiiSummaryCoachDecisionBrief;
  reviewHooks?: FiiSummaryReviewHook[];
  strengths: string[];
  improvementPoints: string[];
  recommendations: string[];
};

export type FiiSummaryParentInsights = {
  summaryKo: string;
  growthHighlight: string;
  encouragement: string;
  teamFiiScore?: number | null;
  passCount?: number;
  receiveCount?: number;
};

export type FiiSummaryDocument = {
  schemaVersion: typeof FII_SUMMARY_SCHEMA | string;
  phase?: string;
  date?: string;
  productionPreset?: string;
  fiiMode?: string;
  gevInput?: {
    path?: string;
    eventCount?: number;
    eventCounts?: Record<string, number>;
  };
  playerFii: FiiSummaryPlayer[];
  teamFii: FiiSummaryTeam;
  matchSummary: FiiSummaryMatch;
  coachInsights: FiiSummaryCoachInsights;
  parentInsights?: FiiSummaryParentInsights;
  gates?: Record<string, boolean>;
};
