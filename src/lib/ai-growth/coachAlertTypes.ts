import type { GrowthRiskType } from "@/lib/ai-growth/growthRiskTypes";

/** Sprint E-2.3 — Coach Alert */

export type CoachAlertType = GrowthRiskType;

export type CoachAlert = {
  id: string;
  type: CoachAlertType;
  severity: "warning" | "caution";
  emoji: string;
  title: string;
  body: string;
  playerId: string;
  playerName: string;
};

export type CoachAlertFeedResult = {
  headline: string;
  alerts: CoachAlert[];
};
