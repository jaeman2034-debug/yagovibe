/**
 * CV-1 I12-2 — Parent Growth Narrative (read-only · guardian-friendly)
 */
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { ParentHomeGrowthSummarySlice } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";

export type ParentGrowthNarrativeInput = {
  playerName?: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSnapshot: ParentHomeGrowthSummarySlice;
};

export type ParentGrowthNarrativeResult = {
  summary: string;
  strengths: string[];
  focusAreas: string[];
};

export type ParentGrowthNarrativeEmptyReason = "no_avatar" | "insufficient_data";
