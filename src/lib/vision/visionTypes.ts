/**
 * Vision v6-2 / v6-3 — vision_result.json & Firestore types
 * @see Vision v6-3 Academy OS Integration
 */

import type {
  FiiSummaryCoachDecisionBrief,
  FiiSummaryReviewHook,
} from "@/lib/vision/fiiSummaryTypes";

export const VISION_RESULT_SCHEMA_VERSION = "yago-vision-result-v6-2" as const;
export const VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION = 1 as const;

/** FII ranking entry per tracked player */
export type PlayerFii = {
  trackId?: string;
  playerId?: string;
  name?: string;
  fii: number;
  rank?: number;
  axes?: Partial<Record<"spatial" | "vision" | "decision" | "pressure" | "tactics", number>>;
};

export type Playmaker = {
  trackId?: string;
  playerId?: string;
  name?: string;
  score?: number;
  keyPasses?: number;
  assistPotential?: number;
};

export type BallProgression = {
  forwardPassRate: number;
  backwardPassRate?: number;
  lateralPassRate?: number;
  totalPasses?: number;
  progressivePasses?: number;
};

export type PressureZoneEntry = {
  zoneId: string;
  label?: string;
  intensity: number;
  eventCount?: number;
};

export type PressureZone = {
  zones: PressureZoneEntry[];
  bestZoneId?: string;
  dominantZoneId?: string;
};

export type TeamCompactness = {
  score: number;
  averageDistance?: number;
  compactnessIndex?: number;
  unit?: "ratio_0_1" | "percent";
};

export type TacticalReport = {
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
};

/** Normalized in-app model (camelCase) */
export type VisionResult = {
  schemaVersion: string;
  playerFii: PlayerFii[];
  playmaker: Playmaker | null;
  ballProgression: BallProgression | null;
  pressureZone: PressureZone | null;
  teamCompactness: TeamCompactness | null;
  tacticalReport: TacticalReport | null;
  meta?: {
    matchId?: string;
    teamId?: string;
    generatedAt?: string;
    sourcePath?: string;
  };
};

/** Raw Colab export (snake_case keys) */
export type VisionResultJson = {
  schemaVersion?: string;
  schema_version?: string;
  match_id?: string;
  matchId?: string;
  team_id?: string;
  teamId?: string;
  generated_at?: string;
  generatedAt?: string;
  player_fii?: PlayerFii[];
  playerFii?: PlayerFii[];
  playmaker?: Playmaker | null;
  ball_progression?: BallProgression | null;
  ballProgression?: BallProgression | null;
  pressure_zone?: PressureZone | null;
  pressureZone?: PressureZone | null;
  team_compactness?: TeamCompactness | null;
  teamCompactness?: TeamCompactness | null;
  tactical_report?: TacticalReport | null;
  tacticalReport?: TacticalReport | null;
};

/** Coach dashboard summary (data-only; no UI) */
export type CoachVisionSummary = {
  playmaker: Playmaker | null;
  compactness: number | null;
  forwardPassRate: number | null;
  bestPressureZone: string | null;
  playerRanking: PlayerFii[];
  recommendation: string;
};

export type CoachDashboardVisionProviderView = {
  playerRanking: Array<{
    rank: number;
    name: string;
    fii: number;
    trackId?: string;
    playerId?: string;
  }>;
  playmaker: { name: string; score?: number; trackId?: string } | null;
  forwardPassRate: number | null;
  pressureZones: Array<{ zoneId: string; label: string; intensity: number }>;
  compactness: number | null;
  tacticalReport: TacticalReport | null;
  recommendation: string;
  /** RC4-3 M3 — from fii_summary.json when bound */
  teamFiiOverall?: number | null;
  matchHeadline?: string | null;
  matchSummaryText?: string | null;
  coachStrengths?: string[];
  improvementPoints?: string[];
  trainingRecommendations?: string[];
  coachDecisionBrief?: FiiSummaryCoachDecisionBrief;
  reviewHooks?: FiiSummaryReviewHook[];
  fiiDataSource?: "vision_result" | "fii_summary";
};

export type ParentReportVisionProviderView = {
  playerGrowth: {
    currentFii: number | null;
    rank: number | null;
    summary: string;
  };
  matchSummary: string;
  aiRecommendation: string;
};

/** teams/{teamId}/matches/{matchId}/visionAnalysis/{analysisId} */
export type VisionAnalysisFirestoreDoc = {
  schemaVersion: typeof VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION;
  visionResultSchemaVersion: string;
  playerFii: PlayerFii[];
  playmaker: Playmaker | null;
  ballProgression: BallProgression | null;
  pressureZone: PressureZone | null;
  teamCompactness: TeamCompactness | null;
  tacticalReport: TacticalReport | null;
  sourcePath?: string;
  createdAt: unknown;
  createdByUid?: string;
  /** Server persist (academyVisionFirestore) — Brain Wiring handoff */
  fiiSummary?: unknown;
  teamFii?: unknown;
  coachInsights?: unknown;
  parentInsights?: unknown;
  summary?: unknown;
};

export const VISION_ANALYSIS_COLLECTION = "visionAnalysis" as const;
