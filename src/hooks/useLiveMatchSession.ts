import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  get,
  onDisconnect,
  onValue,
  ref,
  runTransaction,
  set,
  update,
} from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, rtdb } from "@/lib/firebase";
import {
  commitHostMatchState,
  getLiveMatchBridge,
  setHostMatchCommitHandler,
  setLiveMatchBridge,
  updateBridgeSnapshot,
} from "@/lib/live/liveMatchBridge";
import {
  areAllPlayersMatchReady,
  buildLobbyCountdownMatch,
  logPlayerReadyDiagnostics,
  phaseRank,
  isGoalCelebration,
  pickAdvancedMatch,
  pickAdvancedPhase,
  resolveMatchPhase,
} from "@/lib/live/liveMatchLobby";
import { clearLiveMatchMove, consumeLiveMatchKick } from "@/lib/live/liveMatchInput";
import {
  defaultBallPosition,
  detectFieldLayoutMode,
  getLiveFieldLayout,
  sanitizeBallCoords,
  spawnForPlayerIndex,
  type FieldLayoutMode,
  type LiveFieldLayout,
} from "@/lib/live/liveFieldLayout";
import {
  liveBallPath,
  liveCountdownSignalPath,
  liveFieldLayoutModePath,
  liveMatchPath,
  liveMetaPath,
  liveParticipantPath,
  livePlayerPath,
  livePlayersPath,
} from "@/lib/live/liveMatchRtdb";
import {
  LIVE_MATCH_TIMING,
  normalizePlayerUids,
  pickCanonicalPlayers,
  pickHostUid,
  resolveOpponentUid,
  sortPlayerUids,
  type LiveBallState,
  type LiveMatchSnapshot,
  type LiveMatchState,
  type LivePlayerState,
} from "@/lib/live/liveMatchTypes";
import {
  logMovementWrite,
  resolveMovementWriteContext,
} from "@/lib/live/liveMovementRtdb";
import {
  assertCanonicalPlayerWritePath,
  findAlienPlayerKeys,
  isOpponentPoseEchoingOwn,
  logRtdbPlayersRead,
  logRtdbPlayersSmoke,
  warnRtdbPlayerSlotCollision,
} from "@/lib/live/liveRtdbDiagnostics";

type Options = {
  sessionId: string;
  myUid: string;
  playerUids: string[];
};

type LiveSessionHook = {
  ready: boolean;
  /** Phaser mount 전 RTDB bridge 준비 완료 */
  bridgeReady: boolean;
  fieldLayoutMode: FieldLayoutMode | null;
  error: string | null;
  isHost: boolean;
  opponentUid: string;
  playerIndex: 0 | 1;
  snapshot: LiveMatchSnapshot;
  setLocalReady: (value: boolean | ((prev: boolean) => boolean)) => void;
  /** 준비 토글 + RTDB `players/{uid}/ready` 즉시 기록 */
  toggleReady: () => void;
  localReady: boolean;
};

function defaultPlayer(x: number, y: number): LivePlayerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    ready: false,
    connected: true,
    lastSeen: Date.now(),
  };
}

function defaultBall(layout: LiveFieldLayout): LiveBallState {
  const { x, y } = defaultBallPosition(layout);
  return { x, y, vx: 0, vy: 0, ownerUid: null };
}

function formatRtdbError(label: string, err: unknown): string {
  const parts: string[] = [];
  if (err && typeof err === "object") {
    const o = err as { code?: string; message?: string };
    if (o.code) parts.push(String(o.code));
    if (o.message) parts.push(String(o.message));
  } else if (err instanceof Error) {
    parts.push(err.message);
  } else if (err != null) {
    parts.push(String(err));
  }
  const detail = parts.join(" ").trim();
  if (/permission|denied/i.test(detail)) {
    return `RTDB 권한 오류 (${label}). rules 배포·세션 참가자·로그인 계정을 확인하세요.`;
  }
  if (detail.length <= 4) {
    return `라이브 세션 RTDB 오류 (${label}). 개발자 도구 콘솔의 [liveMatch] 로그를 확인하세요.`;
  }
  return detail;
}

function defaultMatch(hostUid: string, playerUids: [string, string]): LiveMatchState {
  return {
    phase: "lobby",
    scoreA: 0,
    scoreB: 0,
    timeRemainingMs: LIVE_MATCH_TIMING.matchDurationMs,
    startedAt: 0,
    hostUid,
    playerUids,
    goalResetAt: 0,
  };
}

function buildInitialSnapshot(
  hostUid: string,
  sorted: [string, string],
  layout: LiveFieldLayout,
): LiveMatchSnapshot {
  const s0 = spawnForPlayerIndex(layout, 0);
  const s1 = spawnForPlayerIndex(layout, 1);
  return {
    players: {
      [sorted[0]]: defaultPlayer(s0.x, s0.y),
      [sorted[1]]: defaultPlayer(s1.x, s1.y),
    },
    ball: defaultBall(layout),
    match: defaultMatch(hostUid, sorted),
  };
}

function playersSnapshotEqual(
  a: Record<string, LivePlayerState>,
  b: Record<string, LivePlayerState>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    const pa = a[k];
    const pb = b[k];
    if (!pb) return false;
    if (
      pa.x !== pb.x ||
      pa.y !== pb.y ||
      pa.vx !== pb.vx ||
      pa.vy !== pb.vy ||
      pa.ready !== pb.ready ||
      pa.connected !== pb.connected
    ) {
      return false;
    }
  }
  return true;
}

