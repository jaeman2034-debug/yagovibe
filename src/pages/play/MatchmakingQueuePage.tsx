import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Users } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gameSessionPath, playgroundPath } from "@/lib/play/playEcosystemRoutes";
import {
  clearSkipActiveSessionRedirect,
  clearStaleActiveMatchForRematch,
  shouldSkipActiveSessionRedirect,
} from "@/lib/play/liveSessionExit";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import type { MatchmakingMode } from "@/lib/matchmaking/types";

const MODES: { id: MatchmakingMode; label: string; hint: string }[] = [
  { id: "5v5", label: "5v5", hint: "빠른 풀필드" },
  { id: "8v8", label: "8v8", hint: "넓은 피치" },
];

const DEV_MIN_PLAYERS =
  import.meta.env.VITE_MATCHMAKING_DEV_MIN_PLAYERS?.trim() ||
  (import.meta.env.DEV ? "2" : "");

export default function MatchmakingQueuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mm = useMatchmaking(user?.uid, "5v5");
  const staleCleanupAttemptedForRef = useRef<string | null>(null);
  const skipRedirect = shouldSkipActiveSessionRedirect();
  const activeMatch = mm.match && mm.match.status !== "cancelled" ? mm.match : null;

  useEffect(() => {
    if (!activeMatch) {
      staleCleanupAttemptedForRef.current = null;
      clearSkipActiveSessionRedirect();
    }
  }, [activeMatch]);

  useEffect(() => {
    const sid = activeMatch?.sessionId;
    const status = activeMatch?.status;
    const matchId = activeMatch?.matchId;
    if (status !== "started" || !sid) return;

    if (skipRedirect) {
      if (!matchId || staleCleanupAttemptedForRef.current === matchId) return;
      staleCleanupAttemptedForRef.current = matchId;
      void clearStaleActiveMatchForRematch(matchId, "5v5");
      return;
    }

    clearSkipActiveSessionRedirect();
    navigate(gameSessionPath(sid), { replace: true });
  }, [activeMatch?.status, activeMatch?.sessionId, activeMatch?.matchId, skipRedirect, navigate]);

  const inMatch = Boolean(activeMatch);
  const matchCancelled = mm.match?.status === "cancelled";
  const myReady = user?.uid ? mm.match?.players?.[user.uid]?.ready : false;
  const readyCount = mm.match
    ? Object.values(mm.match.players).filter((p) => p.ready).length
    : 0;
  const playerTotal = mm.match ? Object.keys(mm.match.players).length : 0;

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

        <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-[#070b14] p-5 shadow-xl shadow-black/40">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" aria-hidden />
            <h1 className="text-lg font-black">매치 찾기</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">실시간 큐 · 준비 확인 후 게임 세션으로 이동합니다.</p>

          {DEV_MIN_PLAYERS ? (
            <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-200">
              DEV: 최소 {DEV_MIN_PLAYERS}명으로 매치 성사 (Functions `MATCHMAKING_DEV_MIN_PLAYERS`)
            </p>
          ) : null}

          <div className="mt-4 flex gap-2" role="tablist" aria-label="모드 선택">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mm.mode === m.id}
                disabled={mm.queued || inMatch || mm.loading}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-left transition",
                  mm.mode === m.id
                    ? "border-cyan-400/50 bg-cyan-500/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                )}
                onClick={() => mm.setMode(m.id)}
              >
                <span className="text-sm font-black">{m.label}</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">{m.hint}</span>
              </button>
            ))}
          </div>

          {!user ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              로그인 후 큐에 입장할 수 있어요.
            </p>
          ) : null}

          {mm.error ? (
            <p className="mt-3 text-xs font-medium text-rose-300" role="alert">
              {mm.error}
            </p>
          ) : null}

          {matchCancelled ? (
            <div className="mt-5 space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-sm font-bold text-rose-200">매치가 취소되었습니다</p>
              <p className="text-xs text-slate-400">시간 초과 또는 참가자가 나갔을 수 있어요.</p>
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => void mm.joinQueue()}
              >
                다시 찾기
              </Button>
            </div>
          ) : inMatch && mm.match ? (
            <div className="mt-5 space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Match Found</p>
              <p className="text-sm font-bold text-white">
                {mm.match.mode} · {playerTotal}명 매칭됨
              </p>
              <p className="text-xs text-slate-300">
                준비 완료 {readyCount}/{playerTotal}
              </p>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                {Object.values(mm.match.players).map((p) => (
                  <li
                    key={p.uid}
                    className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-1.5"
                  >
                    <span className="truncate font-medium">{p.displayName}</span>
                    {p.ready ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                    ) : (
                      <span className="text-[10px] text-slate-500">대기</span>
                    )}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="h-11 w-full bg-emerald-600 font-bold hover:bg-emerald-500"
                disabled={mm.loading || myReady}
                onClick={() => void mm.setReady(true)}
              >
                {myReady ? "준비 완료" : "준비 완료 표시"}
              </Button>
              {mm.match.status !== "started" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-slate-400"
                  disabled={mm.loading}
                  onClick={() => void mm.leaveMatch()}
                >
                  매치 나가기
                </Button>
              ) : null}
            </div>
          ) : mm.queued ? (
            <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" aria-hidden />
              <p className="text-sm font-bold">상대를 찾는 중…</p>
              <p className="text-xs text-slate-400">
                큐 {mm.queueMetaCount}명
                {mm.estimatedWaitSec != null ? ` · 예상 ${mm.estimatedWaitSec}초` : null}
              </p>
              <p className="text-[10px] text-slate-500">탭을 닫으면 자동으로 큐에서 빠집니다</p>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 bg-transparent text-slate-200"
                disabled={mm.loading}
                onClick={() => void mm.leaveQueue()}
              >
                큐 취소
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="mt-5 h-12 w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-sm font-black"
              disabled={!user || mm.loading}
              onClick={() => void mm.joinQueue()}
            >
              {mm.loading ? "연결 중…" : `${mm.mode} 큐 입장`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
