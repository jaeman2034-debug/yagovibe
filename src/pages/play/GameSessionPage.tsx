import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LiveMatchView } from "@/components/live/LiveMatchView";
import { TeamMatchSessionPlaceholder } from "@/components/live/TeamMatchSessionPlaceholder";
import { useAuth } from "@/context/AuthProvider";
import { callGetGameSession } from "@/lib/matchmaking/matchmakingClient";
import { is1v1LiveSessionMode, isTeamLiveSessionMode } from "@/lib/matchmaking/sessionMode";
import type { MatchmakingMode } from "@/lib/matchmaking/types";
import {
  gameSessionPath,
  matchmakingPath,
  normalizeGameSessionId,
  playgroundPath,
} from "@/lib/play/playEcosystemRoutes";
import { sortPlayerUids } from "@/lib/live/liveMatchTypes";

type SessionDoc = {
  mode?: string;
  status?: string;
  playerUids?: string[];
  matchId?: string;
};

/**
 * 매치메이킹 세션 — mode 분기
 * - `1v1` → LiveMatchView (LiveMatchScene)
 * - `5v5` / `8v8` → TeamMatchScene placeholder (팀전 씬 미구현)
 */
export default function GameSessionPage() {
  const { sessionId: rawSessionId = "" } = useParams<{ sessionId: string }>();
  const sessionId = normalizeGameSessionId(rawSessionId);
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydratedSessionIdRef = useRef<string | null>(null);
  const sessionCacheRef = useRef<SessionDoc | null>(null);
  const fetchGenRef = useRef(0);

  useEffect(() => {
    if (!sessionId.trim() || authLoading) return;
    if (!user?.uid) return;

    if (hydratedSessionIdRef.current === sessionId && sessionCacheRef.current) {
      setSession(sessionCacheRef.current);
      return;
    }

    const gen = ++fetchGenRef.current;
    const sessionChanged = hydratedSessionIdRef.current !== sessionId;
    if (sessionChanged) {
      setSession(null);
      setLoadError(null);
    }

    const timeoutId = window.setTimeout(() => {
      if (fetchGenRef.current !== gen) return;
      setLoadError(
        "세션 로드 시간이 초과되었습니다. 주소의 sessionId가 상대와 같은지 확인하고, 새 매치로 다시 입장해 주세요.",
      );
    }, 18_000);

    void callGetGameSession(sessionId)
      .then((doc) => {
        if (fetchGenRef.current !== gen) return;
        hydratedSessionIdRef.current = sessionId;
        setLoadError(null);
        const docState: SessionDoc = {
          mode: doc.mode,
          status: doc.status,
          playerUids: doc.playerUids,
          matchId: doc.matchId,
        };
        sessionCacheRef.current = docState;
        setSession(docState);
        if (import.meta.env.DEV) {
          console.info("[GameSession] hydrated", {
            sessionId: sessionId.slice(0, 8),
            playerUids: doc.playerUids?.map((u) => u.slice(0, 8)),
            uid: user.uid.slice(0, 8),
          });
          console.info("[session] mode route", {
            mode: doc.mode,
            route: isTeamLiveSessionMode(doc.mode)
              ? "team-placeholder"
              : is1v1LiveSessionMode(doc.mode)
                ? "live-1v1"
                : "unknown",
            sessionId: sessionId.slice(0, 12),
            playerCount: doc.playerUids?.length ?? 0,
          });
        }
      })
      .catch((e) => {
        if (fetchGenRef.current !== gen) return;
        console.error("[GameSession] getGameSession failed", { uid: user.uid, sessionId, e });
        const raw = e instanceof Error ? e.message : String(e);
        setLoadError(raw || "세션을 불러올 수 없습니다.");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      fetchGenRef.current += 1;
      window.clearTimeout(timeoutId);
    };
  }, [sessionId, authLoading, user?.uid]);

  if (rawSessionId && sessionId && rawSessionId !== sessionId) {
    return <Navigate to={gameSessionPath(sessionId)} replace />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-slate-400">
        로그인 확인 중…
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-[#070b14] px-4 py-8 text-slate-100">
        <p className="text-sm text-slate-300">로그인이 필요합니다.</p>
        <Link to={matchmakingPath()} className="mt-4 inline-block text-sm text-cyan-400 underline">
          매치메이킹으로
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-[#070b14] px-4 py-8 text-slate-100">
        <Link
          to={playgroundPath()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          운동장으로
        </Link>
        <p className="mt-6 text-sm text-rose-300">{loadError}</p>
        {import.meta.env.DEV ? (
          <p className="mt-2 font-mono text-[10px] text-slate-500">
            uid: {user.uid.slice(0, 8)}… · session: {sessionId.slice(0, 8)}…
          </p>
        ) : null}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#070b14] px-4 text-center text-slate-400">
        <p>세션 불러오는 중…</p>
        {import.meta.env.DEV && sessionId ? (
          <p className="font-mono text-[10px] text-slate-600">
            session: {sessionId.slice(0, 8)}… · uid: {user.uid.slice(0, 8)}…
          </p>
        ) : null}
      </div>
    );
  }

  const uids = session.playerUids ?? [];
  if (!uids.includes(user.uid)) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-[#070b14] px-4 py-8 text-slate-100">
        <p className="text-sm text-rose-300">이 세션의 참가자가 아닙니다.</p>
        <Link to={matchmakingPath()} className="mt-4 inline-block text-sm text-cyan-400 underline">
          매치메이킹으로
        </Link>
      </div>
    );
  }

  const sessionMode = session.mode as MatchmakingMode | undefined;

  if (import.meta.env.DEV) {
    console.info("[GameSession] render route", {
      mode: sessionMode,
      route: isTeamLiveSessionMode(sessionMode)
        ? "team-placeholder"
        : is1v1LiveSessionMode(sessionMode)
          ? "live-1v1"
          : "unknown",
      sessionId: sessionId.slice(0, 12),
    });
  }

  if (isTeamLiveSessionMode(sessionMode)) {
    return (
      <>
        {import.meta.env.DEV ? (
          <div className="pointer-events-none fixed left-2 top-2 z-[100] rounded-lg border border-indigo-500/40 bg-black/80 px-2 py-1 font-mono text-[10px] text-indigo-200">
            GameSession · mode={sessionMode} → TeamMatch (5v5/8v8)
          </div>
        ) : null}
        <TeamMatchSessionPlaceholder
          sessionId={sessionId}
          mode={sessionMode}
          playerUids={uids}
          matchId={session.matchId}
        />
      </>
    );
  }

  if (!is1v1LiveSessionMode(sessionMode)) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-[#070b14] px-4 py-8 text-slate-100">
        <p className="text-sm text-rose-300">
          알 수 없는 세션 모드({session.mode ?? "없음"})입니다. 1v1은 즉시 플레이, 팀전은 /matchmaking을
          이용해 주세요.
        </p>
        <Link to={matchmakingPath()} className="mt-4 inline-block text-sm text-cyan-400 underline">
          매치메이킹으로
        </Link>
      </div>
    );
  }

  const sorted = sortPlayerUids(uids);
  if (!sorted) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-[#070b14] px-4 py-8 text-slate-100">
        <p className="text-sm text-rose-300">1v1 세션에는 플레이어 2명이 필요합니다.</p>
      </div>
    );
  }

  return (
    <>
      {import.meta.env.DEV ? (
        <div className="pointer-events-none fixed left-2 top-2 z-[100] rounded-lg border border-cyan-500/40 bg-black/80 px-2 py-1 font-mono text-[10px] text-cyan-200">
          GameSession · mode={sessionMode ?? "?"} → LiveMatchView (1v1)
        </div>
      ) : null}
      <LiveMatchView
        sessionId={sessionId}
        myUid={user.uid}
        playerUids={sorted}
        matchId={session.matchId}
      />
    </>
  );
}
