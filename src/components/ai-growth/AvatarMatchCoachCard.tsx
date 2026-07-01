/**
 * J4-1 — Coach Dashboard Avatar Match Simulation
 */
import { useState } from "react";
import { Swords, Loader2 } from "lucide-react";
import {
  buildAvatarMatchSimulationView,
  randomMatchJitter,
  type AvatarMatchSimulationView,
} from "@/lib/ai-growth/matchSimulationView";
import { appendMatchSimulationLog } from "@/lib/ai-growth/matchSimulationLogService";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type MatchPlayer = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
};

type Props = {
  teamId: string;
  home: MatchPlayer | null;
  away: MatchPlayer | null;
  loading?: boolean;
  className?: string;
};

export function AvatarMatchCoachCard({
  teamId,
  home,
  away,
  loading = false,
  className,
}: Props) {
  const [view, setView] = useState<AvatarMatchSimulationView | null>(null);
  const [running, setRunning] = useState(false);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-900",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Avatar Match 준비 중…
      </div>
    );
  }

  if (!home || !away) return null;

  async function handleRun() {
    if (!home || !away) return;
    setRunning(true);
    try {
      const next = buildAvatarMatchSimulationView({
        teamId,
        home,
        away,
        randomHome: randomMatchJitter(),
        randomAway: randomMatchJitter(),
      });
      setView(next);
      try {
        await appendMatchSimulationLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[AvatarMatchCoachCard] log append failed", e);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-white to-orange-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="j4-avatar-match-panel"
      aria-label="Avatar Match Simulation"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-rose-950">
        <Swords className="h-4 w-4 text-rose-600" aria-hidden />
        Avatar Match
      </h3>

      <p className="mt-2 text-sm font-bold text-rose-950">
        {home.playerName}
        <span className="mx-2 text-xs text-rose-600">VS</span>
        {away.playerName}
      </p>

      {view ? (
        <>
          <p className="mt-3 text-lg font-black tabular-nums text-rose-950" data-testid="j4-match-score">
            {view.home.matchScore} vs {view.away.matchScore}
          </p>
          <p className="text-sm font-bold text-rose-900" data-testid="j4-match-result">
            {view.outcomeLabel}
          </p>
          {view.triggerLabels.length > 0 ? (
            <ul className="mt-2 text-xs text-rose-800" data-testid="j4-match-triggers">
              {view.triggerLabels.map((label) => (
                <li key={label}>· {label}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <button
        type="button"
        className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-match-run-button"
      >
        {running ? "실행 중…" : "시뮬레이션 실행"}
      </button>
    </section>
  );
}
