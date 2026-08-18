export const PLAYER_GROWTH_OVR_SCHEMA_VERSION = 1 as const;

/** teams/{teamId}/playerGrowthOvr/{playerId} — 아카데미 AI Growth OVR (playerId = player-{slug}) */
export type PlayerGrowthOvrDoc = {
  schemaVersion: typeof PLAYER_GROWTH_OVR_SCHEMA_VERSION;
  playerId: string;
  playerName: string;
  ovr: number;
  vision: number;
  pressure: number;
  recovery: number;
  lastSeason: string | null;
  lastAppliedAt: number | null;
  updatedAt: number;
  source: "session_sync" | "season_apply" | "bootstrap" | "cv_promotion";
};

export type OvrStatChange = {
  label: string;
  labelKo: string;
  from: number;
  to: number;
  delta: number;
};

export type SeasonOvrImpact = {
  before: { ovr: number; vision: number; pressure: number; recovery: number };
  after: { ovr: number; vision: number; pressure: number; recovery: number };
  ovrDelta: number;
  statChanges: OvrStatChange[];
};
