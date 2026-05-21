import type { Timestamp } from "firebase/firestore";
import type { PlayPlayerStatsDoc, PlaySixStats, PlayRecentGrowth } from "@/utils/playerStats";

export type MatchFeedbackMood = "good" | "ok" | "bad";

/** `teams/{teamId}/playerStats/{memberId}` 원문 (Timestamp) */
export type TeamPlayerStatsFirestoreDoc = {
  teamId: string;
  memberId: string;
  userId?: string;
  displayName: string;
  number?: string;
  positions: string[];
  mainPosition?: "GK" | "DF" | "MF" | "FW";
  avatarType?: string;
  stats: PlaySixStats;
  ovr: number;
  level: number;
  exp: number;
  badges: string[];
  recentGrowth: PlayRecentGrowth;
  lastMatchAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export type TeamPlayerStatsUI = PlayPlayerStatsDoc & {
  /** UI/디버그용 — 옵션 */
  lastMatchAtMillis?: number;
};
