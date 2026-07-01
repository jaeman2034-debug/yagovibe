/**
 * J4-3 — Parent Home Academy League
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
  pilotDeterministic?: boolean;
  className?: string;
};

export function AcademyLeaguePanel({
  teamId,
  homeTeamLabel,
  homeRoster,
  pilotDeterministic = false,
  className,
}: Props) {
  const [view, setView] = useState<AcademyLeagueView | null>(() =>
    pilotDeterministic && homeRoster.length > 0
      ? buildAcademyLeagueView({
          teamId,
          homeTeamLabel,
          homeRoster,
          pilotDeterministic: true,
        })
      : null
  );
  const [running, setRunning] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  async function handleRun() {
    if (homeRoster.length === 0) return;
    setRunning(true);
    setLogError(null);
    try {
      const next = buildAcademyLeagueView({
        teamId,
        homeTeamLabel,
        homeRoster,
        pilotDeterministic,
      });
      setView(next);
      try {
        await appendAcademyLeagueLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[AcademyLeaguePanel] log append failed", e);
        setLogError("결과는 표시되었지만 기록 저장에 실패했습니다.");
      }
    } finally {
      setRunning(false);
    }
  }

  if (homeRoster.length === 0) return null;

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 px-3 py-3",
        className
      )}
      data-testid="j4-academy-league-panel"
      aria-label="Academy League"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-emerald-950">
        <Trophy className="h-4 w-4 text-emerald-600" aria-hidden />
        {view?.leagueLabel ?? "Academy League"}
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          {view?.seasonLabel ?? "Season 1"}
        </span>
      </h3>

      {view ? (
        <>
          <ul className="mt-3 space-y-1" data-testid="j4-academy-league-standings">
            {view.standings.map((row) => (
              <li
                key={row.teamId}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs",
                  row.isHomeTeam
                    ? "border-emerald-300 bg-emerald-50/90"
                    : "border-emerald-100 bg-white/90"
                )}
              >
                <span className="w-5 font-black tabular-nums text-emerald-800">{row.rank}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-emerald-950">
                  {row.teamLabel}
                </span>
                <span className="font-black tabular-nums text-emerald-900">{row.points}pts</span>
                <span className="tabular-nums text-emerald-700">
                  {row.wins}승 {row.draws}무 {row.losses}패
                </span>
              </li>
            ))}
          </ul>

          <p
            className="mt-3 text-sm font-bold text-emerald-950"
            data-testid="j4-academy-league-home-rank"
          >
            {homeTeamLabel}
            <span className="ml-1 text-xs font-semibold text-emerald-700">
              · {view.homeRankLabel}
            </span>
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs text-emerald-800">리그 시뮬레이션을 실행하면 순위표가 표시됩니다.</p>
      )}

      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-academy-league-run-button"
      >
        {running ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            실행 중…
          </span>
        ) : (
          "리그 시뮬레이션 실행"
        )}
      </button>

      {logError ? <p className="mt-2 text-[10px] text-amber-800">{logError}</p> : null}
    </section>
  );
}
