import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Swords } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import {
  gameSessionPath,
  matchmakingPath,
  playgroundPath,
} from "@/lib/play/playEcosystemRoutes";
import {
  clearSkipActiveSessionRedirect,
  clearStaleActiveMatchForRematch,
  shouldSkipActiveSessionRedirect,
} from "@/lib/play/liveSessionExit";
import { isOtherTabQueueError } from "@/lib/play/matchmakingUi";
import {
  isNonRetryableMatchmakingJoinError,
  matchmakingDeployHintForError,
} from "@/lib/matchmaking/matchmakingJoinErrors";
import { DevAuthUidBanner } from "@/components/auth/DevAuthUidBanner";
import { playersRequiredForModeClient } from "@/lib/matchmaking/playersRequired";

/**
 * 즉시 플레이 — 큐 자동 입장 · 준비 자동 표시 · 세션으로 이동
 * 상세 모드/취소 UI: `/matchmaking`
 */
export default function QuickPlayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mm = useMatchmaking(user?.uid, "1v1");
  const joinStartedRef = useRef(false);
  const readySentRef = useRef(false);
  /** matchId당 stale 정리 1회만 (무한 「이전 매치 정리 중」 방지) */
  const staleCleanupAttemptedForRef = useRef<string | null>(null);
  /** 이번 QuickPlay 방문 중 found/ready → started 흐름만 경기장 이동 (페이지 로드 시 이미 started = stale) */
  const matchFlowRef = useRef<"none" | "prematch" | "started">("none");
  const [flowUi, setFlowUi] = useState<"idle" | "prematch" | "goto_session" | "stale_cleanup">("idle");
  const [staleCleanupRunning, setStaleCleanupRunning] = useState(false);
  const [staleCleanupError, setStaleCleanupError] = useState<string | null>(null);
  const skipRedirect = shouldSkipActiveSessionRedirect();

  const activeMatch =
    mm.match && mm.match.status !== "cancelled" ? mm.match : null;
  const matchId = activeMatch?.matchId;
  const matchStatus = activeMatch?.status;

  const runStaleCleanup = (id: string) => {
    if (staleCleanupRunning) return;
    setStaleCleanupRunning(true);
    setFlowUi("stale_cleanup");
    setStaleCleanupError(null);
    void clearStaleActiveMatchForRematch(id, "1v1")
      .then((ok) => {
        if (!ok) {
          setStaleCleanupError(
            "이전 매치 정리에 실패했습니다. Functions 배포·네트워크를 확인한 뒤 「정리 후 큐 입장」을 눌러 주세요.",
          );
        }
      })
      .finally(() => {
        setStaleCleanupRunning(false);
        setFlowUi("idle");
        joinStartedRef.current = false;
        readySentRef.current = false;
      });
  };

  useEffect(() => {
    if (!activeMatch) {
      matchFlowRef.current = "none";
      setFlowUi("idle");
      joinStartedRef.current = false;
      staleCleanupAttemptedForRef.current = null;
      setStaleCleanupRunning(false);
      setStaleCleanupError(null);
      clearSkipActiveSessionRedirect();
      return;
    }

    const sid = activeMatch.sessionId;
    const status = activeMatch.status;

    if (status === "found" || status === "ready" || status === "starting") {
      matchFlowRef.current = "prematch";
      setFlowUi("prematch");
      return;
    }

    if (status !== "started" || !sid) return;

    if (skipRedirect) {
      if (!matchId || staleCleanupAttemptedForRef.current === matchId) return;
      staleCleanupAttemptedForRef.current = matchId;
      runStaleCleanup(matchId);
      matchFlowRef.current = "started";
      return;
    }

    if (matchFlowRef.current === "prematch") {
      setFlowUi("goto_session");
      clearSkipActiveSessionRedirect();
      joinStartedRef.current = false;
      readySentRef.current = false;
      navigate(gameSessionPath(sid), { replace: true });
      matchFlowRef.current = "started";
      return;
    }

    if (matchFlowRef.current === "none" && matchId) {
      if (staleCleanupAttemptedForRef.current !== matchId) {
        staleCleanupAttemptedForRef.current = matchId;
        runStaleCleanup(matchId);
      }
      matchFlowRef.current = "started";
    }
  }, [activeMatch, matchStatus, matchId, skipRedirect, navigate]);

  useEffect(() => {
    if (!activeMatch) {
      joinStartedRef.current = false;
    }
  }, [activeMatch]);

  useEffect(() => {
    if (!user?.uid) return;
    if (activeMatch) return;
    if (mm.queued) return;
    if (mm.loading) return;
    if (staleCleanupRunning) return;
    if (mm.error && isNonRetryableMatchmakingJoinError(mm.error)) return;
    if (joinStartedRef.current) return;
    joinStartedRef.current = true;
    void mm.joinQueue().finally(() => {
      window.setTimeout(() => {
        joinStartedRef.current = false;
      }, 600);
    });
  }, [
    user?.uid,
    matchId,
    matchStatus,
    mm.queued,
    mm.loading,
    mm.joinQueue,
    mm.error,
    activeMatch,
    staleCleanupRunning,
  ]);

  useEffect(() => {
    if (!user?.uid || mm.queued || activeMatch || mm.loading || mm.error || staleCleanupRunning)
      return;
    const id = window.setTimeout(() => {
      if (!mm.queued && !activeMatch && !mm.loading) {
        joinStartedRef.current = false;
      }
    }, 14_000);
    return () => window.clearTimeout(id);
  }, [user?.uid, mm.queued, activeMatch, mm.loading, mm.error, staleCleanupRunning]);

  useEffect(() => {
    if (mm.error && !mm.queued && !activeMatch) {
      joinStartedRef.current = false;
    }
  }, [mm.error, mm.queued, activeMatch]);

  useEffect(() => {
    if (!user?.uid || !activeMatch) return;
    const already = activeMatch.players[user.uid]?.ready;
    if (already || readySentRef.current) return;
    if (matchStatus === "started") return;
    readySentRef.current = true;
    void mm.setReady(true);
  }, [user?.uid, matchId, matchStatus, activeMatch, mm.setReady]);

  useEffect(() => {
    if (activeMatch || mm.queued) return;
    readySentRef.current = false;
  }, [matchId, mm.queued, activeMatch]);

  const inMatch = Boolean(activeMatch);
  const playerTotal = activeMatch ? Object.keys(activeMatch.players).length : 0;
  const requiredPlayers = playersRequiredForModeClient(mm.mode);
  const waitingAlone = mm.queued && mm.queueMetaCount < requiredPlayers;
  const otherTabBlocked = isOtherTabQueueError(mm.error);
  const joinBlocked = Boolean(mm.error && isNonRetryableMatchmakingJoinError(mm.error));
  const deployHint = matchmakingDeployHintForError(mm.error);
  const cleaningStale = flowUi === "stale_cleanup" || staleCleanupRunning;
  const showSpinner =
    cleaningStale ||
    flowUi === "goto_session" ||
    inMatch ||
    mm.loading ||
    (mm.queued && !joinBlocked) ||
    (!joinBlocked && !mm.error && Boolean(user?.uid));
  const statusLabel = !user
    ? "로그인이 필요합니다"
    : cleaningStale
      ? "이전 매치 정리 중…"
      : flowUi === "goto_session"
        ? "경기장으로 이동 중…"
        : inMatch
          ? `매칭됨 · 준비 확인 중 (${playerTotal}명)`
          : mm.queued
            ? `상대 찾는 중…${mm.queueMetaCount > 0 ? ` (큐 ${mm.queueMetaCount}명)` : ""}`
            : otherTabBlocked
              ? "다른 탭에서 큐 대기 중입니다. 그 탭을 닫거나 「큐 나가기」 후 다시 시도하세요."
              : staleCleanupError
                ? staleCleanupError
                : mm.error
                  ? mm.error
                  : mm.loading
                    ? "연결 중…"
                    : "큐 입장 중…";

  const forceStaleCleanup = () => {
    if (!matchId) {
      clearSkipActiveSessionRedirect();
      joinStartedRef.current = false;
      void mm.joinQueue();
      return;
    }
    staleCleanupAttemptedForRef.current = null;
    runStaleCleanup(matchId);
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

        <div className="mt-8 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 via-slate-900 to-[#070b14] p-6 text-center shadow-xl shadow-black/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/15">
            <Swords className="h-7 w-7 text-cyan-400" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-black text-white">즉시 플레이</h1>
          <p className="mt-2 text-sm text-slate-400">
            1v1 LIVE · 큐 <code className="text-cyan-400">1v1</code> 자동 입장 (플레이어 2명)
          </p>

          <div className="mt-4">
            <DevAuthUidBanner context="quick-play" />
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            {showSpinner ? (
              <Loader2 className="h-10 w-10 animate-spin text-cyan-400" aria-hidden />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-300"
                aria-hidden
              >
                !
              </div>
            )}
            <p
              className={cn(
                "text-sm font-bold",
                joinBlocked ? "text-rose-200" : "text-white",
              )}
              role="status"
            >
              {statusLabel}
            </p>
            {deployHint ? (
              <p className="max-w-xs text-center text-xs leading-relaxed text-amber-200/95">{deployHint}</p>
            ) : null}
            {import.meta.env.DEV && user?.uid ? (
              <p className="font-mono text-[10px] text-slate-500">
                uid: {user.uid.slice(0, 8)}…
                {matchId ? ` · match: ${matchId.slice(0, 8)}…` : ""}
                {mm.queueMetaCount > 0 ? ` · 큐 ${mm.queueMetaCount}명` : ""}
              </p>
            ) : null}
            {waitingAlone ? (
              <div className="max-w-xs space-y-2 text-center text-xs leading-relaxed text-amber-200/95">
                <p>
                  지금 큐 <strong className="text-white">{mm.queueMetaCount}명</strong> — 매칭하려면{" "}
                  <strong className="text-white">최소 {requiredPlayers}명</strong> (다른 uid) 이 같은{" "}
                  <strong className="text-white">{mm.mode}</strong> 큐에 있어야 합니다.
                </p>
                <p className="text-slate-400">
                  상대 계정: <strong className="text-amber-100">/matchmaking</strong> 에서 「{mm.mode}{" "}
                  큐 입장」 또는 <strong className="text-amber-100">/game</strong>(즉시 플레이)을 여세요.
                </p>
              </div>
            ) : null}
            {import.meta.env.DEV && user?.uid ? (
              <p className="max-w-xs text-center font-mono text-[10px] text-slate-500">
                콘솔: <code className="text-cyan-400">window.__YAGO_AUTH_UID</code>
              </p>
            ) : null}
          </div>

          {!user ? (
            <p className="mt-4 text-xs text-amber-200">로그인 후 이용할 수 있어요.</p>
          ) : null}

          {(cleaningStale || staleCleanupError) && matchId ? (
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full border-amber-500/40 text-amber-100"
              disabled={staleCleanupRunning}
              onClick={forceStaleCleanup}
            >
              {staleCleanupRunning ? "정리 중…" : "정리 후 큐 입장"}
            </Button>
          ) : null}

          {!mm.queued && !activeMatch && !mm.loading && !mm.error && !staleCleanupRunning ? (
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full border-white/20"
              onClick={() => {
                joinStartedRef.current = false;
                readySentRef.current = false;
                void mm.joinQueue();
              }}
            >
              큐 입장 재시도
            </Button>
          ) : null}

          {(mm.error && !mm.queued) || otherTabBlocked ? (
            <Button
              type="button"
              className="mt-5 w-full"
              onClick={() => {
                joinStartedRef.current = false;
                readySentRef.current = false;
                void mm.leaveQueue().finally(() => void mm.joinQueue());
              }}
            >
              {otherTabBlocked ? "큐 정리 후 다시 시도" : "다시 시도"}
            </Button>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5">
            <Link
              to={matchmakingPath()}
              className="text-xs font-semibold text-slate-400 underline-offset-2 hover:text-cyan-300 hover:underline"
            >
              모드 선택 · 큐 상세 화면
            </Link>
            {inMatch ? (
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-300"
                disabled={mm.loading}
                onClick={() => {
                  staleCleanupAttemptedForRef.current = null;
                  clearSkipActiveSessionRedirect();
                  void mm.leaveMatch();
                }}
              >
                매칭 취소
              </button>
            ) : mm.queued ? (
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-300"
                disabled={mm.loading}
                onClick={() => void mm.leaveQueue()}
              >
                큐 나가기
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
