import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { requestPlaygroundKick } from "@/game/playground/playgroundInput";
import {
  getPlaygroundTrialXp,
  subscribePlaygroundTrialXp,
} from "@/game/playground/playgroundXpTrial";
import { instantPlayPath } from "@/lib/play/playEcosystemRoutes";
import { PlaygroundVirtualJoystick } from "./PlaygroundVirtualJoystick";

/**
 * Phaser 위 React HUD — XP trial, 나가기, 모바일 조작
 */
export function PlaygroundGameOverlay() {
  const navigate = useNavigate();
  const [trialXp, setTrialXp] = useState(() => getPlaygroundTrialXp());
  const [status, setStatus] = useState<"loading" | "live">("loading");

  useEffect(() => {
    const t = window.setTimeout(() => setStatus("live"), 400);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => subscribePlaygroundTrialXp(() => setTrialXp(getPlaygroundTrialXp())), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col">
      <header className="pointer-events-auto flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 rounded-xl border border-white/10 bg-[#070b14]/85 px-3 py-2 backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">YAGO Field</p>
          <p className="mt-0.5 text-xs font-bold text-white">
            XP Trial <span className="font-mono text-cyan-300">+{trialXp}</span>
          </p>
          <p className="text-[10px] text-slate-500">이동 +1 · 슛 +5 (데모, 저장 없음)</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              status === "live"
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border border-white/15 bg-white/5 text-slate-400"
            }`}
          >
            {status === "live" ? "LIVE" : "로딩"}
          </span>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#070b14]/90 px-3 py-2 text-xs font-bold text-slate-200 backdrop-blur-md hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            나가기
          </button>
        </div>
      </header>

      <div className="flex-1" />

      <footer className="pointer-events-none relative h-36 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <PlaygroundVirtualJoystick className="pointer-events-auto absolute bottom-4 left-4 h-28 w-28 touch-none select-none" />

        <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              requestPlaygroundKick();
            }}
            className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-fuchsia-400/50 bg-gradient-to-br from-fuchsia-600/90 to-violet-700/90 text-lg font-black text-white shadow-xl shadow-fuchsia-950/50 active:scale-95"
            aria-label="슛"
          >
            슛!
          </button>
          <p className="text-center text-[10px] font-medium text-slate-500">공 근처에서</p>
        </div>

        <p className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-600">
          PC: WASD · Space
          <span className="mx-1.5 text-slate-700">|</span>
          <Link to={instantPlayPath()} className="font-semibold text-cyan-400 underline-offset-2 hover:underline">
            ⚽ 1v1 즉시 플레이
          </Link>
          <span className="mx-1.5 text-slate-700">|</span>
          <Link to="/playground/hub" className="text-cyan-500/80 underline-offset-2 hover:underline">
            모드 허브
          </Link>
        </p>
      </footer>
    </div>
  );
}
