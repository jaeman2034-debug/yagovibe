/**
 * Vision v6-5 — Player Intelligence Hub section (reusable outside profile page)
 */

import { cn } from "@/lib/utils";
import { PlayerIntelligenceProvider } from "@/components/vision/player/PlayerIntelligenceProvider";
import { PlayerIntelligenceSummaryCard } from "@/components/vision/player/PlayerIntelligenceSummaryCard";
import { PlayerFiiCard } from "@/components/vision/player/PlayerFiiCard";
import { PlayerPlaymakerContributionCard } from "@/components/vision/player/PlayerPlaymakerContributionCard";
import { PlayerVisionSliceCard } from "@/components/vision/player/PlayerVisionSliceCard";
import { PlayerTacticalSummaryCard } from "@/components/vision/player/PlayerTacticalSummaryCard";
import { PlayerGrowthTrendCard } from "@/components/vision/player/PlayerGrowthTrendCard";
import { VisionVersionBadge } from "@/components/vision/player/VisionVersionBadge";
import type { PlayerIntelligencePersona } from "@/lib/vision/playerIntelligenceTypes";
import { usePlayerIntelligenceView } from "@/components/vision/player/PlayerIntelligenceProvider";

export type PlayerIntelligenceSectionProps = {
  teamId: string;
  playerId: string;
  playerName?: string;
  matchId?: string | null;
  trackId?: string;
  persona: PlayerIntelligencePersona;
  className?: string;
};

function PlayerIntelligenceGrid() {
  const { state } = usePlayerIntelligenceView();

  if (state.status === "error") {
    return (
      <div
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900"
        data-testid="player-intelligence-section-error"
      >
        {state.message}
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div
        className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-6 text-center"
        data-testid="player-intelligence-section-empty"
      >
        <p className="text-sm font-semibold text-violet-950">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3" data-testid="player-intelligence-grid">
      <PlayerIntelligenceSummaryCard />
      <div className="grid gap-3 sm:grid-cols-2">
        <PlayerFiiCard />
        <PlayerGrowthTrendCard />
      </div>
      <PlayerPlaymakerContributionCard />
      <PlayerVisionSliceCard />
      <PlayerTacticalSummaryCard />
      <VisionVersionBadge className="pt-1" />
    </div>
  );
}

export function PlayerIntelligenceSection({
  teamId,
  playerId,
  playerName,
  matchId,
  trackId,
  persona,
  className,
}: PlayerIntelligenceSectionProps) {
  return (
    <PlayerIntelligenceProvider
      teamId={teamId}
      playerId={playerId}
      playerName={playerName}
      matchId={matchId}
      trackId={trackId}
      persona={persona}
    >
      <section
        className={cn("space-y-3", className)}
        data-testid="player-intelligence-section"
        aria-label="Player Intelligence"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
            Player Intelligence Hub
          </p>
          <h2 className="text-base font-black text-violet-950">선수 Intelligence</h2>
        </div>
        <PlayerIntelligenceGrid />
      </section>
    </PlayerIntelligenceProvider>
  );
}

export default PlayerIntelligenceSection;
