import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import type { MatchmakingMode } from "@/lib/matchmaking/types";
import type { FieldLayoutMode } from "@/lib/live/liveFieldLayout";
import {
  getPortraitHudPadding,
  PORTRAIT_CAMERA,
} from "@/lib/live/liveFieldLayout";
import { exitLiveMatchToMatchmaking } from "@/lib/play/exitToMatchmaking";
import { PostMatchInsightCard } from "@/components/play/PostMatchInsightCard";
import { DevAuthUidBanner } from "@/components/auth/DevAuthUidBanner";
import { usePlayInput } from "@/hooks/usePlayInput";
import type { TeamMatchBridge } from "@/lib/team/teamMatchBridge";
import type { TeamMatchSnapshot } from "@/lib/team/teamMatchTypes";
import { TeamMatchVirtualJoystick } from "./TeamMatchVirtualJoystick";

type Props = {
  sessionId: string;
  mode: MatchmakingMode;
  snapshot: TeamMatchSnapshot;
  myUid: string;
  isHost: boolean;
  matchId?: string;
  fieldLayoutMode: FieldLayoutMode;
  bridge: TeamMatchBridge | null;
  getBridge: () => TeamMatchBridge | null;
};

export function TeamMatchOverlay({
  sessionId,
  mode,
  snapshot,
  myUid,
  isHost,
  matchId,
  fieldLayoutMode,
  bridge,
  getBridge,
}: Props) {
  const navigate = useNavigate();
  const playMode = mode === "8v8" ? "8v8" : "5v5";
  const input = usePlayInput({ mode: playMode, sessionId, getBridge });
  const hud = getPortraitHudPadding();
  const { score, meta } = snapshot;
  const phase = meta.phase;
  const showControls = phase !== "ended";
  const loggedBridgeIdRef = useRef<string | null>(null);

  const controlBottom =
    fieldLayoutMode === "portrait"
      ? `max(${PORTRAIT_CAMERA.controlBottom}px, calc(env(safe-area-inset-bottom, 0px) + 88px))`
      : "24px";

  const shellPad: CSSProperties =
    phase === "ended"
      ? {
          paddingTop: `max(12px, env(safe-area-inset-top, 0px))`,
          paddingBottom: `max(12px, env(safe-area-inset-bottom, 0px))`,
        }
      : fieldLayoutMode === "portrait"
      ? {
          paddingTop: `max(${hud.top}px, env(safe-area-inset-top, 0px))`,
          paddingBottom: `max(${hud.bottom}px, env(safe-area-inset-bottom, 0px))`,
        }
      : { paddingTop: 12, paddingBottom: 24 };

  useEffect(() => {
    console.log("[TEAM KICK] TeamMatchOverlay mounted", {
      sessionId: sessionId.slice(0, 8),
      isHost,
      hasGetBridge: Boolean(getBridge),
    });
  }, [sessionId, isHost, getBridge]);

  useEffect(() => {
    if (!bridge || !import.meta.env.DEV) return;
    if (loggedBridgeIdRef.current === bridge.id) return;
    loggedBridgeIdRef.current = bridge.id;
    console.log("[TEAM BRIDGE REF] overlay", {
      bridgeId: bridge.id,
      sessionId: bridge.sessionId,
      authUid: bridge.authUid,
    });
  }, [bridge]);

  const kickHandlers = {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[TEAM KICK] overlay pressed pointer");
      input.kick();
    },
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[TEAM KICK] overlay pressed click");
      input.kick();
    },
  };

  /** fixed + portal — absolute/calc(max) 깨짐·Phaser 레이어 가림 방지 */
  const controlsLayer =
    showControls && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 z-[9999] flex items-end justify-between px-4"
            style={{ bottom: controlBottom }}
          >
            <TeamMatchVirtualJoystick
              input={input}
              className="pointer-events-auto relative h-28 w-28 shrink-0 touch-none select-none"
            />
            <button
              type="button"
              className="pointer-events-auto flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center rounded-full border-2 border-violet-400/50 bg-violet-600 text-lg font-black text-white shadow-xl active:scale-95"
              aria-label="Kick"
              {...kickHandlers}
            >
              Kick
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-30 flex flex-col"
        style={shellPad}
      >
        <div className="pointer-events-auto flex items-start justify-between gap-2 px-3">
          <div className="rounded-lg border border-indigo-500/40 bg-black/70 px-3 py-2 font-mono text-xs text-indigo-100">
            <p className="font-black tracking-wider">{mode.toUpperCase()} TEAM</p>
            <p>
              {score.teamA} : {score.teamB} · {meta.phase}
            </p>
            {isHost ? (
              <p className="text-[10px] text-emerald-300">HOST · ball authority</p>
            ) : (
              <p className="text-[10px] text-slate-400">guest · kick relay → host</p>
            )}
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/60 px-2 py-1.5 text-[10px] font-bold text-slate-200"
            onClick={() =>
              void exitLiveMatchToMatchmaking(navigate, {
                matchId,
                sessionId,
                queueMode: mode,
                destination: "matchmaking",
              })
            }
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Exit
          </button>
        </div>

        {import.meta.env.DEV ? (
          <details className="pointer-events-auto mx-3 mt-1 max-w-[11rem] rounded-lg border border-amber-500/30 bg-black/50 text-[10px] text-amber-100">
            <summary className="cursor-pointer px-2 py-1 font-semibold">DEV uid</summary>
            <div className="px-1 pb-1">
              <DevAuthUidBanner context={`team-${mode}`} />
            </div>
          </details>
        ) : null}

        <div className="relative min-h-0 flex-1">
          {phase === "ended" ? (
            <div className="pointer-events-auto absolute inset-0 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center">
              <div className="mx-3 mb-3 flex max-h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#070b14] shadow-2xl sm:mx-4 sm:mb-0">
                <div className="shrink-0 border-b border-white/10 px-5 py-4 text-center">
                  <p className="text-lg font-bold text-white">경기 종료</p>
                  <p className="mt-1 font-mono text-3xl font-black text-white">
                    <span className="text-cyan-300">{score.teamA}</span>
                    <span className="mx-1.5 text-slate-600">:</span>
                    <span className="text-fuchsia-300">{score.teamB}</span>
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  <PostMatchInsightCard matchId={matchId} myUid={myUid} enabled={phase === "ended"} />
                </div>
                <div className="shrink-0 space-y-2 border-t border-white/10 px-4 py-4">
                  <button
                    type="button"
                    className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
                    onClick={() =>
                      void exitLiveMatchToMatchmaking(navigate, {
                        matchId,
                        sessionId,
                        queueMode: mode,
                        destination: "matchmaking",
                      })
                    }
                  >
                    매치메이킹으로
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {controlsLayer}
    </>
  );
}
