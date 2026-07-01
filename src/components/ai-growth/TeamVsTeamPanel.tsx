/**
 * J4-2 — Parent Home Team vs Team
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
  pilotDeterministic?: boolean;
  className?: string;
};

export function TeamVsTeamPanel({
  teamId,
  homeTeamLabel,
  homeRoster,
  pilotDeterministic = false,
  className,
}: Props) {
  const [view, setView] = useState<TeamVsTeamView | null>(() =>
    pilotDeterministic && homeRoster.length > 0
      ? buildTeamVsTeamView({
          teamId,
          homeTeamLabel,
          homeRoster,
          teamRandomHome: -1,
          teamRandomAway: 0,
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
      const next = buildTeamVsTeamView({
        teamId,
        homeTeamLabel,
        homeRoster,
        teamRandomHome: pilotDeterministic ? -1 : randomTeamJitter(),
        teamRandomAway: pilotDeterministic ? 0 : randomTeamJitter(),
      });
      setView(next);
      try {
        await appendTeamVsTeamLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[TeamVsTeamPanel] log append failed", e);
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
        "mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/50 px-3 py-3",
        className
      )}
      data-testid="j4-team-vs-team-panel"
      aria-label="Team vs Team"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-indigo-950">
        <Users className="h-4 w-4 text-indigo-600" aria-hidden />
        Team vs Team
      </h3>

      <p className="mt-2 text-center text-sm font-bold text-indigo-950">
        {homeTeamLabel}
        <span className="mx-2 text-xs font-semibold text-indigo-600">VS</span>
        {view?.awayTeamLabel ?? "샘플 아카데미"}
      </p>

      {view ? (
        <>
          <div className="mt-3 text-center" data-testid="j4-team-vs-team-score">
            <p className="text-[10px] font-semibold text-indigo-700">팀 점수</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums text-indigo-950">
              {view.homeScore}
              <span className="mx-2 text-base font-bold text-indigo-500">:</span>
              {view.awayScore}
            </p>
          </div>

          <p
            className="mt-2 text-center text-sm font-black text-indigo-950"
            data-testid="j4-team-vs-team-result"
          >
            {view.outcomeLabel}
          </p>

          <div className="mt-3 rounded-lg border border-indigo-100 bg-white/90 px-2.5 py-2" data-testid="j4-team-vs-team-mvp">
            <p className="text-[10px] font-semibold text-indigo-700">MVP</p>
            <p className="mt-0.5 text-sm font-bold text-indigo-950">{view.mvpPlayerName}</p>
          </div>

          {view.contributionLabels.length > 0 ? (
            <div
              className="mt-2 rounded-lg border border-indigo-100 bg-white/90 px-2.5 py-2"
              data-testid="j4-team-vs-team-contribution"
            >
              <p className="text-[10px] font-semibold text-indigo-700">Top Contribution</p>
              <ul className="mt-1 space-y-0.5 text-xs font-medium text-indigo-900">
                {view.contributionLabels.map((label) => (
                  <li key={label}>· {label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs text-indigo-800">팀 시뮬레이션을 실행하면 결과가 표시됩니다.</p>
      )}

      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-team-vs-team-run-button"
      >
        {running ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            실행 중…
          </span>
        ) : (
          "팀 시뮬레이션 실행"
        )}
      </button>

      {logError ? <p className="mt-2 text-[10px] text-amber-800">{logError}</p> : null}
    </section>
  );
}
