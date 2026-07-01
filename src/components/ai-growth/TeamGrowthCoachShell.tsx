import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TeamGrowthIntelligencePanel } from "@/components/ai-growth/TeamGrowthIntelligencePanel";
import { TeamGrowthSummaryTab } from "@/components/ai-growth/TeamGrowthSummaryTab";
import { AcademyCoachOperationsDashboardCard } from "@/components/ai-growth/AcademyCoachOperationsDashboardCard";
import { AcademySessionDashboardCard } from "@/components/ai-growth/AcademySessionDashboardCard";
import { AcademyAttendanceDashboardCard } from "@/components/ai-growth/AcademyAttendanceDashboardCard";
import { AcademyCoachPerformanceCard } from "@/components/ai-growth/AcademyCoachPerformanceCard";
import { AcademyDashboardCard } from "@/components/ai-growth/AcademyDashboardCard";
import { AcademyWeeklyDigestCard } from "@/components/ai-growth/AcademyWeeklyDigestCard";
import { MultiAcademyIntelligenceSection } from "@/components/ai-growth/MultiAcademyIntelligenceSection";
import { FederationIntelligenceSection } from "@/components/ai-growth/FederationIntelligenceSection";
import { CoachActionCenterCard } from "@/components/ai-growth/CoachActionCenterCard";
import { CoachAlertCard } from "@/components/ai-growth/CoachAlertCard";
import { CoachDashboardStrip } from "@/components/ai-growth/CoachDashboardStrip";
import { TeamAvatarRankingCoachCard } from "@/components/ai-growth/TeamAvatarRankingCoachCard";
import { AvatarMatchCoachCard } from "@/components/ai-growth/AvatarMatchCoachCard";
import { TeamVsTeamCoachCard } from "@/components/ai-growth/TeamVsTeamCoachCard";
import { AcademyLeagueCoachCard } from "@/components/ai-growth/AcademyLeagueCoachCard";
import { TransferMarketCoachCard } from "@/components/ai-growth/TransferMarketCoachCard";
import {
  SAMPLE_OPPONENT_AVATAR,
  SAMPLE_OPPONENT_ID,
  SAMPLE_OPPONENT_NAME,
} from "@/lib/ai-growth/matchSimulationView";
import { buildTeamAvatarRankingView } from "@/lib/ai-growth/teamAvatarRankingView";
import { CoachTrainingPlannerCard } from "@/components/ai-growth/CoachTrainingPlannerCard";
import { useTeamGrowthIntelligence } from "@/hooks/useTeamGrowthIntelligence";
import { exportAcademyGrowthReportPdf } from "@/lib/ai-growth/exportAcademyGrowthReportPdf";
import { exportAcademyOperationsReportPdf } from "@/lib/ai-growth/exportAcademyOperationsReportPdf";
import { exportTeamGrowthReportPdf } from "@/lib/ai-growth/exportTeamGrowthReportPdf";

type CoachView = "intelligence" | "summary";

type Props = {
  teamId: string;
  teamName: string;
  className?: string;
};

const VIEWS: Array<{ id: CoachView; label: string }> = [
  { id: "intelligence", label: "인텔리전스" },
  { id: "summary", label: "팀 요약" },
];

