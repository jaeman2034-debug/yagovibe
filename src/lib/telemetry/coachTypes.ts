export type CoachFocusAreaClient =
  | "Passing"
  | "Control"
  | "Finishing"
  | "Threat Creation"
  | "Possession"
  | "General";

export type CoachTrendStatusClient = "improving" | "declining" | "plateau";

export type CoachPlanClient = {
  version: 1;
  diagnosis: string;
  focusArea: CoachFocusAreaClient;
  focusTrend: CoachTrendStatusClient;
  drills: string[];
  target: string;
  timeframe: string;
  streak: number;
};

export type CoachLastRecommendationClient = {
  focusArea: CoachFocusAreaClient;
  target: string;
  drills: string[];
  diagnosis: string;
  timeframe: string;
};

export type CoachProfileFieldsClient = {
  coachFocusArea: CoachFocusAreaClient | null;
  coachFocusSince: number | null;
  coachStreak: number;
  coachLastRecommendation: CoachLastRecommendationClient | null;
};

export type CoachHistoryEntryClient = {
  focusArea: CoachFocusAreaClient;
  target: string;
  diagnosis: string;
  recordedAtMs: number;
  matchId?: string;
};

export type AdaptiveCoachPlanClient = {
  plan: CoachPlanClient;
  profileFields: CoachProfileFieldsClient;
  matchesPlayed: number;
  isPro: boolean;
  maxTrendWindow: number;
  coachHistory: CoachHistoryEntryClient[] | null;
};
