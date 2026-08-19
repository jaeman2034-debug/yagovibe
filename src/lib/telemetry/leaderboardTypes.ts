/** Client mirror — TRACK 5B + 6A.2 + 6A.3 leaderboards */

export type LeaderboardScopeClient = "global" | "friends" | "weekly";

export type WeeklyBadgeIdClient = "weekly_winner" | "weekly_top3" | "weekly_top10";

export type WeeklyMetaClient = {
  weekKey: string;
  countdown: {
    days: number;
    hours: number;
    label: string;
  };
  currentUserRank: number | null;
  badge: WeeklyBadgeIdClient | null;
  challenge: string;
};

export type LeaderboardEntryClient = {
  uid: string;
  score: number;
  displayName: string;
  archetype: string;
  rank: number;
};

export type LeaderboardsClient = {
  version: 1;
  scope: LeaderboardScopeClient;
  topOVR: LeaderboardEntryClient[];
  topXThreat: LeaderboardEntryClient[];
  bestFinisher: LeaderboardEntryClient[];
  bestPlaymaker: LeaderboardEntryClient[];
  seasonRP: LeaderboardEntryClient[];
  weeklyRP: LeaderboardEntryClient[];
};

export type LeaderboardsResultClient = {
  leaderboards: LeaderboardsClient | null;
  weeklyMeta: WeeklyMetaClient | null;
};
