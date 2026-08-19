/**
 * J1-3a — Parent Home Monthly PDF export (read-only · client-side · no new SoT)
 */
import { buildGrowthAiSummaryFromAvatar } from "@/lib/ai-growth/growthAiSummaryEngine";
import { exportMonthlyGrowthReportPdf } from "@/lib/ai-growth/exportMonthlyGrowthReportPdf";
import { buildMonthlyGrowthReport } from "@/lib/ai-growth/monthlyGrowthReport";
import { loadGrowthHistoryCanonical } from "@/lib/ai-growth/playerGrowthHistoryService";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { buildWeeklyGrowthDigestForPdfExport } from "@/lib/ai-growth/weeklyGrowthDigestEngine";

export async function exportParentMonthlyGrowthPdf(input: {
  teamId: string;
  playerId: string;
  playerName: string;
  teamName: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
}): Promise<string> {
  const history = await loadGrowthHistoryCanonical(input.teamId, input.playerName, {
    playerId: input.playerId,
  });

  const report = buildMonthlyGrowthReport({
    sessions: history.sessions,
    playerName: input.playerName,
    teamName: input.teamName,
  });

  return exportMonthlyGrowthReportPdf({
    ...report,
    recentSessionTimeline: input.timeline,
    weeklyGrowthDigest: buildWeeklyGrowthDigestForPdfExport({
      avatar: input.avatar,
      timeline: input.timeline,
    }),
    aiGrowthSummary: buildGrowthAiSummaryFromAvatar({
      playerName: input.playerName,
      avatar: input.avatar,
      timeline: input.timeline,
    }),
  });
}
