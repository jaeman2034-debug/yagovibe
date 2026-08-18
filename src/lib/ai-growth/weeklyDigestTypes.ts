/** Sprint D-1.1b / D-5.3 — teams/{teamId}/weeklyDigests/{digestId} */

export const WEEKLY_DIGEST_SCHEMA_VERSION = 1 as const;

/** Sprint D-5.3 — Weekly Growth Digest enrichment (Avatar · Badge · Recommendation) */
export type WeeklyGrowthDigestEnrichment = {
  ovrBefore: number | null;
  ovrAfter: number | null;
  ovrDelta: number | null;
  newBadges: string[];
  focusRecommendation: string | null;
  nextGoal: string | null;
  timelineDelta: number | null;
};

export type WeeklyDigestSummary = {
  scoreCurrent: number | null;
  scorePrevious: number | null;
  delta: number | null;
  strengths: string[];
  improvements: string[];
  nextTraining: string[];
  /** Sprint D-5.3 — Avatar/Recommendation 주간 enrichment */
  growth?: WeeklyGrowthDigestEnrichment;
};

export type WeeklyDigestDoc = {
  schemaVersion: typeof WEEKLY_DIGEST_SCHEMA_VERSION;
  playerId: string;
  playerName: string;
  weekKey: string;
  weekStartMs: number;
  weekEndMs: number;
  summary: WeeklyDigestSummary;
  latestSessionId: string;
  latestSharePath: string | null;
  sessionCount: number;
  createdAt: number;
};
