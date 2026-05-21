import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LiveMatchView } from "@/components/live/LiveMatchView";
import { useAuth } from "@/context/AuthProvider";
import { callGetGameSession } from "@/lib/matchmaking/matchmakingClient";
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
 * 매치메이킹 완료 후 1v1 라이브 매치 (Phaser + RTDB)
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
  const sorted = sortPlayerUids(uids);
  if (!sorted || !sorted.includes(user.uid)) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-[#070b14] px-4 py-8 text-slate-100">
        <p className="text-sm text-rose-300">이 세션의 참가자가 아닙니다.</p>
        <Link to={matchmakingPath()} className="mt-4 inline-block text-sm text-cyan-400 underline">
          매치메이킹으로
        </Link>
      </div>
    );
  }

  return (
    <LiveMatchView
      sessionId={sessionId}
      myUid={user.uid}
      playerUids={sorted}
      matchId={session.matchId}
    />
  );
}
