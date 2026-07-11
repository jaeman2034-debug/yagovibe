/**
 * Vision v6-5 — Player Intelligence Hub (single ViewModel for UI)
 */

import type { PlayerFii } from "@/lib/vision/visionTypes";

export type PlayerIntelligencePersona = "coach" | "parent" | "player";

/** Raw identity keys across YAGO (resolver input) */
export type PlayerIdentityRef = {
  teamId: string;
  playerId: string;
  uid?: string;
  memberId?: string;
  trackId?: string;
};

export type ResolvedPlayerIdentity = PlayerIdentityRef & {
  displayName?: string;
};

export type PlayerIntelligenceSummary = {
  playerName: string;
  teamName: string;
  matchLabel: string | null;
  headline: string;
};

export type PlayerIntelligenceGrowth = {
  ovr: number | null;
  level: number | null;
  sessionCount: number;
  trendLabel: string | null;
  badgeCount: number;
};

export type PlayerIntelligenceFii = {
  score: number | null;
  rank: number | null;
  rankTotal: number | null;
  axes: PlayerFii["axes"] | null;
};

export type PlayerIntelligenceVisionSlice = {
  hasAnalysis: boolean;
  forwardPassRate: number | null;
  bestPressureZone: string | null;
  compactness: number | null;
  tacticalSummary: string | null;
  tacticalStrengths: string[];
};

export type PlayerIntelligencePlaymaker = {
  isPlaymaker: boolean;
  contributionLabel: string;
  score: number | null;
};

export type PlayerIntelligenceAvatar = {
  tier: string | null;
  visionStat: number | null;
  pressureStat: number | null;
  recoveryStat: number | null;
};

export type PlayerIntelligenceVersion = {
  visionEngine: string;
  schema: string;
  detectionModel: string;
  trackingModel: string;
  fiiEngine: string;
};

/** Unified ViewModel — UI consumes this only (no direct Firestore) */
export type PlayerIntelligenceView = {
  identity: ResolvedPlayerIdentity;
  persona: PlayerIntelligencePersona;
  matchId: string | null;
  summary: PlayerIntelligenceSummary;
  growth: PlayerIntelligenceGrowth;
  fii: PlayerIntelligenceFii;
  vision: PlayerIntelligenceVisionSlice;
  playmaker: PlayerIntelligencePlaymaker;
  avatar: PlayerIntelligenceAvatar;
  recommendation: string;
  version: PlayerIntelligenceVersion;
};

export type PlayerIntelligenceLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | { status: "ready"; view: PlayerIntelligenceView };

export const DEFAULT_PLAYER_INTELLIGENCE_VERSION: PlayerIntelligenceVersion = {
  visionEngine: "Vision Engine v6.2",
  schema: "Schema v1",
  detectionModel: "YOLO11",
  trackingModel: "ByteTrack",
  fiiEngine: "FII v2",
};
