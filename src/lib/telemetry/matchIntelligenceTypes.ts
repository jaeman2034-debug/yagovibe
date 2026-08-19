/** Client mirror of TRACK 2 intelligence + D3 profile (optional fields — safe parse). */

export type PlayerTouchInsight = {
  playerUid: string;
  kickAttempts: number;
  goals: number;
  avgKickPower: number | null;
  avgKickDistance: number | null;
};

export type XThreatPlayerContributionClient = {
  uid: string;
  generated: number;
  received: number;
  netContribution: number;
};

export type XThreatSummaryClient = {
  version: 1;
  gridCols: number;
  gridRows: number;
  matchTotal: number;
  byPlayer: XThreatPlayerContributionClient[];
};

export type PassSequencesClient = {
  chains: { chainId: string; passCount: number; playerUids: string[] }[];
};

export type PlayerRatingClient = {
  uid: string;
  attack: number;
  control: number;
  passing: number;
  finishing: number;
  overall: number;
  badges: string[];
};

export type PlayerRatingsSummaryClient = {
  version: 1;
  players: PlayerRatingClient[];
};

export type ComparisonParticipantClient = {
  uid: string;
  overall: number;
  xThreat: number;
  attack: number;
  control: number;
  passing: number;
  finishing: number;
  touches: number;
  shots: number;
  goals: number;
  possessionContribution: number;
};

export type ComparisonWinnerSideClient = "self" | "opponent" | "tie";

export type MatchComparisonClient = {
  version: 1;
  self: ComparisonParticipantClient;
  opponent: ComparisonParticipantClient;
  winner: {
    overall?: ComparisonWinnerSideClient;
    xThreat?: ComparisonWinnerSideClient;
    attack?: ComparisonWinnerSideClient;
    control?: ComparisonWinnerSideClient;
    passing?: ComparisonWinnerSideClient;
    finishing?: ComparisonWinnerSideClient;
    touches?: ComparisonWinnerSideClient;
    shots?: ComparisonWinnerSideClient;
    goals?: ComparisonWinnerSideClient;
    possessionContribution?: ComparisonWinnerSideClient;
  };
};

export type CoachingInsightsClient = {
  version: 1;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  focusArea: string;
};

export type MatchIntelligenceSummaryClient = {
  matchId: string;
  sessionId: string;
  mode: string;
  eventCount: number;
  matchDurationMs: number | null;
  possessionSegments: { teamId: string; startAtMs: number; endAtMs: number; actorUid?: string | null }[];
  playerTouches: PlayerTouchInsight[];
  passSequences: PassSequencesClient;
  xThreat: XThreatSummaryClient | null;
  playerRatings: PlayerRatingsSummaryClient | null;
  comparison: MatchComparisonClient | null;
  coaching: CoachingInsightsClient | null;
};

export type PlayerProfileClient = {
  playerId: string;
  matchesPlayed: number;
  totalTouches: number;
  goals: number;
  kickAttemptCount: number;
  goalConversion: number;
  avgTouchesPerMatch: number;
  avgKickPower: number | null;
  avgKickDistance: number | null;
  possessionContribution: number;
  lastMatchId: string | null;
  /** TRACK 3 — optional cumulative intelligence */
  avgOverall: number | null;
  avgAttack: number | null;
  avgControl: number | null;
  avgPassing: number | null;
  avgFinishing: number | null;
  bestOverall: number | null;
  avgXThreatPerMatch: number | null;
  totalXThreatGenerated: number | null;
  passCompletionRate: number | null;
  totalPassChains: number | null;
  totalInterceptions: number | null;
  /** TRACK 6B — season rank */
  seasonPoints: number | null;
  seasonTier: string | null;
  seasonRank: string | null;
  seasonWins: number | null;
  seasonLosses: number | null;
  seasonMatches: number | null;
  lastSeasonDelta: number | null;
  lastSeasonRankBefore: string | null;
  lastSeasonPromoted: boolean | null;
  /** TRACK 6C — adaptive coach */
  coachFocusArea: string | null;
  coachFocusSince: number | null;
  coachStreak: number;
  coachLastRecommendation: {
    focusArea: string;
    target: string;
    drills: string[];
    diagnosis: string;
    timeframe: string;
  } | null;
};
