/**
 * J4-3 — Coach Dashboard Academy League
 */
import { useState } from "react";
import { Trophy, Loader2 } from "lucide-react";
import {
  buildAcademyLeagueView,
  type AcademyLeagueView,
} from "@/lib/ai-growth/academyLeagueView";
import { appendAcademyLeagueLog } from "@/lib/ai-growth/academyLeagueLogService";
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

export function AcademyLeagueCoachCard({
  teamId,
  homeTeamLabel,
  homeRoster,
  loading = false,
  className,
}: Props) {
  const [view, setView] = useState<AcademyLeagueView | null>(null);
  const [running, setRunning] = useState(false);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Academy League 준비 중…
      </div>
    );
  }

  if (homeRoster.length === 0) return null;

  async function handleRun() {
    setRunning(true);
    try {
      const next = buildAcademyLeagueView({
        teamId,
        homeTeamLabel,
        homeRoster,
        pilotDeterministic: false,
      });
      setView(next);
      try {
        await appendAcademyLeagueLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[AcademyLeagueCoachCard] log append failed", e);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="j4-academy-league-panel"
      aria-label="Academy League"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-emerald-950">
        <Trophy className="h-4 w-4 text-emerald-600" aria-hidden />
        Academy League · Season 1
      </h3>

      {view ? (
        <ul className="mt-3 space-y-1" data-testid="j4-academy-league-standings">
          {view.standings.map((row) => (
            <li
              key={row.teamId}
              className="flex items-center gap-2 rounded-md border border-emerald-100 bg-white/95 px-2 py-1.5 text-xs"
            >
              <span className="font-black text-emerald-800">{row.rank}</span>
              <span className="flex-1 truncate font-semibold text-emerald-950">{row.teamLabel}</span>
              <span className="font-bold tabular-nums text-emerald-900">{row.points}pts</span>
            </li>
          ))}
        </ul>
      ) : null}

      {view ? (
        <p className="mt-2 text-xs font-semibold text-emerald-800" data-testid="j4-academy-league-home-rank">
          {view.homeRankLabel}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-academy-league-run-button"
      >
        {running ? "실행 중…" : "리그 시뮬레이션 실행"}
      </button>
    </section>
  );
}
