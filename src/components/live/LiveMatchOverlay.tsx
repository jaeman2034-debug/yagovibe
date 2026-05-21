import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { requestLiveMatchKick } from "@/lib/live/liveMatchInput";
import type { FieldLayoutMode } from "@/lib/live/liveFieldLayout";
import type { LiveMatchSnapshot } from "@/lib/live/liveMatchTypes";
import { formatLiveMatchResult, resolveLiveScores } from "@/lib/live/liveMatchTypes";
import { getPortraitHudPadding, PORTRAIT_CAMERA } from "@/lib/live/liveFieldLayout";
import { exitLiveMatchToMatchmaking } from "@/lib/play/exitToMatchmaking";
import { LiveMatchVirtualJoystick } from "./LiveMatchVirtualJoystick";
import { LiveMatchDevAuthStrip } from "./LiveMatchDevAuthStrip";
import { sortPlayerUids } from "@/lib/live/liveMatchTypes";

type Props = {
  sessionId: string;
  snapshot: LiveMatchSnapshot;
  myUid: string;
  opponentUid: string;
  matchId?: string;
  localReady: boolean;
  onToggleReady: () => void;
  isHost: boolean;
  fieldLayoutMode: FieldLayoutMode;
  playerIndex: 0 | 1;
};

function formatTime(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LiveMatchOverlay({
  sessionId,
  snapshot,
  myUid,
  opponentUid,
  matchId,
  localReady,
  onToggleReady,
  isHost,
  fieldLayoutMode,
  playerIndex,
}: Props) {
  const navigate = useNavigate();
  const exitSession = (destination: "play" | "matchmaking") => () =>
    void exitLiveMatchToMatchmaking(navigate, { matchId, sessionId, isHost, destination });
  const { match, players } = snapshot;
  const sessionUids = sortPlayerUids(match.playerUids ?? [myUid, opponentUid]);
  const { myScore, oppScore } = resolveLiveScores(myUid, match, fieldLayoutMode);
  const opp = players[opponentUid];
  const phase = match.phase;
  const showControls = phase !== "ended" && phase !== "waiting";
  const controlsActive = phase === "playing" || phase === "goal";
  const oppDisconnected =
    (phase === "playing" || phase === "goal" || phase === "countdown") &&
    (opp?.connected === false || !opp);

  const hud = getPortraitHudPadding();
  const shellPad: CSSProperties =
    phase === "ended"
      ? {
          paddingTop: `max(12px, env(safe-area-inset-top, 0px))`,
          paddingBottom: `max(12px, env(safe-area-inset-bottom, 0px))`,
        }
      : {
          paddingTop: `max(${hud.top}px, env(safe-area-inset-top, 0px))`,
          paddingBottom: `max(${hud.bottom}px, env(safe-area-inset-bottom, 0px))`,
        };
  const controlBottom = `max(${PORTRAIT_CAMERA.controlBottom}px, calc(env(safe-area-inset-bottom, 0px) + 88px))`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col" style={shellPad}>
      <header className="pointer-events-auto flex shrink-0 items-start justify-between gap-2 px-3 pt-1">
        <div className="min-w-0 rounded-xl border border-white/10 bg-[#070b14]/90 px-2.5 py-1.5 backdrop-blur-md">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">1v1 Live</p>
          <p className="font-mono text-xl font-black tabular-nums leading-tight text-white">
            <span className="text-cyan-300">{myScore}</span>
            <span className="mx-1.5 text-slate-600">:</span>
            <span className="text-fuchsia-300">{oppScore}</span>
          </p>
          {phase === "playing" || phase === "goal" ? (
            <p className="text-[11px] text-slate-400">{formatTime(match.timeRemainingMs)}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              oppDisconnected
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-200"
                : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            }`}
          >
            {oppDisconnected ? "\uC7AC\uC811\uC18D" : "LIVE"}
          </span>
          {isHost ? <span className="text-[9px] font-medium text-slate-500">HOST</span> : null}
          <button
            type="button"
            onClick={exitSession("matchmaking")}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#070b14]/90 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 backdrop-blur-md hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Exit
          </button>
        </div>
      </header>

      <section className="relative min-h-0 flex-1">
        {import.meta.env.DEV && sessionUids ? (
          <section className="pointer-events-none absolute left-2 top-2 z-20">
            <LiveMatchDevAuthStrip
              propMyUid={myUid}
              opponentUid={opponentUid}
              sessionPlayerUids={sessionUids}
              playerIndex={playerIndex}
            />
          </section>
        ) : null}
        {phase === "lobby" ? (
          <div
            className="pointer-events-auto absolute left-1/2 w-[min(100%,20rem)] -translate-x-1/2 rounded-xl border border-cyan-500/30 bg-[#070b14]/95 p-4 text-center backdrop-blur-md"
            style={{ top: "35%" }}
          >
            <p className="text-sm font-bold text-white">Match lobby</p>
            <p className="mt-1 text-xs text-slate-400">Both players ready starts countdown.</p>
            <button
              type="button"
              onClick={onToggleReady}
              className={`mt-4 w-full rounded-lg py-2.5 text-sm font-bold ${
                localReady
                  ? "border border-emerald-500/50 bg-emerald-600/30 text-emerald-200"
                  : "bg-gradient-to-r from-cyan-600 to-violet-600 text-white"
              }`}
            >
              {localReady ? "Ready" : "Ready up"}
            </button>
          </div>
        ) : null}

        {phase === "countdown" ? (
          <div className="pointer-events-none flex h-full items-center justify-center">
            <p className="text-5xl font-black text-white drop-shadow-lg">GO!</p>
          </div>
        ) : null}

        {phase === "goal" ? (
          <div className="pointer-events-none flex justify-center pt-8">
            <p className="rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-1 text-lg font-black text-amber-200">
              GOAL!
            </p>
          </div>
        ) : null}

        {phase === "ended" ? (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 max-w-sm rounded-2xl border border-white/15 bg-[#070b14] p-6 text-center">
              <p className="text-lg font-bold text-white">Match ended</p>
              <p className="mt-2 font-mono text-3xl font-black text-white">
                {myScore} : {oppScore}
              </p>
              <p className="mt-2 text-sm text-slate-400">{formatLiveMatchResult(myScore, oppScore)}</p>
              <button
                type="button"
                onClick={exitSession("play")}
                className="mt-5 w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-bold text-white hover:bg-cyan-500"
              >
                Play again
              </button>
              <button
                type="button"
                onClick={exitSession("matchmaking")}
                className="mt-2 block w-full text-center text-xs font-semibold text-slate-500 underline-offset-2 hover:text-cyan-400 hover:underline"
              >
                Queue screen
              </button>
            </div>
          </div>
        ) : null}

        {phase === "waiting" ? (
          <p className="pointer-events-auto absolute left-1/2 top-1/3 -translate-x-1/2 text-sm text-slate-400">
            Waiting for opponent...
          </p>
        ) : null}

        {oppDisconnected && (phase === "playing" || phase === "countdown") ? (
          <div className="pointer-events-auto absolute left-1/2 top-[18%] w-[min(100%,18rem)] -translate-x-1/2 rounded-xl border border-amber-500/40 bg-amber-950/90 px-3 py-2 text-center backdrop-blur-md">
            <p className="text-xs font-bold text-amber-100">Opponent not in this session</p>
            <p className="mt-1 text-[10px] leading-snug text-amber-200/90">
              Opponent must join from Quick Play after matchmaking. If this is a stale solo match, both
              exit and open Quick Play again.
            </p>
          </div>
        ) : null}
      </section>

      {showControls ? (
        <>
          <LiveMatchVirtualJoystick
            sessionId={sessionId}
            className={`pointer-events-auto absolute touch-none select-none transition-opacity ${
              controlsActive ? "opacity-100" : "opacity-30"
            }`}
            style={{ left: 24, bottom: controlBottom, width: 112, height: 112 }}
          />
          <button
            type="button"
            disabled={!controlsActive}
            onPointerDown={(e) => {
              if (!controlsActive) return;
              e.preventDefault();
              requestLiveMatchKick(sessionId);
            }}
            className={`pointer-events-auto absolute flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full border-2 border-fuchsia-400/50 bg-gradient-to-br from-fuchsia-600/90 to-violet-700/90 text-lg font-black text-white shadow-xl transition-[transform,opacity] active:scale-90 ${
              controlsActive ? "opacity-100" : "opacity-30"
            }`}
            style={{ right: 24, bottom: controlBottom }}
            aria-label="Kick"
          >
            Kick
          </button>
          {!controlsActive ? (
            <p
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] text-slate-500"
              style={{ bottom: `calc(${controlBottom} - 18px)` }}
            >
              Controls unlock when match starts
            </p>
          ) : (
            <p
              className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[10px] text-slate-600 sm:block"
              style={{ bottom: `calc(${controlBottom} - 18px)` }}
            >
              WASD / Space
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
