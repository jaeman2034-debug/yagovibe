/**
 * J4-2 — Coach Dashboard Team vs Team
 */
import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import {
  buildTeamVsTeamView,
  randomTeamJitter,
  type TeamVsTeamView,
} from "@/lib/ai-growth/teamVsTeamView";
import { appendTeamVsTeamLog } from "@/lib/ai-growth/teamVsTeamLogService";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type RosterEntry = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
};

type Props = {
  teamId: string;
  homeTeamLabel: string;
  homeRoster: RosterEntry[];
  loading?: boolean;
  className?: string;
};

export function TeamVsTeamCoachCard({
  teamId,
  homeTeamLabel,
  homeRoster,
  loading = false,
  className,
}: Props) {
  const [view, setView] = useState<TeamVsTeamView | null>(null);
  const [running, setRunning] = useState(false);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Team vs Team 준비 중…
      </div>
    );
  }

  if (homeRoster.length === 0) return null;

  async function handleRun() {
    setRunning(true);
    try {
      const next = buildTeamVsTeamView({
        teamId,
        homeTeamLabel,
        homeRoster,
        teamRandomHome: randomTeamJitter(),
        teamRandomAway: randomTeamJitter(),
      });
      setView(next);
      try {
        await appendTeamVsTeamLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[TeamVsTeamCoachCard] log append failed", e);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-blue-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="j4-team-vs-team-panel"
      aria-label="Team vs Team"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-indigo-950">
        <Users className="h-4 w-4 text-indigo-600" aria-hidden />
        Team vs Team
      </h3>

      <p className="mt-2 text-sm font-bold text-indigo-950">
        {homeTeamLabel}
        <span className="mx-2 text-xs text-indigo-600">VS</span>
        {view?.awayTeamLabel ?? "샘플 아카데미"}
      </p>

      {view ? (
        <>
          <p className="mt-3 text-lg font-black tabular-nums text-indigo-950" data-testid="j4-team-vs-team-score">
            {view.homeScore} : {view.awayScore}
          </p>
          <p className="text-sm font-bold text-indigo-900" data-testid="j4-team-vs-team-result">
            {view.outcomeLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-indigo-800" data-testid="j4-team-vs-team-mvp">
            MVP {view.mvpPlayerName}
          </p>
          {view.contributionLabels.length > 0 ? (
            <ul className="mt-1 text-xs text-indigo-800" data-testid="j4-team-vs-team-contribution">
              {view.contributionLabels.map((label) => (
                <li key={label}>· {label}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <button
        type="button"
        className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-team-vs-team-run-button"
      >
        {running ? "실행 중…" : "팀 시뮬레이션 실행"}
      </button>
    </section>
  );
}
