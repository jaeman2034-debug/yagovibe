/**
 * J4-1 — Parent Home Avatar Match Simulation
 */
import { useState } from "react";
import { Swords, Loader2 } from "lucide-react";
import {
  buildAvatarMatchSimulationView,
  randomMatchJitter,
  SAMPLE_OPPONENT_AVATAR,
  SAMPLE_OPPONENT_ID,
  SAMPLE_OPPONENT_NAME,
  type AvatarMatchSimulationView,
} from "@/lib/ai-growth/matchSimulationView";
import { appendMatchSimulationLog } from "@/lib/ai-growth/matchSimulationLogService";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type AwayInput = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
};

type Props = {
  teamId: string;
  homePlayerId: string;
  homePlayerName: string;
  homeAvatar: PlayerGrowthAvatarDoc;
  away?: AwayInput | null;
  pilotDeterministic?: boolean;
  className?: string;
};

function resolveAway(away?: AwayInput | null): AwayInput {
  if (away) return away;
  return {
    playerId: SAMPLE_OPPONENT_ID,
    playerName: SAMPLE_OPPONENT_NAME,
    avatar: SAMPLE_OPPONENT_AVATAR,
  };
}

export function AvatarMatchSimulationPanel({
  teamId,
  homePlayerId,
  homePlayerName,
  homeAvatar,
  away,
  pilotDeterministic = false,
  className,
}: Props) {
  const awaySide = resolveAway(away);
  const [view, setView] = useState<AvatarMatchSimulationView | null>(() =>
    pilotDeterministic
      ? buildAvatarMatchSimulationView({
          teamId,
          home: { playerId: homePlayerId, playerName: homePlayerName, avatar: homeAvatar },
          away: awaySide,
          randomHome: 1,
          randomAway: 0,
        })
      : null
  );
  const [running, setRunning] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setLogError(null);
    try {
      const randomHome = pilotDeterministic ? 1 : randomMatchJitter();
      const randomAway = pilotDeterministic ? 0 : randomMatchJitter();
      const next = buildAvatarMatchSimulationView({
        teamId,
        home: { playerId: homePlayerId, playerName: homePlayerName, avatar: homeAvatar },
        away: awaySide,
        randomHome,
        randomAway,
      });
      setView(next);
      try {
        await appendMatchSimulationLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[AvatarMatchSimulationPanel] log append failed", e);
        setLogError("결과는 표시되었지만 기록 저장에 실패했습니다.");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/50 px-3 py-3",
        className
      )}
      data-testid="j4-avatar-match-panel"
      aria-label="Avatar Match Simulation"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-rose-950">
        <Swords className="h-4 w-4 text-rose-600" aria-hidden />
        Avatar Match
      </h3>

      <p className="mt-2 text-center text-sm font-bold text-rose-950">
        {homePlayerName}
        <span className="mx-2 text-xs font-semibold text-rose-600">VS</span>
        {awaySide.playerName}
      </p>

      {view ? (
        <>
          <div className="mt-3 text-center" data-testid="j4-match-score">
            <p className="text-[10px] font-semibold text-rose-700">Match Score</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums text-rose-950">
              {view.home.matchScore}
              <span className="mx-2 text-base font-bold text-rose-500">vs</span>
              {view.away.matchScore}
            </p>
          </div>

          <p
            className="mt-2 text-center text-sm font-black text-rose-950"
            data-testid="j4-match-result"
          >
            {view.outcomeLabel}
          </p>

          {view.triggerLabels.length > 0 ? (
            <div className="mt-3 rounded-lg border border-rose-100 bg-white/90 px-2.5 py-2" data-testid="j4-match-triggers">
              <p className="text-[10px] font-semibold text-rose-700">주요 원인</p>
              <ul className="mt-1 space-y-0.5 text-xs font-medium text-rose-900">
                {view.triggerLabels.map((label) => (
                  <li key={label}>· {label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs text-rose-800">시뮬레이션을 실행하면 경기 결과가 표시됩니다.</p>
      )}

      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-match-run-button"
      >
        {running ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            실행 중…
          </span>
        ) : (
          "시뮬레이션 실행"
        )}
      </button>

      {logError ? <p className="mt-2 text-[10px] text-amber-800">{logError}</p> : null}
    </section>
  );
}
