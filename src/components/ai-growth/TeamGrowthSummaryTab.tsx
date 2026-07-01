import { ClipboardList, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoachGrowthAiSummaryPanel } from "@/components/ai-growth/CoachGrowthAiSummaryPanel";
import {
  useTeamGrowthIntelligence,
  type TeamGrowthIntelligenceEmptyReason,
  type TeamGrowthIntelligenceView,
} from "@/hooks/useTeamGrowthIntelligence";
import { exportTeamGrowthReportPdf } from "@/lib/ai-growth/exportTeamGrowthReportPdf";
import type { TeamGrowthSummary } from "@/lib/ai-growth/teamGrowthSummaryTypes";

function emptyMessage(reason: TeamGrowthIntelligenceEmptyReason | null): string {
  switch (reason) {
    case "no_roster":
      return "등록된 선수가 없습니다.";
    case "no_tracked_players":
      return "Step5에서 훈련 리포트를 저장하면 팀 요약이 생성됩니다.";
    case "load_error":
      return "팀 요약을 불러오지 못했습니다.";
    default:
      return "팀 요약을 준비 중입니다.";
  }
}

type Props = {
  teamId: string;
  teamName: string;
  className?: string;
  /** CoachShell 탭 바에 PDF 버튼이 있으면 카드 내 버튼 숨김 */
  showPdfButton?: boolean;
};

function SummaryContent({ summary }: { summary: TeamGrowthSummary }) {
  return (
    <div className="space-y-4" data-testid="team-growth-summary-content">
      <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5">
        <p className="text-sm font-black text-slate-950">{summary.headline}</p>
        <ul className="mt-2 space-y-1">
          {summary.overviewBullets.map((bullet) => (
            <li key={bullet} className="text-xs leading-relaxed text-slate-800">
              · {bullet}
            </li>
          ))}
        </ul>
      </div>

      {summary.playerSummaries.length > 0 ? (
        <div className="space-y-3" data-testid="team-growth-summary-players">
          <p className="text-xs font-bold text-slate-800">선수별 코치 AI 요약</p>
          {summary.playerSummaries.map((player) => (
            <div key={player.playerId} data-testid={`team-summary-player-${player.playerId}`}>
              <p className="mb-1.5 text-xs font-semibold text-slate-700">
                {player.playerName}
                <span className="ml-1.5 font-normal text-slate-500">
                  OVR {player.ovr} · Lv.{player.level}
                </span>
              </p>
              <CoachGrowthAiSummaryPanel coach={player.coach} />
            </div>
          ))}
        </div>
      ) : null}

      {summary.closingParagraphs.length > 0 ? (
        <div
          className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3"
          data-testid="team-growth-summary-narrative"
        >
          <p className="text-xs font-bold text-indigo-950">통합 팀 브리핑</p>
          <div className="mt-2 space-y-2">
            {summary.closingParagraphs.map((paragraph, index) => (
              <p key={index} className="text-xs leading-relaxed text-indigo-950">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Sprint E-1.3 — 코치용 팀 요약 탭 (E-1.1 + E-1.2 + D-5.5 통합) */
export function TeamGrowthSummaryTab({
  teamId,
  teamName,
  className,
  showPdfButton = true,
}: Props) {
  const { data, loading, emptyReason } = useTeamGrowthIntelligence(teamId, teamName);
  const [pdfBusy, setPdfBusy] = useState(false);

  async function handleExportPdf(intelligence: TeamGrowthIntelligenceView) {
    if (pdfBusy || intelligence.snapshot.trackedCount === 0) return;
    setPdfBusy(true);
    try {
      await exportTeamGrowthReportPdf({
        teamName: intelligence.teamName,
        snapshot: intelligence.snapshot,
        weeklyDigest: intelligence.weeklyDigest,
        atRiskPlayers: intelligence.atRiskPlayers,
        coachRecommendations: intelligence.coachRecommendations,
        teamSummary: intelligence.teamSummary,
        aiSummary: intelligence.aiSummary,
      });
    } catch (e) {
      console.warn("[TeamGrowthSummaryTab] PDF export failed", e);
    } finally {
      setPdfBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800",
          className
        )}
        data-testid="team-growth-summary-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        팀 요약 생성 중…
      </div>
    );
  }

  if (!data?.teamSummary) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4",
          className
        )}
        data-testid="team-growth-summary-empty"
        aria-label="팀 요약"
      >
        <div className="flex items-start gap-2">
          <ClipboardList className="mt-0.5 h-5 w-5 text-slate-600" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-slate-950">팀 요약</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-800">{emptyMessage(emptyReason)}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 shadow-sm sm:p-5",
        className
      )}
      data-testid="team-growth-summary-tab"
      aria-label="팀 요약"
    >
      <div
        className={cn(
          "gap-2",
          showPdfButton
            ? "flex flex-col sm:flex-row sm:items-start sm:justify-between"
            : "block"
        )}
      >
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-black text-slate-950">
            <ClipboardList className="h-5 w-5 text-slate-600" aria-hidden />
            팀 요약
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {teamName} · 인텔리전스 · 주간 Digest · 선수별 코치 AI 요약
          </p>
        </div>
        {showPdfButton ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-9 w-full shrink-0 gap-1.5 px-4 text-xs font-bold sm:w-auto"
            disabled={pdfBusy || data.snapshot.trackedCount === 0}
            onClick={() => void handleExportPdf(data)}
            data-testid="team-growth-report-pdf-button"
          >
            {pdfBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden />
            )}
            팀 PDF 다운로드
          </Button>
        ) : null}
      </div>
      <div className="mt-4">
        <SummaryContent summary={data.teamSummary} />
      </div>
    </section>
  );
}
