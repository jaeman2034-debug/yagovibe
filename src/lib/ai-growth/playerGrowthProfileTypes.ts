import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { ParentHomeGrowthGoal } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";

/** Sprint D-4.5-a — Avatar Profile Page ViewModel */

export type PlayerGrowthProfileHistoryItem = {
  sessionId: string;
  sessionDate: string;
  ovr: number;
};

export type PlayerGrowthProfilePageData = {
  teamId: string;
  teamName: string;
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline;
  goals: ParentHomeGrowthGoal[];
  /** 최신순 세션 이력 */
  history: PlayerGrowthProfileHistoryItem[];
};

export type PlayerGrowthProfileEmptyReason =
  | "not_authenticated"
  | "missing_params"
  | "not_linked"
  | "no_avatar"
  | "load_error";
