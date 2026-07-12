/**
 * RC4-3 M3 — Match Detail vision panel (fii_summary binding)
 */

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  VisionCoachDashboardProvider,
  useVisionCoachDashboard,
} from "@/components/vision/VisionCoachDashboardProvider";
import { VisionTeamFiiCard, VisionMatchSummaryCard, VisionCoachDecisionBriefCard, VisionCoachInsightCard } from "@/components/vision/VisionCoachInsightCards";
import { CoachMatchFlowTrendCard } from "@/components/vision/CoachMatchFlowTrendCard";
import { VisionFiiRankingTable } from "@/components/vision/VisionFiiRankingTable";
import { VisionTacticalReportCard } from "@/components/vision/VisionTacticalReportCard";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";
import { VisionMatchTimelinePanel } from "@/components/vision/VisionMatchTimelinePanel";
import { VisionJobMonitorPanel } from "@/components/vision/VisionJobMonitorPanel";
import { visionTeamHubPath } from "@/lib/vision/visionPlatformRoutes";

type Props = {
  teamId: string;
  matchId: string;
  teamName?: string;
  className?: string;
};

function VisionMatchDetailInner({ teamId, matchId, teamName }: Props) {
  const { loading, view, cardState, variant } = useVisionCoachDashboard();
  const top3 = view?.playerRanking.slice(0, 3) ?? [];

  return (
    <div className="space-y-6" data-testid="vision-match-detail-panel">
      <header className="space-y-3">
        <p className="text-xs font-medium text-violet-700">{teamName ?? "팀"} · Vision Match Detail</p>
        <h1 className="text-xl font-black text-violet-950">
          {view?.matchHeadline ?? "경기 영상 분석"}
        </h1>
        {view?.fiiDataSource === "fii_summary" ? (
          <p className="text-xs text-violet-600">FII Summary (RC4-2 M2) 연동</p>
        ) : null}
        <VisionPlatformNav
          teamId={teamId}
          matchId={matchId}
          current="match-detail"
          variant="light"
        />
        <VisionJobMonitorPanel teamId={teamId} matchId={matchId} variant="light" compact />
      </header>

      {loading ? (
        <p className="text-sm text-violet-700">분석 데이터 불러오는 중…</p>
      ) : cardState === "empty" ? (
        <p className="text-sm text-violet-800">이 경기에 대한 Vision/FII 데이터가 없습니다.</p>
      ) : (
        <>
          <VisionCoachDecisionBriefCard />

          <div className="grid gap-3 md:grid-cols-2">
            <VisionTeamFiiCard />
            <VisionMatchSummaryCard />
          </div>

          {top3.length > 0 ? (
            <section data-testid="vision-match-top-players">
              <h2 className="mb-2 text-sm font-black text-violet-950">Top 3 Players</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                {top3.map((p) => (
                  <div
                    key={p.trackId ?? p.rank}
                    className="rounded-2xl border border-violet-200 bg-white p-3 text-center shadow-sm"
                  >
                    <p className="text-[10px] font-bold text-violet-600">#{p.rank}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-violet-950">{p.name}</p>
                    <p className="text-2xl font-black tabular-nums text-violet-800">{p.fii}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <VisionCoachInsightCard />

          <CoachMatchFlowTrendCard />

          <div className="space-y-3">
            <VisionFiiRankingTable teamId={teamId} matchId={matchId} />
            <VisionTacticalReportCard />
          </div>

          <VisionMatchTimelinePanel teamId={teamId} matchId={matchId} variant="light" />
        </>
      )}
    </div>
  );
}

export function VisionMatchDetailPanel({ teamId, matchId, teamName, className }: Props) {
  return (
    <VisionCoachDashboardProvider teamId={teamId} matchId={matchId} variant="light">
      <div className={cn("mx-auto max-w-3xl px-4 py-6", className)}>
        <VisionMatchDetailInner teamId={teamId} matchId={matchId} teamName={teamName} />
      </div>
    </VisionCoachDashboardProvider>
  );
}

export function VisionMatchDetailPageShell({
  teamId,
  matchId,
  teamName,
}: {
  teamId: string;
  matchId: string;
  teamName?: string;
}) {
  return (
    <div className="min-h-screen bg-violet-50/40">
      <div className="border-b border-violet-100 bg-white px-4 py-3">
        <Button variant="ghost" size="sm" className="gap-1 text-violet-800" asChild>
          <Link to={visionTeamHubPath(teamId, matchId)}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            팀 플레이로 돌아가기
          </Link>
        </Button>
      </div>
      <VisionMatchDetailPanel teamId={teamId} matchId={matchId} teamName={teamName} />
    </div>
  );
}
