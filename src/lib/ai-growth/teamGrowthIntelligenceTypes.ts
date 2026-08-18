import type { AvatarGrowthRecommendation } from "@/lib/ai-growth/avatarGrowthRecommendationTypes";
import type { GrowthRiskSignal } from "@/lib/ai-growth/growthRiskTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { TeamWeeklyDigest } from "@/lib/ai-growth/teamWeeklyDigestTypes";
import type { TeamGrowthSummary } from "@/lib/ai-growth/teamGrowthSummaryTypes";
import type { CoachActionCenterResult } from "@/lib/ai-growth/coachActionCenterTypes";
import type { CoachAlertFeedResult } from "@/lib/ai-growth/coachAlertTypes";
import type { CoachDashboardSnapshot } from "@/lib/ai-growth/coachDashboardTypes";
import type { CoachTrainingPlannerResult } from "@/lib/ai-growth/coachTrainingPlannerTypes";

/** Sprint E-1 — Team Intelligence (coach-facing rollup) */

export type TeamPlayerGrowthRow = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  risks: GrowthRiskSignal[];
  recommendations: AvatarGrowthRecommendation[];
};

export type TeamGrowthSnapshot = {
  rosterCount: number;
  trackedCount: number;
  avgOvr: number;
  avgLevel: number;
  improvingCount: number;
  decliningCount: number;
  recoveryRiskCount: number;
  stagnationCount: number;
  attendanceRiskCount: number;
};

export type TeamCoachRecommendation = {
  id: string;
  priority: number;
  emoji: string;
  title: string;
  detail: string;
  affectedPlayerNames: string[];
};

export type TeamGrowthAiSummary = {
  paragraphs: string[];
  fullText: string;
};

export type TeamGrowthIntelligenceResult = {
  snapshot: TeamGrowthSnapshot;
  players: TeamPlayerGrowthRow[];
  atRiskPlayers: TeamPlayerGrowthRow[];
  weeklyDigest: TeamWeeklyDigest | null;
  teamSummary: TeamGrowthSummary | null;
  coachActionCenter: CoachActionCenterResult;
  coachTrainingPlanner: CoachTrainingPlannerResult;
  coachAlerts: CoachAlertFeedResult;
  coachDashboard: CoachDashboardSnapshot;
  coachRecommendations: TeamCoachRecommendation[];
  aiSummary: TeamGrowthAiSummary;
};
