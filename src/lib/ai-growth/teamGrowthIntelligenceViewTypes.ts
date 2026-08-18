import type { AcademyAttendanceIntelligenceResult } from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";
import type { AcademyCoachOperationsResult } from "@/lib/ai-growth/academyCoachOperationsTypes";
import type { AcademyCoachPerformanceResult } from "@/lib/ai-growth/academyCoachPerformanceTypes";
import type { AcademyDashboardResult } from "@/lib/ai-growth/academyDashboardTypes";
import type { AcademySessionIntelligenceResult } from "@/lib/ai-growth/academySessionIntelligenceTypes";
import type { AcademyWeeklyDigest } from "@/lib/ai-growth/academyWeeklyDigestTypes";
import type { TeamGrowthIntelligenceResult } from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

export type TeamGrowthIntelligenceView = TeamGrowthIntelligenceResult & {
  teamId: string;
  teamName: string;
  academyDashboard: AcademyDashboardResult | null;
  academyWeeklyDigest: AcademyWeeklyDigest | null;
  academyCoachPerformance: AcademyCoachPerformanceResult | null;
  academyAttendanceIntelligence: AcademyAttendanceIntelligenceResult | null;
  academySessionIntelligence: AcademySessionIntelligenceResult | null;
  academyCoachOperations: AcademyCoachOperationsResult | null;
};

export type TeamGrowthIntelligenceEmptyReason = "no_roster" | "no_tracked_players" | "load_error";
