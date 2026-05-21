import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DevAuthUidBanner } from "@/components/auth/DevAuthUidBanner";
import { exitLiveMatchToMatchmaking } from "@/lib/play/exitToMatchmaking";
import { playgroundPath } from "@/lib/play/playEcosystemRoutes";
import type { MatchmakingMode } from "@/lib/matchmaking/types";

type Props = {
  sessionId: string;
  mode: MatchmakingMode;
  playerUids: string[];
  matchId?: string;
};

/**
 * 5v5 / 8v8 — TeamMatchScene 미구현. LiveMatchScene(1v1)으로 보내지 않음.
 */
export function TeamMatchSessionPlaceholder({ sessionId, mode, playerUids, matchId }: Props) {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const goMatchmaking = () => {
    if (leaving) return;
    setLeaving(true);
    setLeaveError(null);
    void exitLiveMatchToMatchmaking(navigate, {
      matchId,
      sessionId,
      queueMode: mode,
      destination: "matchmaking",
    }).catch((e) => {
      console.error("[TeamMatchSessionPlaceholder] exit failed", e);
      setLeaveError(e instanceof Error ? e.message : "매치메이킹으로 이동하지 못했습니다.");
      setLeaving(false);
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="mx-auto max-w-md px-4 py-6">
        <Link
          to={playgroundPath()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          운동장으로
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-[#070b14] p-5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
              {mode} · Team match
            </p>
          </div>
          <h1 className="mt-2 text-lg font-black text-white">팀전 씬 준비 중</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            이 세션은 <strong className="text-slate-200">{mode}</strong> 매치입니다.{" "}
            <strong className="text-rose-200">1v1 Live 씬이 아닙니다.</strong> TeamMatchScene 연동 전까지
            경기장 Phaser는 열리지 않습니다.
          </p>

          <ul className="mt-4 space-y-1 font-mono text-[10px] text-slate-500">
            <li>session: {sessionId.slice(0, 12)}…</li>
            <li>players: {playerUids.length}명</li>
            {matchId ? <li>match: {matchId.slice(0, 12)}…</li> : null}
          </ul>

          {import.meta.env.DEV ? (
            <p className="mt-3 text-xs text-amber-200/90">
              1v1 테스트는 <strong className="text-white">즉시 플레이(/game)</strong> — 큐 모드{" "}
              <code className="text-cyan-300">1v1</code>
            </p>
          ) : null}

          <div className="mt-4">
            <DevAuthUidBanner context={`session-${mode}`} />
          </div>

          {leaveError ? (
            <p className="mt-3 text-xs font-medium text-rose-300" role="alert">
              {leaveError}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-5 w-full"
            variant="default"
            disabled={leaving}
            onClick={goMatchmaking}
          >
            {leaving ? "나가는 중…" : "매치메이킹으로"}
          </Button>
        </div>
      </div>
    </div>
  );
}