export function useLiveMatchSession({ sessionId, myUid, playerUids: rawUids }: Options): LiveSessionHook {
  const uidA = rawUids[0] ?? "";
  const uidB = rawUids[1] ?? "";
  const sorted = useMemo(() => sortPlayerUids(rawUids), [uidA, uidB, rawUids.length]);
  const [rtdbHostUid, setRtdbHostUid] = useState<string | null>(null);
  const opponentUid = sorted ? resolveOpponentUid(myUid, sorted) ?? "" : "";
  const playerIndex: 0 | 1 = sorted && sorted[0] === myUid ? 0 : 1;
  const provisionalHostUid = rtdbHostUid ?? (sorted ? pickHostUid(sorted) : myUid);

  const [fieldLayoutMode, setFieldLayoutMode] = useState<FieldLayoutMode | null>(null);
  const fieldLayout = fieldLayoutMode ? getLiveFieldLayout(fieldLayoutMode) : null;
  const [ready, setReady] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveMatchSnapshot>(() => {
    const layout = getLiveFieldLayout(detectFieldLayoutMode());
    if (!sorted) {
      return {
        players: {},
        ball: defaultBall(layout),
        match: defaultMatch(provisionalHostUid, [myUid || "?", "?"] as [string, string]),
      };
    }
    return buildInitialSnapshot(provisionalHostUid, sorted, layout);
  });

  const hostUid =
    rtdbHostUid ??
    (snapshot.match.hostUid || (sorted ? pickHostUid(sorted) : myUid));
  /** RTDB match/ball 쓰기·카운트다운 — sorted[0] 또는 RTDB hostUid */
  const isMatchOwner = Boolean(sorted && myUid && hostUid === myUid);
  const isHost = isMatchOwner;
  const snapshotMatchRef = useRef(snapshot.match);
  snapshotMatchRef.current = snapshot.match;

  /** 세션당 1회 RTDB player 등록 (fieldLayout 변경 시 ready:false 재기록 방지) */
  const playerInitSessionRef = useRef<string | null>(null);
  const lobbyCountdownInFlightRef = useRef(false);
  const rtdbPlayersRef = useRef<Record<string, LivePlayerState>>({});
  const mergedPlayersRef = useRef<Record<string, LivePlayerState>>({});
  const rtdbMatchRef = useRef<LiveMatchState | null>(null);
  /** syncHostState / Phaser publish가 lobby로 phase를 되돌리지 못하게 */
  const phaseFloorRef = useRef<LiveMatchState["phase"]>("lobby");
  const [committedPhase, setCommittedPhase] = useState<LiveMatchState["phase"]>("lobby");

  const bumpPhaseFloor = useCallback(
    (incoming: Pick<LiveMatchState, "phase" | "goalResetAt"> | LiveMatchState["phase"]) => {
      const inc =
        typeof incoming === "string"
          ? ({ phase: incoming, goalResetAt: 0 } as Pick<LiveMatchState, "phase" | "goalResetAt">)
          : incoming;
      const base = rtdbMatchRef.current;
      const stub = (phase: LiveMatchState["phase"], goalResetAt = 0): LiveMatchState => ({
        phase,
        goalResetAt,
        scoreA: base?.scoreA ?? 0,
        scoreB: base?.scoreB ?? 0,
        timeRemainingMs: base?.timeRemainingMs ?? 0,
        startedAt: base?.startedAt ?? 0,
        hostUid: base?.hostUid ?? "",
        playerUids: base?.playerUids ?? (["", ""] as [string, string]),
      });
      const next = resolveMatchPhase(stub(phaseFloorRef.current), { ...stub(inc.phase), ...inc });
      if (next === phaseFloorRef.current) return;
      phaseFloorRef.current = next;
      setCommittedPhase(next);
    },
    [],
  );
  const localReadyRef = useRef(localReady);
  localReadyRef.current = localReady;
  const sortedKey = sorted ? `${sorted[0]}:${sorted[1]}` : "";

  /**
   * 호스트: RTDB players + match 직접 판정 (bridge/Phaser 스냅샷에 의존하지 않음).
   * players는 `liveSessions/{id}/players` — match.players 아님.
   */
  const tryStartLobbyCountdown = useCallback(async () => {
    if (!sorted || !sessionId || !myUid) return;

    const playersSnap = await get(ref(rtdb, livePlayersPath(sessionId)));
    const playersFromRtdb = (playersSnap.val() ?? {}) as Record<string, LivePlayerState>;
    rtdbPlayersRef.current = playersFromRtdb;

    const matchSnap = await get(ref(rtdb, liveMatchPath(sessionId)));
    let match = (matchSnap.val() ??
      rtdbMatchRef.current ??
      snapshotMatchRef.current) as LiveMatchState | null;

    const matchHostUid = match?.hostUid || sorted[0];
    const players = { ...mergedPlayersRef.current, ...playersFromRtdb };
    const allReady = areAllPlayersMatchReady(
      sorted,
      players,
      myUid,
      localReadyRef.current,
    );

    if (import.meta.env.DEV) {
      logPlayerReadyDiagnostics(
        "HOST START TRY",
        sorted,
        players,
        myUid,
        localReadyRef.current,
        allReady,
      );
    }

    if (matchHostUid !== myUid) {
      if (allReady) {
        await set(ref(rtdb, liveCountdownSignalPath(sessionId)), Date.now()).catch((e) => {
          console.warn("[liveMatch] countdown signal write", e);
        });
      }
      return;
    }

    if (!match && sorted[0] === myUid) {
      await runTransaction(ref(rtdb, liveMatchPath(sessionId)), (cur) => {
        if (cur) return cur;
        return defaultMatch(sorted[0], sorted);
      });
      const again = await get(ref(rtdb, liveMatchPath(sessionId)));
      match = again.val() as LiveMatchState | null;
      if (match) {
        rtdbMatchRef.current = match;
        setRtdbHostUid(match.hostUid);
      }
    }

    if (!match || match.phase !== "lobby") return;
    if (lobbyCountdownInFlightRef.current) return;
    if (!allReady) return;

    lobbyCountdownInFlightRef.current = true;
    const nextMatch = buildLobbyCountdownMatch(match);
    const patch = {
      phase: "countdown" as const,
      countdownStartedAt: nextMatch.countdownStartedAt,
    };

    bumpPhaseFloor("countdown");
    rtdbMatchRef.current = nextMatch;
    updateBridgeSnapshot({ match: nextMatch });
    setSnapshot((prev) => ({
      ...prev,
      match: pickAdvancedMatch(prev.match, nextMatch),
    }));

    if (import.meta.env.DEV) {
      console.log("[liveMatch] COUNTDOWN WRITE", patch);
    }

    try {
      await update(ref(rtdb, liveMatchPath(sessionId)), patch);
      commitHostMatchState(sessionId, { match: nextMatch });
      if (import.meta.env.DEV) {
        console.info("[liveMatch] COUNTDOWN WRITE OK", { sessionId: sessionId.slice(0, 8) });
      }
    } catch (e) {
      bumpPhaseFloor(match.phase);
      rtdbMatchRef.current = match;
      console.error("[liveMatch] COUNTDOWN WRITE FAILED (check PERMISSION_DENIED)", e);
      setError(formatRtdbError("countdown", e));
    } finally {
      lobbyCountdownInFlightRef.current = false;
    }
  }, [sorted, sessionId, myUid, bumpPhaseFloor, fieldLayout]);

  /** localReady / players 변경 시 카운트다운 재검사 (호스트 write · 게스트 signal) */
  useEffect(() => {
    if (!ready) return;
    void tryStartLobbyCountdown();
  }, [ready, localReady, tryStartLobbyCountdown, snapshot.players]);

  /** maybeStart 누락 방지 — RTDB get 기반 폴링 */
  useEffect(() => {
    if (!ready || !sessionId) return;
    const id = window.setInterval(() => {
      if (phaseRank(phaseFloorRef.current) > phaseRank("lobby")) return;
      void tryStartLobbyCountdown();
    }, 250);
    return () => window.clearInterval(id);
  }, [ready, sessionId, tryStartLobbyCountdown]);

  useEffect(() => {
    if (!isHost || !sessionId) {
      setHostMatchCommitHandler(null);
      return;
    }
    setHostMatchCommitHandler((sid, payload) => {
      if (sid !== sessionId) return;
      bumpPhaseFloor(payload.match);
      const committed = payload.ball
        ? { match: payload.match, ball: payload.ball }
        : { match: payload.match };
      rtdbMatchRef.current = committed.match;
      updateBridgeSnapshot(committed);
      setSnapshot((prev) => {
        const match = pickAdvancedMatch(prev.match, payload.match);
        const ball = payload.ball ? { ...prev.ball, ...payload.ball } : prev.ball;
        if (prev.match === match && prev.ball === ball) return prev;
        const b = getLiveMatchBridge();
        if (b) {
          b.snapshot.match = match;
          if (payload.ball) b.snapshot.ball = ball;
        }
        return { ...prev, match, ball };
      });
      void update(ref(rtdb, liveMatchPath(sessionId)), payload.match).catch((e) => {
        console.warn("[liveMatch] commit match phase", e);
      });
      if (payload.ball) {
        void update(ref(rtdb, liveBallPath(sessionId)), payload.ball).catch((e) => {
          console.warn("[liveMatch] commit ball on phase", e);
        });
      }
    });
    return () => setHostMatchCommitHandler(null);
  }, [isHost, sessionId, bumpPhaseFloor]);

  const onRtdbError = useCallback((label: string, err: unknown) => {
    console.error(`[liveMatch] ${label}`, err);
    setError(formatRtdbError(label, err));
  }, []);

  useEffect(() => {
    lobbyCountdownInFlightRef.current = false;
    rtdbPlayersRef.current = {};
    mergedPlayersRef.current = {};
    rtdbMatchRef.current = null;
    phaseFloorRef.current = "lobby";
    setCommittedPhase("lobby");
    setRtdbHostUid(null);
    playerInitSessionRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!import.meta.env.DEV || !sessionId) return;
    const w = window as Window & {
      __yagoLiveDebug?: {
        sessionId: string;
        forceCountdown: () => Promise<void>;
        readMatch: () => LiveMatchState | null;
        readPlayers: () => Record<string, LivePlayerState>;
      };
    };
    w.__yagoLiveDebug = {
      sessionId,
      forceCountdown: async () => {
        const m = rtdbMatchRef.current;
        if (!m) throw new Error("no match in ref");
        await update(ref(rtdb, liveMatchPath(sessionId)), {
          phase: "countdown",
          countdownStartedAt: Date.now(),
        });
        console.info("[liveMatch] __yagoLiveDebug.forceCountdown OK");
      },
      readMatch: () => rtdbMatchRef.current,
      readPlayers: () => rtdbPlayersRef.current,
      readRtdbMatchLive: async () => {
        const snap = await get(ref(rtdb, liveMatchPath(sessionId)));
        const val = snap.val();
        console.log("[liveMatch] RTDB match live", val);
        return val as LiveMatchState | null;
      },
    };
    return () => {
      delete w.__yagoLiveDebug;
    };
  }, [sessionId]);

  /** 준비 상태만 RTDB에 기록 — syncOwnPlayer(70ms)가 ready:false로 덮어쓰지 않게 분리 */
  const commitReadyToRtdb = useCallback(
    async (value: boolean) => {
      if (!sessionId) return;
      const writeUid = auth.currentUser?.uid?.trim() || myUid;
      if (!writeUid) return;

      localReadyRef.current = value;
      setLocalReady(value);

      const path = livePlayerPath(sessionId, writeUid);
      const now = Date.now();
      const playerRef = ref(rtdb, path);

      if (import.meta.env.DEV) {
        console.log("[liveMatch] READY WRITE PATH", path);
      }

      const readyPatch = {
        ready: value,
        isReady: value,
        localReady: value,
        connected: true,
        lastSeen: now,
        updatedAt: now,
      };

      const existingSnap = await get(playerRef);
      if (existingSnap.exists()) {
        await update(playerRef, readyPatch);
      } else {
        const spawn = fieldLayout
          ? spawnForPlayerIndex(fieldLayout, playerIndex)
          : { x: 0, y: 0 };
        await set(playerRef, {
          ...defaultPlayer(spawn.x, spawn.y),
          ...readyPatch,
        });
      }

      const prev = mergedPlayersRef.current[writeUid];
      mergedPlayersRef.current = {
        ...mergedPlayersRef.current,
        [writeUid]: {
          ...(prev ?? defaultPlayer(0, 0)),
          ready: value,
          connected: true,
          lastSeen: now,
        },
      };

      if (import.meta.env.DEV) {
        console.info("[liveMatch] AFTER READY WRITE", { sessionId, writeUid, ready: value, path });
        if (sorted) {
          logPlayerReadyDiagnostics(
            "AFTER READY WRITE",
            sorted,
            mergedPlayersRef.current,
            writeUid,
            value,
            areAllPlayersMatchReady(sorted, mergedPlayersRef.current, writeUid, value),
          );
        }
      }

      void tryStartLobbyCountdown();
    },
    [sessionId, myUid, sorted, tryStartLobbyCountdown, fieldLayout, playerIndex],
  );

  const toggleReady = useCallback(() => {
    const match = rtdbMatchRef.current;
    if (import.meta.env.DEV) {
      console.log("[liveMatch] READY CLICK", {
        myUid,
        hostUid: match?.hostUid ?? hostUid,
        isHost,
        sessionId,
      });
    }
    const next = !localReadyRef.current;
    void commitReadyToRtdb(next).catch((e) => {
      console.error("[liveMatch] ready RTDB write FAILED", e);
      localReadyRef.current = !next;
      setLocalReady(!next);
      setError(
        /permission/i.test(String(e))
          ? "준비 상태를 서버에 저장할 수 없습니다. RTDB rules를 확인하세요."
          : "준비 상태 저장에 실패했습니다.",
      );
    });
  }, [commitReadyToRtdb, hostUid, isHost, myUid, sessionId]);

  /** 로비 진입 시 RTDB ready 자동 기록 (UI만 준비 완료인 경우 방지) */
  const lobbyAutoReadyRef = useRef(false);
  useEffect(() => {
    lobbyAutoReadyRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!ready || !sessionId || !myUid) return;
    const phase = rtdbMatchRef.current?.phase ?? snapshot.match.phase;
    if (phase !== "lobby") return;
    if (localReadyRef.current || lobbyAutoReadyRef.current) return;
    lobbyAutoReadyRef.current = true;
    void commitReadyToRtdb(true).then(() => tryStartLobbyCountdown());
  }, [ready, sessionId, myUid, snapshot.match.phase, commitReadyToRtdb, tryStartLobbyCountdown]);

  const setPlayerReady = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const value = typeof next === "function" ? next(localReadyRef.current) : next;
      void commitReadyToRtdb(value).catch((e) => {
        console.error("[liveMatch] ready RTDB write FAILED", e);
        setError(
          /permission/i.test(String(e))
            ? "준비 상태를 서버에 저장할 수 없습니다. RTDB rules를 확인하세요."
            : "준비 상태 저장에 실패했습니다.",
        );
      });
    },
    [commitReadyToRtdb],
  );

  useEffect(() => {
    const b = getLiveMatchBridge();
    if (b) b.localReady = localReady;
  }, [localReady]);

  useEffect(() => {
    if (!sessionId || !myUid) return;

    if (isHost) {
      setFieldLayoutMode(detectFieldLayoutMode());
      return;
    }

    // 게스트: meta 대기 전에도 init/준비 write가 막히지 않게 로컬 레이아웃 즉시 사용
    setFieldLayoutMode((prev) => prev ?? detectFieldLayoutMode());

    let metaResolved = false;
    const fallbackId = window.setTimeout(() => {
      if (metaResolved) return;
      if (import.meta.env.DEV) {
        console.warn("[liveMatch] meta.fieldLayoutMode timeout — local detect fallback");
      }
      setFieldLayoutMode(detectFieldLayoutMode());
    }, 2500);

    const unsub = onValue(
      ref(rtdb, liveFieldLayoutModePath(sessionId)),
      (snap) => {
        metaResolved = true;
        window.clearTimeout(fallbackId);
        const raw = snap.val();
        const mode: FieldLayoutMode =
          raw === "portrait" || raw === "landscape" ? raw : detectFieldLayoutMode();
        setFieldLayoutMode(mode);
      },
      (err) => onRtdbError("meta", err),
    );
    return () => {
      metaResolved = true;
      window.clearTimeout(fallbackId);
      unsub();
    };
  }, [sessionId, myUid, isHost, onRtdbError]);

  /** Firebase Auth가 세션 참가 uid와 다르면 RTDB write/read가 한 계정으로 수렴함 */
  useEffect(() => {
    if (!sorted || !myUid) return;
    const check = (authUid: string | undefined) => {
      const uid = authUid?.trim();
      if (!uid) return;
      if (uid !== myUid.trim()) {
        setError(
          "로그인 계정이 이 탭의 세션과 다릅니다. 새로고침 후 다시 로그인하거나, Chrome+Edge(또는 InPrivate)로 서로 다른 계정을 사용하세요.",
        );
        return;
      }
      if (!sorted.includes(uid)) {
        setError("현재 로그인 계정은 이 1v1 세션 참가자가 아닙니다.");
      }
    };
    check(auth.currentUser?.uid);
    const unsub = onAuthStateChanged(auth, (u) => check(u?.uid));
    return unsub;
  }, [myUid, sortedKey]);

  useEffect(() => {
    if (!sessionId || !myUid || !sorted || !fieldLayout) {
      if (!sessionId || !myUid || !sorted) {
        setError("세션 또는 플레이어 정보가 올바르지 않습니다.");
      }
      return;
    }

    const spawn = spawnForPlayerIndex(fieldLayout, playerIndex);
    const existing = getLiveMatchBridge();
    const preserveSnapshot =
      existing?.sessionId === sessionId &&
      existing.playerUids[0] === sorted[0] &&
      existing.fieldLayout.mode === fieldLayout.mode;

    const bridgeSnapshot: LiveMatchSnapshot = preserveSnapshot
      ? existing!.snapshot
      : buildInitialSnapshot(hostUid, sorted, fieldLayout);

    const pose = preserveSnapshot
      ? (existing!.localPose ?? { x: spawn.x, y: spawn.y, vx: 0, vy: 0 })
      : { x: spawn.x, y: spawn.y, vx: 0, vy: 0 };

    const oppUid = resolveOpponentUid(myUid, sorted);
    if (!oppUid) {
      setError("세션 플레이어 정보가 올바르지 않습니다.");
      return;
    }

    setLiveMatchBridge({
      sessionId,
      myUid,
      opponentUid: oppUid,
      isHost,
      playerIndex,
      playerUids: sorted,
      fieldLayout,
      snapshot: bridgeSnapshot,
      localPose: pose,
      opponentNetworkPose: null,
      moveInput: { x: 0, y: 0 },
      pendingLocalKick: false,
      wantsKick: false,
      localReady: localReadyRef.current,
      hostPublish: preserveSnapshot ? existing!.hostPublish : undefined,
    });
    if (import.meta.env.DEV) {
      const authUid = auth.currentUser?.uid ?? "";
      console.info("[liveMatch] bridge ownership", {
        myUid: myUid.slice(0, 8),
        opponentUid: oppUid.slice(0, 8),
        authUid: authUid.slice(0, 8),
        hostUid: sorted[0].slice(0, 8),
        guestUid: sorted[1].slice(0, 8),
        playerIndex,
        isHost,
        authMatchesMyUid: authUid === myUid,
      });
    }
    setBridgeReady(true);

    return () => {
      clearLiveMatchMove(sessionId);
      setBridgeReady(false);
      setLiveMatchBridge(null);
    };
  }, [sessionId, myUid, isHost, playerIndex, hostUid, sortedKey, opponentUid, fieldLayout]);

  useEffect(() => {
    if (!sessionId || !myUid || !sorted || !fieldLayout) return;

    const writeUid = auth.currentUser?.uid?.trim() || myUid;
    const initKey = `${sessionId}:${writeUid}`;
    if (playerInitSessionRef.current === initKey) return;

    let cancelled = false;
    const spawn = spawnForPlayerIndex(fieldLayout, playerIndex);
    const playerRef = ref(rtdb, livePlayerPath(sessionId, writeUid));

    void (async () => {
      try {
        const existingSnap = await get(playerRef);
        const existing = existingSnap.val() as LivePlayerState | null;
        const preserveReady = existing?.ready === true || localReadyRef.current === true;
        const posePatch = {
          x: spawn.x,
          y: spawn.y,
          vx: 0,
          vy: 0,
          connected: true,
          lastSeen: Date.now(),
        };

        if (existing) {
          // ready 필드는 건드리지 않음 — 게스트 준비 클릭 직후 init 레이스로 false 덮임 방지
          await update(playerRef, posePatch);
        } else {
          await set(playerRef, {
            ...defaultPlayer(spawn.x, spawn.y),
            ...posePatch,
            ready: preserveReady,
            isReady: preserveReady,
            localReady: preserveReady,
          });
        }
        await set(ref(rtdb, liveParticipantPath(sessionId, writeUid)), true);
        await onDisconnect(playerRef).update({
          connected: false,
          lastSeen: Date.now(),
        });

        if (sorted[0] === writeUid) {
          const matchRef = ref(rtdb, liveMatchPath(sessionId));
          const ballRef = ref(rtdb, liveBallPath(sessionId));
          await runTransaction(matchRef, (cur) => {
            if (cur) return cur;
            return defaultMatch(sorted[0], sorted);
          });
          await runTransaction(ballRef, (cur) => {
            if (cur) return cur;
            return defaultBall(fieldLayout);
          });
          const mode = detectFieldLayoutMode();
          setFieldLayoutMode(mode);
          await update(ref(rtdb, liveMetaPath(sessionId)), { fieldLayoutMode: mode });
        }

        if (!cancelled) {
          playerInitSessionRef.current = initKey;
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          onRtdbError("init", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, myUid, sortedKey, isHost, hostUid, playerIndex, fieldLayout, onRtdbError]);

  useEffect(() => {
    if (!ready || !sessionId || !myUid) return;

    const playersRef = ref(rtdb, livePlayersPath(sessionId));
    const ballRef = ref(rtdb, liveBallPath(sessionId));
    const matchRef = ref(rtdb, liveMatchPath(sessionId));

    const merge = (partial: Partial<LiveMatchSnapshot>) => {
      setSnapshot((prev) => {
        const canonicalPartial = partial.players
          ? pickCanonicalPlayers(partial.players, sorted)
          : null;
        const nextPlayers = canonicalPartial
          ? { ...pickCanonicalPlayers(prev.players, sorted), ...canonicalPartial }
          : prev.players;
        let mergedBallPartial = partial.ball;
        if (partial.ball && fieldLayout) {
          const safe = sanitizeBallCoords(partial.ball, fieldLayout);
          mergedBallPartial = { ...partial.ball, ...safe };
        }
        const nextBall =
          isHost || !mergedBallPartial ? prev.ball : { ...prev.ball, ...mergedBallPartial };
        const nextMatch = partial.match
          ? pickAdvancedMatch(prev.match, partial.match)
          : prev.match;

        if (
          partial.players &&
          playersSnapshotEqual(prev.players, nextPlayers) &&
          nextBall === prev.ball &&
          nextMatch === prev.match
        ) {
          return prev;
        }

        const next: LiveMatchSnapshot = {
          players: nextPlayers,
          ball: nextBall,
          match: nextMatch,
        };

        mergedPlayersRef.current = nextPlayers;

        const bridgePatch: Partial<LiveMatchSnapshot> = {};
        if (partial.players) bridgePatch.players = next.players;
        if (!isHost) {
          if (partial.ball) bridgePatch.ball = next.ball;
          if (partial.match) bridgePatch.match = next.match;
        }
        if (Object.keys(bridgePatch).length > 0) {
          updateBridgeSnapshot(bridgePatch);
        }

        const b = getLiveMatchBridge();
        if (b) {
          if (partial.players) b.snapshot.players = next.players;
          if (partial.match) {
            b.snapshot.match = pickAdvancedMatch(b.snapshot.match, next.match);
          }
          if (!isHost) {
            if (partial.ball) b.snapshot.ball = next.ball;
          }
        }
        return next;
      });
    };

    const unsubPlayers = onValue(
      playersRef,
      (snap) => {
        const raw = snap.val() as Record<string, LivePlayerState> | null;
        if (!raw) return;
        warnRtdbPlayerSlotCollision(raw, sorted);
        const val = pickCanonicalPlayers(raw, sorted);
        const authUid = auth.currentUser?.uid?.trim() || myUid;
        if (import.meta.env.DEV) {
          const aliens = findAlienPlayerKeys(raw as Record<string, unknown>, sorted);
          if (aliens.length) {
            console.error("[liveMatch] RTDB alien player keys", { aliens, rawKeys: Object.keys(raw) });
          }
          logRtdbPlayersRead(sessionId, sorted, authUid, raw, val);
          logRtdbPlayersSmoke(sessionId, authUid, raw);
        }
        if (Object.keys(val).length === 0) return;
        rtdbPlayersRef.current = { ...rtdbPlayersRef.current, ...val };
        mergedPlayersRef.current = { ...pickCanonicalPlayers(mergedPlayersRef.current, sorted), ...val };
        merge({ players: val });
        const bridge = getLiveMatchBridge();
        if (bridge) {
          bridge.snapshot.players = {
            ...pickCanonicalPlayers(bridge.snapshot.players, sorted),
            ...val,
          };
          const opp = resolveOpponentUid(authUid, sorted);
          const ownPose = val[authUid];
          if (opp && opp !== authUid && val[opp]) {
            const p = val[opp];
            if (!isOpponentPoseEchoingOwn(ownPose, p)) {
              bridge.opponentNetworkPose = {
                x: p.x,
                y: p.y,
                vx: p.vx ?? 0,
                vy: p.vy ?? 0,
                ready: Boolean(p.ready),
                connected: p.connected !== false,
                lastSeen: p.lastSeen ?? Date.now(),
                networkUid: opp,
              };
            } else if (import.meta.env.DEV) {
              console.warn("[liveMatch] skip opponentNetworkPose — echoes own slot while moving");
            }
          }
        }
        void tryStartLobbyCountdown();
      },
      (err) => onRtdbError("players", err),
    );

    const signalRef = ref(rtdb, liveCountdownSignalPath(sessionId));
    const unsubSignal = isMatchOwner
      ? onValue(signalRef, () => {
          void tryStartLobbyCountdown();
        })
      : () => {};

    const unsubBall = isHost
      ? () => {}
      : onValue(
          ballRef,
          (snap) => {
            const val = snap.val() as LiveBallState | null;
            if (val) merge({ ball: val });
          },
          (err) => onRtdbError("ball", err),
        );

    const unsubMatch = onValue(
      matchRef,
      (snap) => {
        const val = snap.val() as LiveMatchState | null;
        if (!val) return;
        const normalizedUids = normalizePlayerUids(val.playerUids) ?? sorted;
        const matchVal: LiveMatchState = {
          ...val,
          playerUids: normalizedUids,
        };
        const prevPhase = rtdbMatchRef.current?.phase;
        rtdbMatchRef.current = matchVal;
        bumpPhaseFloor(matchVal);
        if (matchVal.hostUid) setRtdbHostUid(matchVal.hostUid);
        if (import.meta.env.DEV && prevPhase !== matchVal.phase) {
          console.log("[liveMatch] PHASE CHANGED (RTDB)", matchVal.phase, {
            floor: phaseFloorRef.current,
          });
        }
        if (isHost) {
          setSnapshot((prev) => {
            const merged = pickAdvancedMatch(prev.match, matchVal);
            const match = {
              ...merged,
              phase: resolveMatchPhase(
                { ...merged, phase: phaseFloorRef.current },
                merged,
              ),
            };
            if (
              match.phase === prev.match.phase &&
              match.scoreA === prev.match.scoreA &&
              match.scoreB === prev.match.scoreB &&
              match.timeRemainingMs === prev.match.timeRemainingMs
            ) {
              return prev;
            }
            updateBridgeSnapshot({ match });
            const b = getLiveMatchBridge();
            if (b) b.snapshot.match = pickAdvancedMatch(b.snapshot.match, match);
            return { ...prev, match };
          });
          void tryStartLobbyCountdown();
        } else {
          const floored = {
            ...matchVal,
            phase: resolveMatchPhase(
              { ...matchVal, phase: phaseFloorRef.current },
              matchVal,
            ),
          };
          merge({ match: floored });
        }
      },
      (err) => onRtdbError("match", err),
    );

    return () => {
      unsubPlayers();
      unsubSignal();
      unsubBall();
      unsubMatch();
    };
  }, [ready, sessionId, myUid, sortedKey, isHost, isMatchOwner, onRtdbError, tryStartLobbyCountdown]);

  /** 호스트 UI ← Phaser ball/score. lobby 구간은 match.phase 건드리지 않음 */
  useEffect(() => {
    if (!ready || !isHost) return;
    const id = window.setInterval(() => {
      const b = getLiveMatchBridge();
      const pub = b?.hostPublish;
      if (!b || !pub) return;
      b.snapshot.ball = pub.ball;

      const inLobby =
        phaseRank(committedPhase) <= phaseRank("lobby") &&
        phaseRank(rtdbMatchRef.current?.phase ?? "lobby") <= phaseRank("lobby");

      if (inLobby) {
        setSnapshot((prev) => {
          if (prev.ball.x === pub.ball.x && prev.ball.y === pub.ball.y) return prev;
          return { ...prev, ball: pub.ball };
        });
        return;
      }

      const celebrating = isGoalCelebration(b.snapshot.match);
      const sceneMatch = celebrating
        ? {
            ...pub.match,
            phase: "goal" as const,
            goalResetAt: b.snapshot.match.goalResetAt,
            scoreA: Math.max(pub.match.scoreA, b.snapshot.match.scoreA),
            scoreB: Math.max(pub.match.scoreB, b.snapshot.match.scoreB),
          }
        : pub.match;

      setSnapshot((prev) => {
        const match = {
          ...prev.match,
          ...sceneMatch,
          phase: resolveMatchPhase(b.snapshot.match, sceneMatch),
        };
        if (
          prev.ball.x === pub.ball.x &&
          prev.ball.y === pub.ball.y &&
          prev.match.phase === match.phase &&
          prev.match.scoreA === match.scoreA &&
          prev.match.scoreB === match.scoreB &&
          prev.match.timeRemainingMs === match.timeRemainingMs
        ) {
          return prev;
        }
        return { players: prev.players, ball: pub.ball, match };
      });
    }, LIVE_MATCH_TIMING.syncIntervalMs);
    return () => window.clearInterval(id);
  }, [ready, isHost, committedPhase]);

  const syncOwnPlayer = useCallback(() => {
    if (!sessionId) return;
    const bridge = getLiveMatchBridge();
    if (!bridge) return;

    const ctx = resolveMovementWriteContext(bridge, myUid);
    if (!ctx) return;

    if (consumeLiveMatchKick()) bridge.wantsKick = true;

    const { x, y, vx, vy } = bridge.localPose;
    const patch: Record<string, unknown> = {
      x,
      y,
      vx,
      vy,
      connected: true,
      lastSeen: Date.now(),
    };
    if (bridge.wantsKick) {
      patch.wantsKick = true;
      bridge.wantsKick = false;
    }

    const writePath = livePlayerPath(sessionId, ctx.targetUid);
    logMovementWrite(ctx, { x, y }, writePath);
    if (!assertCanonicalPlayerWritePath(sessionId, ctx.targetUid, writePath)) {
      return;
    }

    void update(ref(rtdb, writePath), patch);
  }, [sessionId, myUid]);

  const syncHostState = useCallback(() => {
    if (!isHost || !sessionId) return;
    const bridge = getLiveMatchBridge();
    if (!bridge) return;

    const layout = fieldLayout ?? bridge.fieldLayout;
    const rawBall = bridge.hostPublish?.ball ?? bridge.snapshot.ball;
    const ball = layout ? { ...rawBall, ...sanitizeBallCoords(rawBall, layout) } : rawBall;
    void update(ref(rtdb, liveBallPath(sessionId)), ball).catch((e) => {
      console.warn("[liveMatch] ball sync", e);
    });

    const floor = phaseFloorRef.current;
    // lobby 구간: match 전체를 70ms마다 쓰지 않음 → countdown rollback 원인 제거
    if (phaseRank(floor) <= phaseRank("lobby")) {
      return;
    }

    let match = bridge.snapshot.match;
    const celebrating = isGoalCelebration(bridge.snapshot.match);

    if (celebrating) {
      match = {
        ...match,
        phase: "goal",
        goalResetAt: bridge.snapshot.match.goalResetAt,
        scoreA: Math.max(match.scoreA, bridge.snapshot.match.scoreA),
        scoreB: Math.max(match.scoreB, bridge.snapshot.match.scoreB),
      };
    } else if (bridge.hostPublish?.match) {
      const pub = bridge.hostPublish.match;
      match = {
        ...match,
        ...pub,
        phase: match.phase,
        scoreA: Math.max(match.scoreA, pub.scoreA),
        scoreB: Math.max(match.scoreB, pub.scoreB),
        timeRemainingMs:
          match.phase === "playing" && pub.phase === "playing"
            ? Math.min(match.timeRemainingMs, pub.timeRemainingMs)
            : pub.timeRemainingMs,
      };
    }
    match = {
      ...pickAdvancedMatch(rtdbMatchRef.current ?? match, match),
      phase: match.phase,
    };
    if (phaseRank(match.phase) < phaseRank(floor)) {
      if (import.meta.env.DEV) {
        console.warn("[liveMatch] sync blocked phase rollback", match.phase, "→ floor", floor);
      }
      match = { ...match, phase: floor };
    }

    void update(ref(rtdb, liveMatchPath(sessionId)), match).catch((e) => {
      console.warn("[liveMatch] match sync", e);
    });
  }, [isHost, sessionId, fieldLayout]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      syncOwnPlayer();
      const b = getLiveMatchBridge();
      if (isHost && b?.pendingClearOpponentKick && b.opponentUid) {
        b.pendingClearOpponentKick = false;
        void update(ref(rtdb, livePlayerPath(sessionId, b.opponentUid)), { wantsKick: false }).catch(
          (e) => console.warn("[liveMatch] clear opponent wantsKick", e),
        );
      }
      syncHostState();
    }, LIVE_MATCH_TIMING.syncIntervalMs);
    return () => window.clearInterval(id);
  }, [ready, isHost, sessionId, syncOwnPlayer, syncHostState]);

  useEffect(() => {
    const onHide = () => {
      const writeUid = auth.currentUser?.uid?.trim() || myUid;
      if (!writeUid) return;
      void update(ref(rtdb, livePlayerPath(sessionId, writeUid)), {
        connected: false,
        lastSeen: Date.now(),
      });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [sessionId, myUid]);

  const displaySnapshot = useMemo((): LiveMatchSnapshot => {
    const rtdb = rtdbMatchRef.current;
    const merged = pickAdvancedMatch(snapshot.match, rtdb ?? snapshot.match);
    const phase = resolveMatchPhase({ ...merged, phase: committedPhase }, merged);
    return { ...snapshot, match: { ...merged, phase } };
  }, [snapshot, committedPhase]);

  return {
    ready,
    bridgeReady,
    fieldLayoutMode,
    error: sorted ? error : "1v1 세션에는 플레이어 2명이 필요합니다.",
    isHost,
    opponentUid,
    playerIndex,
    snapshot: displaySnapshot,
    setLocalReady: setPlayerReady,
    toggleReady,
    localReady,
  };
}
