/**
 * Vision v6-6 — Parent Intelligence section (guardian-friendly · no version badge)
 */

import { cn } from "@/lib/utils";
import { ParentIntelligenceProvider } from "@/components/vision/parent/ParentIntelligenceProvider";
import { ParentExplainableFiiCard } from "@/components/vision/parent/ParentExplainableFiiCard";
import { ParentIntelligenceSummaryCard } from "@/components/vision/parent/ParentExplainableSummaryCard";
import { ParentRecommendationCard } from "@/components/vision/parent/ParentRecommendationCard";
import {
  ParentSessionSummaryCard,
  ParentGrowthHighlightCard,
  ParentEncouragementCard,
  ParentNextTrainingCard,
  ParentTeamFiiBadge,
  ParentFiiSourceBadge,
} from "@/components/vision/parent/ParentFiiInsightCards";
import { ParentPeerBenchmarkCard } from "@/components/vision/parent/ParentPeerBenchmarkCard";
import { useParentIntelligenceView } from "@/components/vision/parent/ParentIntelligenceProvider";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";

export type ParentIntelligenceSectionProps = {
  teamId: string;
  playerId: string;
  playerName?: string;
  matchId?: string | null;
  trackId?: string;
  className?: string;
};

function ParentIntelligenceGrid({
  teamId,
  playerId,
  matchId,
}: {
  teamId: string;
  playerId: string;
  matchId?: string | null;
}) {
  const { state, isFiiSummarySource } = useParentIntelligenceView();

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900"
        data-testid="parent-intelligence-section-error"
      >
        {state.message}
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div
        className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-6 text-center"
        data-testid="parent-intelligence-section-empty"
      >
        <p className="text-sm font-semibold text-indigo-950">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3" data-testid="parent-intelligence-grid">
      {matchId?.trim() && (isFiiSummarySource || state.status === "ready") ? (
        <VisionPlatformNav
          teamId={teamId}
          matchId={matchId}
          playerId={playerId}
          current="parent-report"
          variant="light"
          compact
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <ParentTeamFiiBadge />
        <ParentFiiSourceBadge />
      </div>
      {isFiiSummarySource ? (
        <>
          <ParentSessionSummaryCard />
          <ParentPeerBenchmarkCard />
          <ParentGrowthHighlightCard />
          <ParentEncouragementCard />
          <ParentNextTrainingCard />
        </>
      ) : (
        <>
          <ParentIntelligenceSummaryCard />
          <ParentPeerBenchmarkCard />
          <ParentExplainableFiiCard />
          <ParentRecommendationCard />
        </>
      )}
      {isFiiSummarySource ? (
        <ParentIntelligenceSummaryCard />
      ) : null}
    </div>
  );
}

export function ParentIntelligenceSection({
  teamId,
  playerId,
  playerName,
  matchId,
  trackId,
  className,
}: ParentIntelligenceSectionProps) {
  return (
    <ParentIntelligenceProvider
      teamId={teamId}
      playerId={playerId}
      playerName={playerName}
      matchId={matchId}
      trackId={trackId}
    >
      <section
        className={cn("space-y-3", className)}
        data-testid="parent-intelligence-section"
        aria-label="경기 성장 리포트"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">
            Parent Intelligence
          </p>
          <h2 className="text-base font-black text-indigo-950">경기 성장 리포트</h2>
          <p className="mt-0.5 text-xs text-indigo-800/80">
            코치 분석을 학부모가 이해하기 쉬운 언어로 정리했습니다.
          </p>
        </div>
        <ParentIntelligenceGrid
          teamId={teamId}
          playerId={playerId}
          matchId={matchId}
        />
      </section>
    </ParentIntelligenceProvider>
  );
}

export default ParentIntelligenceSection;