/** Sprint E-1.3 — AI 탭 코치 뷰 (인텔리전스 · 팀 요약) */
export function TeamGrowthCoachShell({ teamId, teamName, className }: Props) {
  const [view, setView] = useState<CoachView>("intelligence");
  const { data, loading } = useTeamGrowthIntelligence(teamId, teamName);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [academyPdfBusy, setAcademyPdfBusy] = useState(false);
  const [operationsPdfBusy, setOperationsPdfBusy] = useState(false);

  const canExportPdf = Boolean(data?.teamSummary && data.snapshot.trackedCount > 0);
  const canExportAcademyPdf = Boolean(
    data?.academyDashboard && data.snapshot.trackedCount > 0
  );
  const canExportOperationsPdf = Boolean(data?.academyAttendanceIntelligence);

  async function handleExportOperationsPdf() {
    if (!data || operationsPdfBusy || !canExportOperationsPdf) return;
    setOperationsPdfBusy(true);
    try {
      await exportAcademyOperationsReportPdf({
        academyName: data.teamName,
        academyAttendanceIntelligence: data.academyAttendanceIntelligence,
        academySessionIntelligence: data.academySessionIntelligence,
        academyCoachOperations: data.academyCoachOperations,
      });
    } catch (e) {
      console.warn("[TeamGrowthCoachShell] Academy Operations PDF export failed", e);
    } finally {
      setOperationsPdfBusy(false);
    }
  }

  async function handleExportAcademyPdf() {
    if (!data || academyPdfBusy || !canExportAcademyPdf) return;
    setAcademyPdfBusy(true);
    try {
      await exportAcademyGrowthReportPdf({
        academyName: data.teamName,
        academyDashboard: data.academyDashboard,
        academyWeeklyDigest: data.academyWeeklyDigest,
        academyCoachPerformance: data.academyCoachPerformance,
        atRiskPlayers: data.atRiskPlayers,
        coachRecommendations: data.coachRecommendations,
      });
    } catch (e) {
      console.warn("[TeamGrowthCoachShell] Academy PDF export failed", e);
    } finally {
      setAcademyPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!data || pdfBusy || !canExportPdf) return;
    setPdfBusy(true);
    try {
      await exportTeamGrowthReportPdf({
        teamName: data.teamName,
        snapshot: data.snapshot,
        weeklyDigest: data.weeklyDigest,
        atRiskPlayers: data.atRiskPlayers,
        coachRecommendations: data.coachRecommendations,
        teamSummary: data.teamSummary,
        aiSummary: data.aiSummary,
      });
    } catch (e) {
      console.warn("[TeamGrowthCoachShell] PDF export failed", e);
    } finally {
      setPdfBusy(false);
    }
  }

  const teamAvatarRanking = data
    ? buildTeamAvatarRankingView({
        teamName: data.teamName,
        avatars: data.players.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          avatar: player.avatar,
          timeline: null,
        })),
      })
    : null;

  const sortedMatchPlayers = data
    ? [...data.players].sort((a, b) => b.avatar.ovr - a.avatar.ovr)
    : [];
  const coachMatchHome = sortedMatchPlayers[0]
    ? {
        playerId: sortedMatchPlayers[0].playerId,
        playerName: sortedMatchPlayers[0].playerName,
        avatar: sortedMatchPlayers[0].avatar,
      }
    : null;
  const coachMatchAway = sortedMatchPlayers[1]
    ? {
        playerId: sortedMatchPlayers[1].playerId,
        playerName: sortedMatchPlayers[1].playerName,
        avatar: sortedMatchPlayers[1].avatar,
      }
    : {
        playerId: SAMPLE_OPPONENT_ID,
        playerName: SAMPLE_OPPONENT_NAME,
        avatar: SAMPLE_OPPONENT_AVATAR,
      };

  return (
    <div className={cn("space-y-3", className)} data-testid="team-growth-coach-shell">
      <MultiAcademyIntelligenceSection className="mb-1" />
      <FederationIntelligenceSection className="mb-1" />

      <AcademyDashboardCard
        dashboard={data?.academyDashboard ?? null}
        loading={loading}
      />

      <AcademyWeeklyDigestCard
        digest={data?.academyWeeklyDigest ?? null}
        loading={loading}
      />

      <AcademyAttendanceDashboardCard
        intelligence={data?.academyAttendanceIntelligence ?? null}
        loading={loading}
      />

      <AcademySessionDashboardCard
        intelligence={data?.academySessionIntelligence ?? null}
        loading={loading}
      />

      <AcademyCoachOperationsDashboardCard
        operations={data?.academyCoachOperations ?? null}
        loading={loading}
      />

      <AcademyCoachPerformanceCard
        performance={data?.academyCoachPerformance ?? null}
        loading={loading}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 border-teal-300 px-4 text-xs font-bold text-teal-950 hover:bg-teal-50"
          disabled={operationsPdfBusy || loading || !canExportOperationsPdf}
          onClick={() => void handleExportOperationsPdf()}
          data-testid="academy-operations-report-pdf-button"
        >
          {operationsPdfBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          운영 PDF
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 border-violet-300 px-4 text-xs font-bold text-violet-950 hover:bg-violet-50"
          disabled={academyPdfBusy || loading || !canExportAcademyPdf}
          onClick={() => void handleExportAcademyPdf()}
          data-testid="academy-growth-report-pdf-button"
        >
          {academyPdfBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          아카데미 PDF
        </Button>
      </div>

      <CoachDashboardStrip
        dashboard={data?.coachDashboard ?? null}
        loading={loading}
      />

      <TeamAvatarRankingCoachCard
        ranking={teamAvatarRanking}
        loading={loading}
      />

      <AvatarMatchCoachCard
        teamId={teamId}
        home={coachMatchHome}
        away={coachMatchAway}
        loading={loading}
      />

      <TeamVsTeamCoachCard
        teamId={teamId}
        homeTeamLabel={teamName}
        homeRoster={
          data
            ? data.players.map((player) => ({
                playerId: player.playerId,
                playerName: player.playerName,
                avatar: player.avatar,
              }))
            : []
        }
        loading={loading}
      />

      <AcademyLeagueCoachCard
        teamId={teamId}
        homeTeamLabel={teamName}
        homeRoster={
          data
            ? data.players.map((player) => ({
                playerId: player.playerId,
                playerName: player.playerName,
                avatar: player.avatar,
              }))
            : []
        }
        loading={loading}
      />

      <TransferMarketCoachCard
        teamId={teamId}
        homeTeamLabel={teamName}
        focusPlayer={
          coachMatchHome
            ? {
                playerId: coachMatchHome.playerId,
                playerName: coachMatchHome.playerName,
                avatar: coachMatchHome.avatar,
              }
            : null
        }
        homeRoster={
          data
            ? data.players.map((player) => ({
                playerId: player.playerId,
                playerName: player.playerName,
                avatar: player.avatar,
              }))
            : []
        }
        loading={loading}
      />

      <CoachActionCenterCard
        center={data?.coachActionCenter ?? null}
        loading={loading}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <CoachAlertCard feed={data?.coachAlerts ?? null} loading={loading} />
        <CoachTrainingPlannerCard planner={data?.coachTrainingPlanner ?? null} loading={loading} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className="flex flex-1 gap-1 rounded-lg border border-sky-200 bg-sky-50/80 p-1"
          role="tablist"
          aria-label="팀 성장 코치 뷰"
          data-testid="team-growth-coach-tabs"
        >
          {VIEWS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors",
                view === tab.id
                  ? "bg-white text-sky-950 shadow-sm"
                  : "text-sky-700 hover:bg-white/60"
              )}
              onClick={() => setView(tab.id)}
              data-testid={`team-growth-coach-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === "summary" ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-9 shrink-0 gap-1.5 self-stretch px-4 text-xs font-bold sm:self-auto"
            disabled={pdfBusy || loading || !canExportPdf}
            onClick={() => void handleExportPdf()}
            data-testid="team-growth-report-pdf-button"
          >
            {pdfBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden />
            )}
            팀 PDF
          </Button>
        ) : null}
      </div>

      {view === "intelligence" ? (
        <TeamGrowthIntelligencePanel teamId={teamId} teamName={teamName} />
      ) : (
        <TeamGrowthSummaryTab teamId={teamId} teamName={teamName} showPdfButton={false} />
      )}
    </div>
  );
}
