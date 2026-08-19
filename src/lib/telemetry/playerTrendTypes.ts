/** Client mirror — TRACK 4 trend + archetype intelligence */

export type TrendDirectionClient = "up" | "down" | "stable";

export type MetricTrendClient = {
  values: number[];
  avg: number;
  delta: number;
  direction: TrendDirectionClient;
};

export type PlayerTrendsClient = {
  version: 1;
  window: number;
  snapshotCount: number;
  overall: MetricTrendClient;
  xThreat: MetricTrendClient;
  finishing: MetricTrendClient;
  control: MetricTrendClient;
  passing: MetricTrendClient;
  momentum: {
    label: string;
    score: number;
    direction: TrendDirectionClient;
  };
};

export type PlayerArchetypesClient = {
  version: 1;
  primary: string;
  secondary: string | null;
  badges: string[];
  explain: string[];
};

export type PlayerTrendIntelligenceClient = {
  uid: string;
  window: number;
  trends: PlayerTrendsClient;
  archetypes: PlayerArchetypesClient;
  profileMatchesPlayed: number;
  isPro: boolean;
  maxTrendWindow: number;
};
