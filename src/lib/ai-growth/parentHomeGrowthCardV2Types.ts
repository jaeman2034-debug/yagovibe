import type { HubGrowthSummarySnapshot } from "@/lib/ai-growth/hubGrowthSummary";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import type { WeeklyDigestSummary } from "@/lib/ai-growth/weeklyDigestTypes";
import type { TeamAvatarRankingView } from "@/lib/ai-growth/teamAvatarRankingView";

/** Sprint D-4.4-a — Parent Home Growth Card v2 통합 ViewModel */

export type ParentHomeGrowthGoalKind = "level" | "badge" | "session";

export type ParentHomeGrowthGoal = {
  id: string;
  kind: ParentHomeGrowthGoalKind;
  emoji: string;
  label: string;
  detail: string;
};

export type ParentHomeGrowthSummarySlice =
  | {
      mode: "comparison";
      summary: HubGrowthSummarySnapshot;
      latestSessionAt: number;
      latestFirestoreDocId: string;
      historySource: "firestore" | "local";
    }
  | {
      mode: "first_record";
      currentOverall: number;
      latestSessionAt: number;
      latestFirestoreDocId: string;
      historySource: "firestore" | "local";
    }
  | { mode: "none" };

export type ParentHomeDeliveredReportSlice = {
  reportHref: string;
  deltaLabel: string | null;
  isUnread: boolean;
  sessionDocId: string;
};

export type ParentHomeWeeklyDigestSlice = {
  weekKey: string;
  summary: WeeklyDigestSummary;
  reportHref: string;
};

export type ParentHomeGrowthCardV2Data = {
  teamId: string;
  teamName: string;
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  growthSummary: ParentHomeGrowthSummarySlice;
  weeklyDigest: ParentHomeWeeklyDigestSlice | null;
  deliveredReport: ParentHomeDeliveredReportSlice | null;
  goals: ParentHomeGrowthGoal[];
  /** J3-1 — 당일 playerGrowthHistory 세션 (미션 집계) */
  todaySessions: PlayerGrowthSessionDoc[];
  /** J3-4 — 팀 Avatar 순위 projection */
  teamRanking: TeamAvatarRankingView | null;
  /** J4-1 — 매치 상대 (팀 내 2번째 · 없으면 null → 샘플) */
  matchAway: {
    playerId: string;
    playerName: string;
    avatar: PlayerGrowthAvatarDoc;
  } | null;
  /** J4-2 — 팀 vs 팀 홈 로스터 */
  teamRoster: Array<{
    playerId: string;
    playerName: string;
    avatar: PlayerGrowthAvatarDoc;
  }>;
};

export type ParentHomeGrowthCardV2EmptyReason =
  | "no_parent_membership"
  | "no_linked_child"
  | "no_avatar"
  | "load_error";
