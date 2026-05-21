import { useMemo, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  type PlayMainPosition,
  type PlayRecentGrowth,
  type PlayPlayerStatsDoc,
  PLAY_STAT_KEYS,
  PLAY_STAT_LABELS_KO,
  buildMockTeamPlayRoster,
  sortPlayersByOVR,
} from "@/utils/playerStats";
import { useTeamPlayerRankings } from "@/hooks/useTeamPlayerRankings";
import { useMyTeamMemberDoc } from "@/hooks/useMyTeamMemberDoc";
import { ensurePlayerStatsDoc } from "@/services/teamPlayerStatsService";
import { formatTeamGameLabel } from "@/services/matchPlayFeedbackService";
import { useCompletedTeamGames } from "@/hooks/useCompletedTeamGames";
import { useMatchFeedbackProgress } from "@/hooks/useMatchFeedbackProgress";
import { getTeamGame } from "@/services/teamGameService";
import type { TeamGame } from "@/types/teamGame";
import type { ParticipationHint } from "@/lib/play/avatarDailyStatus";
import {
  dismissPlayFeedbackPrompt,
  peekNextPlayFeedbackPrompt,
  type PlayFeedbackPromptEntry,
} from "@/utils/playFeedbackPromptStorage";
import PlayerCard from "./PlayerCard";
import RankingList from "./RankingList";
import BadgeList from "./BadgeList";
import PlayModeSection from "./PlayModeSection";
import { PlayActionPanel, TEAM_PLAY_TAB_ANCHOR_ID } from "./PlayActionPanel";
import { PlayLoungeSection } from "./PlayLoungeSection";
import { PlayLobbyPlayerSummary } from "./PlayLobbyPlayerSummary";
import PlayMatchFeedbackPanel from "./PlayMatchFeedbackPanel";
import PlayMatchRecapShare from "./PlayMatchRecapShare";
import {
  computeCanonicalPlayTabSnapshot,
  computePlayTabPlayerMetrics,
} from "@/lib/play/playTabCanonicalMvp";
import { buildMvpMomentSequence } from "@/lib/play/playTabMvpMoments";
import {
  loadPlayTabLastMvpBundle,
  savePlayTabLastMvpBundle,
  type StoredPlayTabMvpBundleV1,
} from "@/lib/play/playTabLastMvpStorage";
import PlayTabMvpPanel from "./PlayTabMvpPanel";
import {
  isDedicatedTeamPlayPathname,
  PLAY_TAB_CTA_SCROLL_EVENT,
  PLAY_TAB_OPEN_SIMULATION_EVENT,
  PLAY_TAB_PLAYMODE_INTENT_EVENT,
  stripPlayTabDeepLinkFromState,
  teamManagePlayPath,
  teamPlayEntryPath,
  type PlayTabCtaScrollDetail,
  type PlayTabDeepLinkPayload,
  type PlayTabPlayModeIntentDetail,
  type TeamPlayPageViewSource,
} from "@/lib/team/teamPlayRoutes";
import { Flame } from "lucide-react";
import { TRACK } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MiniShot3DModal from "@/components/team/play/miniShot/MiniShot3DModal";
import WeeklySeasonRewardBanner from "@/components/team/play/WeeklySeasonRewardBanner";
import { buildTeamPlayHudRevealFromMiniShot } from "@/lib/team/buildTeamPlayHudRevealFromMiniShot";
import { dispatchTeamPlayHudReveal } from "@/lib/team/teamPlayHudEvents";
import { useMiniShotSuperBadge } from "@/hooks/useMiniShotSuperBadge";

type Props = {
  teamId: string;
  authUid?: string | null;
  teamName?: string;
  /** `/teams/:id/play` 진입 유형 — 피드백 제출 로그 `source`에 전달 */
  playEntrySource?: TeamPlayPageViewSource;
  /** 팀 플레이 라운지: 접힘 섹션 + 컴팩트 카드 */
  variant?: "default" | "lounge";
};

const POSITION_ORDER: PlayMainPosition[] = ["GK", "DF", "MF", "FW"];

function RecentGrowthChips({ recentGrowth }: { recentGrowth: PlayRecentGrowth }) {
  let stagger = 0;
  const entries = PLAY_STAT_KEYS.map((key) => {
    const delta = recentGrowth[key];
    if (delta === undefined) return null;
    const label = PLAY_STAT_LABELS_KO[key];
    if (delta === 0) {
      return (
        <span
          key={key}
          className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-900"
        >
          {label} 유지
        </span>
      );
    }
    const sign = delta > 0 ? "+" : "";
    const style: CSSProperties =
      delta > 0 ? { animationDelay: `${stagger++ * 90}ms` } : {};

    const motionClass =
      delta !== 0
        ? delta > 0
          ? "animate-play-stat-chip opacity-0 shadow-lg shadow-indigo-500/30 ring-1 ring-white/30"
          : "animate-play-stat-chip opacity-0"
        : "";

    return (
      <span
        key={key}
        style={style}
        className={`inline-flex items-center rounded-full bg-gradient-to-r from-fuchsia-500 via-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-extrabold text-white ${motionClass}`}
      >
        <span className="mr-0.5 animate-pulse" aria-hidden>
          ▲
        </span>
        {label} {sign}
        {delta}
      </span>
    );
  }).filter(Boolean);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">최근 경기 이후 변경된 기록이 아직 없어요.</p>;
  }
  return <div className="flex flex-wrap gap-2">{entries}</div>;
}

type JustCreatedMatchState = {
  justCreatedGameId?: string;
  justCreatedAwayName?: string;
};

const LOUNGE_INNER = "space-y-3 text-slate-200";
const LOUNGE_CARD = "rounded-lg border border-white/10 bg-black/20 p-3";

export default function PlayTab({
  teamId,
  authUid,
  teamName = "우리 팀",
  playEntrySource = "tab_click",
  variant = "default",
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const lastJustCreatedKey = useRef<string | null>(null);
  const [justCreatedBanner, setJustCreatedBanner] = useState<{ gameId: string; awayName: string } | null>(null);
  const [justCreatedCtaGlow, setJustCreatedCtaGlow] = useState(false);
  /** 상단 CTA 스크롤 직후 경기 선택 블록 짧은 강조 */
  const [matchSectionCtaGlow, setMatchSectionCtaGlow] = useState(false);
  const matchSectionGlowClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 상단 CTA → 최신 완료 경기 맞춘 뒤 `<select>` 포커스 */
  const [pendingMatchSelectFocus, setPendingMatchSelectFocus] = useState(false);
  /** CTA 직후 `<select>`에 “여기” 시각 확인용 짧은 강조 */
  const [matchSelectCtaGlow, setMatchSelectCtaGlow] = useState(false);
  const matchSelectGlowClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** CTA 연타 시 이전 rAF 포커스/글로우 콜백 무효화 */
  const matchSelectFocusGenRef = useRef(0);
  /** MVP 아래 ‘다음 경기’ CTA 연타 방지 */
  const mvpBelowCtaNavAtRef = useRef(0);
  /** 딥링크 `focus: simulation` 연타 시 이전 rAF로 모달이 두 번 뜨는 것 방지 */
  const playTabDeepLinkSimGenRef = useRef(0);

  useEffect(() => {
    return () => {
      if (matchSelectGlowClearRef.current) clearTimeout(matchSelectGlowClearRef.current);
    };
  }, []);

  /** 플레이 모드 카드 → 스크롤 + (경기) CTA 흐름 / (시뮬) 모달 */
  useEffect(() => {
    let simScrollTimer: ReturnType<typeof setTimeout> | null = null;
    const onPlayModeIntent = (ev: Event) => {
      const d = (ev as CustomEvent<PlayTabPlayModeIntentDetail | undefined>).detail;
      if (!d?.intent) return;
      switch (d.intent) {
        case "match": {
          const anchor = document.getElementById(TEAM_PLAY_TAB_ANCHOR_ID);
          if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
          else
            document.getElementById("yago-play-match-section")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          window.dispatchEvent(
            new CustomEvent<PlayTabCtaScrollDetail>(PLAY_TAB_CTA_SCROLL_EVENT, { detail: { intent: "streak" } })
          );
          break;
        }
        case "simulation":
          document.getElementById("yago-play-mode-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
          if (simScrollTimer) clearTimeout(simScrollTimer);
          simScrollTimer = window.setTimeout(() => {
            simScrollTimer = null;
            window.dispatchEvent(new CustomEvent(PLAY_TAB_OPEN_SIMULATION_EVENT));
          }, 380);
          break;
        case "growth":
          document.getElementById("yago-play-growth-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        default:
          break;
      }
    };
    window.addEventListener(PLAY_TAB_PLAYMODE_INTENT_EVENT, onPlayModeIntent);
    return () => {
      window.removeEventListener(PLAY_TAB_PLAYMODE_INTENT_EVENT, onPlayModeIntent);
      if (simScrollTimer) clearTimeout(simScrollTimer);
    };
  }, []);

  /**
   * 외부 `navigate(..., { state: buildPlayTabDeepLinkState({ ... }) })` — 1회 소비 (이벤트 버스와 병행).
   * `replace: true`로 현재 히스토리 엔트리만 갱신 → 뒤로가기 시 `playTabDeepLink` 없는 중간 스텝이 쌓이지 않음.
   * `focus: simulation` 연타는 `playTabDeepLinkSimGenRef`로 rAF 모달 오픈만 무효화 (match/growth는 동기 1회).
   */
  useEffect(() => {
    const raw = location.state as { playTabDeepLink?: PlayTabDeepLinkPayload } | null | undefined;
    const d = raw?.playTabDeepLink;
    if (!d || (!d.autoStart && d.focus !== "simulation" && d.focus !== "growth")) return;

    const stSnap = location.state;
    const finish = () => {
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: stripPlayTabDeepLinkFromState(stSnap) ?? {} }
      );
    };

    if (d.autoStart) {
      window.dispatchEvent(
        new CustomEvent<PlayTabPlayModeIntentDetail>(PLAY_TAB_PLAYMODE_INTENT_EVENT, { detail: { intent: "match" } })
      );
    }
    if (d.focus === "growth") {
      document.getElementById("yago-play-growth-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (d.focus === "simulation") {
      document.getElementById("yago-play-mode-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      const simGen = ++playTabDeepLinkSimGenRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (simGen !== playTabDeepLinkSimGenRef.current) return;
          window.dispatchEvent(new CustomEvent(PLAY_TAB_OPEN_SIMULATION_EVENT));
        });
      });
    }

    finish();
  }, [location.state, location.pathname, location.search, navigate, teamId]);

  useEffect(() => {
    const gid = justCreatedBanner?.gameId;
    if (!gid) {
      setJustCreatedCtaGlow(false);
      return;
    }
    setJustCreatedCtaGlow(false);
    const glowOn = window.setTimeout(() => setJustCreatedCtaGlow(true), 300);
    const glowOff = window.setTimeout(() => setJustCreatedCtaGlow(false), 300 + 1400);
    return () => {
      window.clearTimeout(glowOn);
      window.clearTimeout(glowOff);
    };
  }, [justCreatedBanner?.gameId]);

  const playOnDedicatedRoute = useMemo(
    () => isDedicatedTeamPlayPathname(location.pathname),
    [location.pathname]
  );
  const playTabHref = useCallback(
    (matchId?: string) =>
      playOnDedicatedRoute ? teamPlayEntryPath(teamId, { matchId }) : teamManagePlayPath(teamId, { matchId }),
    [teamId, playOnDedicatedRoute]
  );

  /** 경기 등록 직후 /play 진입: 예정 경기는 URL matchId에 넣지 않고(state만) 배너로 연결 */
  useLayoutEffect(() => {
    const st = location.state as JustCreatedMatchState | null | undefined;
    const gid = typeof st?.justCreatedGameId === "string" ? st.justCreatedGameId.trim() : "";
    if (!gid) return;
    const key = `${teamId}:${gid}`;
    if (lastJustCreatedKey.current === key) return;
    lastJustCreatedKey.current = key;

    const away =
      typeof st?.justCreatedAwayName === "string" && st.justCreatedAwayName.trim()
        ? st.justCreatedAwayName.trim()
        : "상대 팀";
    setJustCreatedBanner({ gameId: gid, awayName: away });
    TRACK("JUST_CREATED_BANNER_SHOWN", { team_id: teamId, game_id: gid });

    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document.getElementById("yago-just-created-game-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    });
  }, [location.state, location.pathname, location.search, navigate, teamId]);
  const { players, loading: rankLoading, error: rankError } = useTeamPlayerRankings(teamId);
  const { badge: mySuperBadge } = useMiniShotSuperBadge(authUid, true);
  const { member, loading: memberLoading } = useMyTeamMemberDoc(teamId, authUid ?? undefined);
  const { games: completedGames, loading: completedLoading } = useCompletedTeamGames(teamId);
  /** 자동 생성 1회 시도 후 실패하면 루프 방지 —「다시 만들기」에서만 초기화 */
  const autoCreateAttempts = useRef(0);

  const myPlayer = useMemo(() => {
    const uid = typeof authUid === "string" ? authUid.trim() : "";
    if (!uid) return undefined;
    return players.find((p) => p.userId === uid);
  }, [players, authUid]);

  const simulationRoster: PlayPlayerStatsDoc[] = useMemo(() => {
    if (players.length > 0) return players;
    return buildMockTeamPlayRoster(teamId);
  }, [players, teamId]);

  const ranked = useMemo(() => sortPlayersByOVR(players), [players]);

  const growthBoost = useMemo(
    () => (myPlayer ? PLAY_STAT_KEYS.some((k) => (myPlayer.recentGrowth[k] ?? 0) > 0) : false),
    [myPlayer]
  );

  /** 종료 경기 선택: URL 미지정 또는 잘못된 matchId 시 최신 완료 경기로 교정 */
  useEffect(() => {
    if (completedLoading || completedGames.length === 0) return;
    const urlMatch = searchParams.get("matchId")?.trim() ?? "";
    const validUrl = urlMatch && completedGames.some((g) => g.id === urlMatch);
    if (validUrl) return;
    const firstId = completedGames[0]?.id ?? "";
    if (!firstId) return;
    navigate(playTabHref(firstId), {
      replace: true,
    });
  }, [
    completedGames,
    completedLoading,
    navigate,
    playTabHref,
    searchParams,
    teamId,
  ]);

  const effectiveMatchId = useMemo(() => {
    const url = searchParams.get("matchId")?.trim() ?? "";
    if (url && completedGames.some((g) => g.id === url)) return url;
    return completedGames[0]?.id ?? "";
  }, [completedGames, searchParams]);

  /** MVP 확인 직후 → 경기 선택·피드백으로 시선·포커스 이동 (상단 CTA와 동일 이벤트) */
  const goToNextMatchFeedbackFromMvp = useCallback(() => {
    const t = Date.now();
    if (t - mvpBelowCtaNavAtRef.current < 450) return;
    mvpBelowCtaNavAtRef.current = t;

    const mid = effectiveMatchId.trim();
    TRACK("CTA_CLICK_RESULT", {
      team_id: teamId,
      source: playEntrySource,
      ...(mid ? { game_id: mid } : {}),
      via: "mvp_panel_below_cta",
    });

    const anchor = document.getElementById(TEAM_PLAY_TAB_ANCHOR_ID);
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    else
      document.getElementById("yago-play-match-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

    window.dispatchEvent(
      new CustomEvent<PlayTabCtaScrollDetail>(PLAY_TAB_CTA_SCROLL_EVENT, { detail: { intent: "streak" } })
    );
  }, [effectiveMatchId, playEntrySource, teamId]);

  useEffect(() => {
    const onCtaScroll = (ev: Event) => {
      if (matchSelectGlowClearRef.current) {
        clearTimeout(matchSelectGlowClearRef.current);
        matchSelectGlowClearRef.current = null;
      }
      setMatchSelectCtaGlow(false);

      if (matchSectionGlowClearRef.current) clearTimeout(matchSectionGlowClearRef.current);
      setMatchSectionCtaGlow(true);
      matchSectionGlowClearRef.current = window.setTimeout(() => {
        setMatchSectionCtaGlow(false);
        matchSectionGlowClearRef.current = null;
      }, 650);

      const detail = (ev as CustomEvent<PlayTabCtaScrollDetail | undefined>).detail;
      if (!detail) return;

      const firstId = completedGames[0]?.id?.trim() ?? "";
      if (!firstId || completedLoading || !myPlayer || !authUid?.trim()) return;

      matchSelectFocusGenRef.current += 1;
      setPendingMatchSelectFocus(true);
      if (firstId !== effectiveMatchId.trim()) {
        navigate(playTabHref(firstId), { replace: true });
      }
    };
    window.addEventListener(PLAY_TAB_CTA_SCROLL_EVENT, onCtaScroll);
    return () => {
      window.removeEventListener(PLAY_TAB_CTA_SCROLL_EVENT, onCtaScroll);
      if (matchSectionGlowClearRef.current) clearTimeout(matchSectionGlowClearRef.current);
    };
  }, [
    authUid,
    completedGames,
    completedLoading,
    effectiveMatchId,
    myPlayer,
    navigate,
    playTabHref,
  ]);

  useEffect(() => {
    if (!pendingMatchSelectFocus) return;
    if (completedLoading || completedGames.length === 0 || !myPlayer || !authUid?.trim()) {
      setPendingMatchSelectFocus(false);
      return;
    }
    const firstId = completedGames[0]?.id?.trim() ?? "";
    if (!firstId) {
      setPendingMatchSelectFocus(false);
      return;
    }
    if (effectiveMatchId.trim() !== firstId) return;

    const el = document.getElementById("yago-play-match-select");
    if (!el) {
      setPendingMatchSelectFocus(false);
      return;
    }
    setPendingMatchSelectFocus(false);
    const genAtSchedule = matchSelectFocusGenRef.current;
    window.requestAnimationFrame(() => {
      if (genAtSchedule !== matchSelectFocusGenRef.current) return;
      const sel = el as HTMLSelectElement;
      sel.focus({ preventScroll: true });
      try {
        if (typeof sel.showPicker === "function") {
          void sel.showPicker();
        }
      } catch {
        /* 제스처/브라우저 정책으로 거부될 수 있음 */
      }
      if (genAtSchedule !== matchSelectFocusGenRef.current) return;
      if (matchSelectGlowClearRef.current) clearTimeout(matchSelectGlowClearRef.current);
      setMatchSelectCtaGlow(true);
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
      const glowMs = reduceMotion ? 150 : 300;
      matchSelectGlowClearRef.current = window.setTimeout(() => {
        if (genAtSchedule !== matchSelectFocusGenRef.current) return;
        setMatchSelectCtaGlow(false);
        matchSelectGlowClearRef.current = null;
      }, glowMs);
    });
  }, [
    pendingMatchSelectFocus,
    completedLoading,
    completedGames,
    effectiveMatchId,
    myPlayer,
    authUid,
  ]);

  const { feedbackCount, eligibleMemberCount, ratioLabel, loading: progressLoading, pendingNames } =
    useMatchFeedbackProgress(teamId, effectiveMatchId);

  const myOvrRank = useMemo(() => {
    if (!myPlayer) return null;
    const idx = ranked.findIndex((p) => p.memberId === myPlayer.memberId);
    return idx >= 0 ? idx + 1 : null;
  }, [ranked, myPlayer]);

  const [linkedGame, setLinkedGame] = useState<TeamGame | null | undefined>(undefined);
  const [ovrRankLine, setOvrRankLine] = useState<string | null>(null);
  const [deadlineHint, setDeadlineHint] = useState("");

  useEffect(() => {
    const mid = effectiveMatchId?.trim();
    if (!mid) {
      setLinkedGame(null);
      return;
    }
    let cancel = false;
    setLinkedGame(undefined);
    void getTeamGame(mid).then((g) => {
      if (!cancel) setLinkedGame(g);
    });
    return () => {
      cancel = true;
    };
  }, [effectiveMatchId]);

  const selectedGameLabel = useMemo(() => {
    const id = effectiveMatchId.trim();
    if (!id) return "";
    const g = completedGames.find((x) => x.id === id);
    return g ? formatTeamGameLabel(teamId, g) : "";
  }, [effectiveMatchId, completedGames, teamId]);

  const livePlaySnapshot = useMemo(() => {
    const mid = effectiveMatchId.trim();
    if (!mid || simulationRoster.length === 0) return null;
    if (linkedGame === undefined) return null;
    return computeCanonicalPlayTabSnapshot(
      teamId,
      mid,
      simulationRoster,
      linkedGame ?? null,
      myPlayer?.memberId ?? null
    );
  }, [teamId, effectiveMatchId, simulationRoster, linkedGame, myPlayer?.memberId]);

  const [cachedLastMvp, setCachedLastMvp] = useState<StoredPlayTabMvpBundleV1 | null>(() =>
    loadPlayTabLastMvpBundle(teamId)
  );

  useEffect(() => {
    setCachedLastMvp(loadPlayTabLastMvpBundle(teamId));
  }, [teamId]);

  useEffect(() => {
    const mid = effectiveMatchId.trim();
    if (!livePlaySnapshot?.mvp || livePlaySnapshot.events.length === 0 || !mid) return;
    savePlayTabLastMvpBundle(teamId, {
      matchId: mid,
      matchLabel: selectedGameLabel || undefined,
      mvp: livePlaySnapshot.mvp,
      events: livePlaySnapshot.events,
    });
    setCachedLastMvp(loadPlayTabLastMvpBundle(teamId));
  }, [livePlaySnapshot, teamId, effectiveMatchId, selectedGameLabel]);

  const mvpDisplayBundle = useMemo(() => {
    if (livePlaySnapshot?.mvp && livePlaySnapshot.events.length > 0) {
      return {
        source: "live" as const,
        mvp: livePlaySnapshot.mvp,
        events: livePlaySnapshot.events,
        matchLabel: selectedGameLabel || undefined,
      };
    }
    if (cachedLastMvp?.mvp && cachedLastMvp.events.length > 0) {
      return {
        source: "recent" as const,
        mvp: cachedLastMvp.mvp,
        events: cachedLastMvp.events,
        matchLabel: cachedLastMvp.matchLabel,
        storedMatchId: cachedLastMvp.matchId,
      };
    }
    return null;
  }, [livePlaySnapshot, cachedLastMvp, selectedGameLabel]);

  const mvpComparisonLinkedGame = useMemo(() => {
    if (!mvpDisplayBundle) return null;
    if (mvpDisplayBundle.source === "live") return linkedGame ?? null;
    if (mvpDisplayBundle.source === "recent" && effectiveMatchId.trim() === mvpDisplayBundle.storedMatchId) {
      return linkedGame ?? null;
    }
    return null;
  }, [mvpDisplayBundle, linkedGame, effectiveMatchId]);

  const mvpMomentSequence = useMemo(() => {
    if (!mvpDisplayBundle) return [];
    return buildMvpMomentSequence(mvpDisplayBundle.events, mvpDisplayBundle.mvp.memberId);
  }, [mvpDisplayBundle]);

  const mvpMetricsCompare = useMemo(() => {
    if (!mvpDisplayBundle) return null;
    return (
      computePlayTabPlayerMetrics(
        mvpDisplayBundle.mvp.memberId,
        mvpDisplayBundle.events,
        simulationRoster,
        teamId,
        mvpComparisonLinkedGame
      ) ?? mvpDisplayBundle.mvp
    );
  }, [mvpDisplayBundle, simulationRoster, teamId, mvpComparisonLinkedGame]);

  const myMvpMetricsCompare = useMemo(() => {
    if (!mvpDisplayBundle || !myPlayer) return null;
    return computePlayTabPlayerMetrics(
      myPlayer.memberId,
      mvpDisplayBundle.events,
      simulationRoster,
      teamId,
      mvpComparisonLinkedGame
    );
  }, [mvpDisplayBundle, myPlayer, simulationRoster, teamId, mvpComparisonLinkedGame]);

  const mvpPlaybackKey = useMemo(() => {
    if (!mvpDisplayBundle) return "";
    const mid =
      mvpDisplayBundle.source === "live" ? effectiveMatchId.trim() : mvpDisplayBundle.storedMatchId;
    return `${mvpDisplayBundle.source}-${mid}-${mvpDisplayBundle.mvp.memberId}-${mvpDisplayBundle.events.length}`;
  }, [mvpDisplayBundle, effectiveMatchId]);

  const participationHint: ParticipationHint | undefined = useMemo(() => {
    if (!myPlayer) return undefined;
    const hasMatch = !!effectiveMatchId?.trim();
    if (!hasMatch) return { hasLinkedGame: false };
    if (linkedGame === undefined) return { hasLinkedGame: false };
    if (linkedGame === null) return { hasLinkedGame: true };
    const entries = linkedGame.playParticipation?.byTeam?.[teamId]?.entries ?? [];
    const entry = entries.find((e) => e.memberId === myPlayer.memberId);
    return {
      hasLinkedGame: true,
      quartersPlayed: entry?.quartersPlayed,
      minutesPlayed: entry?.minutesPlayed,
    };
  }, [effectiveMatchId, linkedGame, myPlayer, teamId]);

  useEffect(() => {
    if (!teamId || !myPlayer?.memberId || myOvrRank == null) {
      setOvrRankLine(null);
      return;
    }
    try {
      const key = `yago.playOvrRank.v1:${teamId}:${myPlayer.memberId}`;
      const raw = localStorage.getItem(key);
      let prev: number | null = null;
      if (raw) {
        const j = JSON.parse(raw) as { r?: unknown };
        if (typeof j.r === "number" && j.r >= 1) prev = j.r;
      }
      if (prev != null && prev !== myOvrRank) {
        const up = myOvrRank < prev;
        setOvrRankLine(`내 순위: ${prev}위 → ${myOvrRank}위 ${up ? "🔼" : "🔽"}`);
      } else {
        setOvrRankLine(`내 순위: ${myOvrRank}위`);
      }
      localStorage.setItem(key, JSON.stringify({ r: myOvrRank }));
    } catch {
      setOvrRankLine(`내 순위: ${myOvrRank}위`);
    }
  }, [teamId, myPlayer?.memberId, myOvrRank]);

  useEffect(() => {
    let cancelled = false;
    const mid = effectiveMatchId?.trim();
    if (!mid) {
      setDeadlineHint("");
      return;
    }
    void getTeamGame(mid).then((g) => {
      if (cancelled) return;
      if (!g) {
        setDeadlineHint("");
        return;
      }
      const ts = g.playedAt ?? g.recordedAt;
      const ms = ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0;
      if (!ms) {
        setDeadlineHint("");
        return;
      }
      const untilMs = ms + 48 * 3600000;
      setDeadlineHint(
        `권장 마감(~48h): ${new Date(untilMs).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`
      );
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveMatchId]);

  const [bannerEntry, setBannerEntry] = useState<PlayFeedbackPromptEntry | undefined>(undefined);
  const [miniShotOpen, setMiniShotOpen] = useState(false);
  useEffect(() => {
    setBannerEntry(peekNextPlayFeedbackPrompt(teamId));
  }, [teamId, searchParams]);

  useEffect(() => {
    if (rankLoading || memberLoading) return;
    if (autoCreateAttempts.current >= 1) return;
    if (!member?.memberDocumentId || !authUid?.trim()) return;
    const hasCard = players.some((p) => p.memberId === member.memberDocumentId);
    if (hasCard) return;
    autoCreateAttempts.current += 1;
    void ensurePlayerStatsDoc(teamId, member).catch(() => {
      /* 1회 실패 후 자동 재시도 안 함 */
    });
  }, [teamId, authUid, member, memberLoading, players, rankLoading]);

  const missingMemberForUser =
    !!authUid?.trim() && !memberLoading && !member?.memberDocumentId;

  if (variant === "lounge") {
    return (
      <div id={TEAM_PLAY_TAB_ANCHOR_ID} className="scroll-mt-24 space-y-2">
        {rankError ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {rankError.message}
          </p>
        ) : null}
        {rankLoading && players.length === 0 ? (
          <p className="text-center text-xs text-slate-500">카드 불러오는 중…</p>
        ) : null}

        <PlayLoungeSection
          title="내 선수 카드"
          summary={myPlayer?.displayName ?? "카드 연결"}
          defaultOpen
        >
          {myPlayer ? (
            <PlayLobbyPlayerSummary
              player={myPlayer}
              participationHint={participationHint}
              superBadgeCount={mySuperBadge.achieved ? mySuperBadge.count : 0}
              ovrRankLine={ovrRankLine}
            />
          ) : (
            <div className={LOUNGE_CARD}>
              <p className="text-sm font-bold text-white">플레이 카드 없음</p>
              <p className="mt-1 text-xs text-slate-400">
                {missingMemberForUser
                  ? "팀 멤버 등록을 확인해 주세요."
                  : "로그인 후 카드를 생성할 수 있어요."}
              </p>
              {member && !rankLoading ? (
                <button
                  type="button"
                  onClick={() => {
                    autoCreateAttempts.current = 0;
                    void ensurePlayerStatsDoc(teamId, member);
                  }}
                  className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
                >
                  카드 만들기
                </button>
              ) : null}
            </div>
          )}
        </PlayLoungeSection>

        <PlayLoungeSection
          title="경기 피드백 · OVR 반영"
          summary={selectedGameLabel ?? "종료 경기 선택"}
          defaultOpen={Boolean(bannerEntry || effectiveMatchId)}
        >
          <div className={LOUNGE_INNER}>
            <PlayActionPanel
              teamId={teamId}
              activeGameId={effectiveMatchId}
              playEntrySource={playEntrySource}
              snapshot={undefined}
              variant="lounge"
            />
            {bannerEntry ? (
              <div className={LOUNGE_CARD}>
                <p className="text-xs font-bold text-white">오늘 경기 피드백</p>
                <button
                  type="button"
                  onClick={() => navigate(playTabHref(bannerEntry.matchId), { replace: true })}
                  className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white"
                >
                  이 경기로 피드백하기
                </button>
              </div>
            ) : null}
            {myPlayer && authUid?.trim() ? (
              <section id="yago-play-match-section" className={LOUNGE_CARD}>
                <h3 className="text-xs font-bold text-white">반영할 종료 경기</h3>
                {completedLoading ? (
                  <p className="mt-2 text-xs text-slate-400">불러오는 중…</p>
                ) : completedGames.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-200/90">완료된 경기가 없어요.</p>
                ) : (
                  <select
                    id="yago-play-match-select"
                    value={effectiveMatchId}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.trim()) navigate(playTabHref(v.trim()), { replace: true });
                    }}
                    className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                  >
                    {completedGames.map((g) => (
                      <option key={g.id} value={g.id}>
                        {formatTeamGameLabel(teamId, g)}
                      </option>
                    ))}
                  </select>
                )}
              </section>
            ) : null}
            {!!effectiveMatchId.trim() && myPlayer && authUid?.trim() ? (
              <PlayMatchFeedbackPanel
                teamId={teamId}
                memberId={myPlayer.memberId}
                userId={authUid.trim()}
                matchId={effectiveMatchId.trim()}
                rankBefore={myOvrRank}
                players={players}
                matchHudContextLine={selectedGameLabel || undefined}
                feedbackSource={playEntrySource}
                hasMvpPanelBelow={false}
              />
            ) : null}
          </div>
        </PlayLoungeSection>

        {mvpDisplayBundle && mvpMetricsCompare ? (
          <PlayLoungeSection title="MVP · 응원" summary="후순위" defaultOpen={false}>
            <PlayTabMvpPanel
              mvp={mvpDisplayBundle.mvp}
              matchHint={mvpDisplayBundle.matchLabel}
              source={mvpDisplayBundle.source}
              myMetrics={myMvpMetricsCompare}
              mvpMetrics={mvpMetricsCompare}
              momentSequence={mvpMomentSequence}
              playbackKey={mvpPlaybackKey}
            />
          </PlayLoungeSection>
        ) : null}

        <PlayLoungeSection title="성장 · 스탯 변화" defaultOpen={false}>
          <div className={LOUNGE_CARD}>
            {myPlayer ? (
              <RecentGrowthChips recentGrowth={myPlayer.recentGrowth} />
            ) : (
              <p className="text-xs text-slate-400">카드가 열리면 표시됩니다.</p>
            )}
          </div>
        </PlayLoungeSection>

        <PlayLoungeSection title="팀 랭킹 · 포지션" defaultOpen={false}>
          <div className={cn(LOUNGE_CARD, "text-slate-900")}>
            <RankingList title="OVR TOP 5" players={ranked} limit={5} highlightMemberId={myPlayer?.memberId} />
          </div>
        </PlayLoungeSection>

        <PlayLoungeSection title="배지" defaultOpen={false}>
          <div className={LOUNGE_CARD}>
            <BadgeList badges={myPlayer?.badges ?? []} />
          </div>
        </PlayLoungeSection>

        <PlayLoungeSection title="플레이 모드" defaultOpen={false}>
          <div className={cn(LOUNGE_CARD, "text-slate-900")}>
            <PlayModeSection
              teamId={teamId}
              linkedMatchGameId={effectiveMatchId?.trim() || null}
              teamName={teamName}
              simulationRoster={simulationRoster}
              highlightMemberId={myPlayer?.memberId}
            />
          </div>
        </PlayLoungeSection>

        {myPlayer && authUid?.trim() ? (
          <PlayLoungeSection title="미니 체감 (1슛)" defaultOpen={false}>
            <div className={LOUNGE_CARD}>
              <Button
                type="button"
                className="w-full bg-amber-500 font-black text-slate-950 hover:bg-amber-400"
                onClick={() => setMiniShotOpen(true)}
              >
                미니 플레이
              </Button>
              <MiniShot3DModal
                open={miniShotOpen}
                onOpenChange={setMiniShotOpen}
                teamId={teamId}
                viewerUid={authUid}
                ovr={myPlayer.ovr}
                shoot={myPlayer.stats.shoot}
                pass={myPlayer.stats.pass}
                onResult={(r) => dispatchTeamPlayHudReveal(buildTeamPlayHudRevealFromMiniShot(r))}
              />
            </div>
          </PlayLoungeSection>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative space-y-8 overflow-x-hidden">
      <header className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-6 text-white shadow-md">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-100/90">Play</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">플레이</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100">
          현실 경기 데이터로 성장하는 내 축구 아바타 — 팀과 함께 레벨업하세요.
        </p>
      </header>

      <WeeklySeasonRewardBanner authUid={authUid} />

      {justCreatedBanner ? (
        <div
          id="yago-just-created-game-banner"
          className="pointer-events-auto relative z-20 isolate rounded-xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-white to-violet-50/60 p-4 shadow-md ring-1 ring-emerald-500/20 scroll-mt-24"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-600/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-800">
              ✨ 새 경기 등록됨
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-900">
              🆕 방금 생성
            </span>
          </div>
          <p className="mt-2 text-base font-black text-emerald-950">지금 하면 팀 플레이가 바로 살아나요</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            <span className="text-gray-600">{teamName}</span>
            <span className="mx-1.5 text-gray-400">vs</span>
            <span className="font-bold">{justCreatedBanner.awayName}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-700">
            <span className="font-bold text-emerald-900">결과·출전</span>만 채워도 카드·시뮬·MVP 반영이 이어져요. 나중으로 미루면 팀원 흐름이 끊길 수 있어요.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to={`/teams/${encodeURIComponent(teamId)}/games/${encodeURIComponent(justCreatedBanner.gameId)}/edit`}
              className={cn(
                "inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-md shadow-emerald-900/15 transition-all duration-300 hover:bg-emerald-500 sm:min-w-[10rem] sm:flex-none",
                justCreatedCtaGlow &&
                  "z-10 scale-[1.02] shadow-lg shadow-amber-500/35 ring-4 ring-amber-400/90 ring-offset-2 ring-offset-emerald-50"
              )}
            >
              지금 결과 입력하기
            </Link>
            <Link
              to={`/teams/${encodeURIComponent(teamId)}/games/${encodeURIComponent(justCreatedBanner.gameId)}/participation`}
              className={cn(
                "inline-flex flex-1 items-center justify-center rounded-xl border-2 border-emerald-600/90 bg-white px-4 py-3 text-center text-sm font-black text-emerald-900 shadow-sm transition-all duration-300 hover:bg-emerald-50 sm:min-w-[10rem] sm:flex-none",
                justCreatedCtaGlow &&
                  "z-10 scale-[1.02] shadow-lg shadow-amber-500/35 ring-4 ring-amber-400/90 ring-offset-2 ring-offset-white"
              )}
            >
              출전 입력하기
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-emerald-200/60 pt-3">
            <Link
              to={`/teams/${encodeURIComponent(teamId)}/games`}
              className="text-xs font-bold text-emerald-800 underline-offset-2 hover:underline"
            >
              경기 목록에서 보기
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <button
              type="button"
              onClick={() => setJustCreatedBanner(null)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800"
            >
              배너 닫기
            </button>
          </div>
        </div>
      ) : null}

      {rankError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          플레이 카드 동기화 오류: {rankError.message}
        </div>
      )}

      {rankLoading && players.length === 0 && (
        <p className="text-center text-sm font-medium text-gray-500">플레이 카드 불러오는 중…</p>
      )}

      {bannerEntry && (
        <div className="pointer-events-auto relative z-20 isolate rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 shadow-sm">
          <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-900">🏁 오늘 경기 — 지금 평가하면 반영돼요</p>
              <p className="mt-1 text-xs font-medium text-gray-700">
                감각 한 줄만 남겨도 <span className="font-bold text-indigo-700">EXP·OVR·MVP</span>에 바로 연결돼요.
              </p>
            </div>
            <div className="relative z-[2] flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate(playTabHref(bannerEntry.matchId), { replace: true })
                }
                className="relative cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-900/20 hover:bg-indigo-500"
              >
                이 경기로 열기 · 피드백하기
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissPlayFeedbackPrompt(bannerEntry.teamId, bannerEntry.matchId);
                  setBannerEntry(peekNextPlayFeedbackPrompt(teamId));
                }}
                className="relative cursor-pointer rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-white hover:text-gray-900"
              >
                잠깐 넘기기
              </button>
            </div>
          </div>
        </div>
      )}

      {myPlayer && authUid?.trim() && (
        <div className="relative z-0 space-y-4">
          <section
            id="yago-play-match-section"
            className={cn(
              "rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-[box-shadow,ring] duration-300",
              matchSectionCtaGlow &&
                "z-[1] ring-2 ring-indigo-400/90 ring-offset-2 ring-offset-white shadow-lg shadow-indigo-500/25 motion-reduce:ring-1 motion-reduce:shadow-md"
            )}
          >
            <h3 className="text-sm font-bold text-gray-900">플레이 반영 경기 선택</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              <Link to={`/teams/${teamId}/games`} className="font-semibold text-indigo-600 hover:underline">
                경기 기록
              </Link>
              에서 <strong className="text-gray-800">종료 처리된 경기</strong>만 여기 목록에 올라옵니다. 아래에서 고른 경기가
              피드백·MVP·내 카드에 그대로 반영돼요.
            </p>
            {completedLoading ? (
              <p className="mt-3 text-sm text-gray-500">종료 경기 불러오는 중…</p>
            ) : completedGames.length === 0 ? (
              <p className="mt-3 text-sm text-amber-900">
                완료된 경기가 아직 없어요. 결과를 입력한 뒤 이곳에서 감각 피드를 남길 수 있어요.
              </p>
            ) : (
              <>
                {selectedGameLabel ? (
                  <div className="mt-3 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">이 경기에 반영됨</p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900">{selectedGameLabel}</p>
                    <p className="mt-1 text-[11px] font-medium text-gray-600">
                      피드백·MVP·내 카드는 모두 이 경기 기준으로 보여요.
                    </p>
                  </div>
                ) : null}
                <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  반영할 종료 경기
                  <select
                    id="yago-play-match-select"
                    value={effectiveMatchId}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v.trim()) return;
                      navigate(playTabHref(v.trim()), {
                        replace: true,
                      });
                    }}
                    className={cn(
                      "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium transition-[box-shadow,ring] duration-200 motion-reduce:transition-none",
                      matchSelectCtaGlow &&
                        "z-[1] ring-2 ring-violet-500/90 ring-offset-2 ring-offset-white shadow-md shadow-violet-500/25 outline-none motion-reduce:shadow-none motion-reduce:ring-violet-600/85 motion-reduce:ring-offset-1"
                    )}
                  >
                    {completedGames.map((g) => (
                      <option key={g.id} value={g.id}>
                        {formatTeamGameLabel(teamId, g)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {completedGames.length > 0 && !!effectiveMatchId.trim() && (
              <p className="mt-2 text-xs leading-relaxed text-gray-600">
                <Link
                  to={`/teams/${teamId}/games/${encodeURIComponent(effectiveMatchId.trim())}/participation`}
                  className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
                >
                  이 경기 출전 쿼터 입력
                </Link>
                <span className="text-gray-500"> · 팀 오너/관리자만 편집</span>
              </p>
            )}
            {completedGames.length > 0 && !!effectiveMatchId.trim() && (
              <div className="mt-4 space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-indigo-900">
                  <span>팀 피드백 진행</span>
                  {progressLoading ? (
                    <span className="text-gray-500">집계 중…</span>
                  ) : (
                    <span className="tabular-nums">{ratioLabel}</span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
                    style={{
                      width:
                        eligibleMemberCount > 0
                          ? `${Math.min(100, Math.round((feedbackCount / eligibleMemberCount) * 100))}%`
                          : "0%",
                    }}
                  />
                </div>
                {deadlineHint ? (
                  <p className="text-[11px] font-medium text-amber-900/90">{deadlineHint}</p>
                ) : (
                  <p className="text-[11px] text-gray-600">
                    피드백은 경기 종료 직후가 가장 정확해요 · 팀원이 함께할수록 순위 신뢰도가 올라가요.
                  </p>
                )}
                {!progressLoading && pendingNames.length > 0 && (
                  <div className="mt-2 rounded-md border border-amber-100 bg-amber-50/80 px-2.5 py-2">
                    <p className="text-[11px] font-bold text-amber-950">아직 안 한 사람</p>
                    <p className="mt-1 text-[11px] font-medium leading-snug text-amber-900/95">
                      {(() => {
                        const max = 12;
                        const head = pendingNames.slice(0, max);
                        const rest = pendingNames.length - head.length;
                        return (
                          <>
                            {head.join(", ")}
                            {rest > 0 ? ` 외 ${rest}명` : ""}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                )}
                {!!effectiveMatchId.trim() && (
                  <div className="mt-3">
                    <PlayMatchRecapShare
                      teamId={teamId}
                      matchId={effectiveMatchId.trim()}
                      teamName={teamName}
                      rankedPlayers={ranked}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {!!effectiveMatchId.trim() && (
            <PlayMatchFeedbackPanel
              teamId={teamId}
              memberId={myPlayer.memberId}
              userId={authUid.trim()}
              matchId={effectiveMatchId.trim()}
              rankBefore={myOvrRank}
              players={players}
              matchHudContextLine={selectedGameLabel || undefined}
              feedbackSource={playEntrySource}
              hasMvpPanelBelow={Boolean(mvpDisplayBundle && mvpMetricsCompare)}
            />
          )}
        </div>
      )}

      {mvpDisplayBundle && mvpMetricsCompare ? (
        <div id="yago-play-mvp-panel" className="scroll-mt-28">
          <PlayTabMvpPanel
            mvp={mvpDisplayBundle.mvp}
            matchHint={
              mvpDisplayBundle.source === "live"
                ? mvpDisplayBundle.matchLabel
                : mvpDisplayBundle.matchLabel ||
                  `저장된 경기 · ${mvpDisplayBundle.storedMatchId.length > 10 ? `${mvpDisplayBundle.storedMatchId.slice(0, 8)}…` : mvpDisplayBundle.storedMatchId}`
            }
            source={mvpDisplayBundle.source}
            myMetrics={myMvpMetricsCompare}
            mvpMetrics={mvpMetricsCompare}
            momentSequence={mvpMomentSequence}
            playbackKey={mvpPlaybackKey}
          />
          {myPlayer && authUid?.trim() ? (
            <div className="mt-4 rounded-xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 shadow-sm dark:border-indigo-800/55 dark:from-indigo-950/45 dark:to-violet-950/35">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                다음 경기
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium leading-snug text-gray-700 dark:text-gray-200">
                  다른 종료 경기를 고르면 피드백·OVR·MVP 루프를 바로 이어갈 수 있어요.
                </p>
                <Button
                  type="button"
                  className="h-10 shrink-0 bg-indigo-600 px-4 font-bold text-white shadow hover:bg-indigo-500"
                  onClick={goToNextMatchFeedbackFromMvp}
                >
                  <Flame className="mr-1.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden />
                  연승 이어가기
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 내 카드 — 상단 스티키 + 스케일·글로우 무대 */}
      <div id="yago-play-my-card" className="sticky top-0 z-40 scroll-mt-28 -mx-1 px-1 pb-1">
        <div className="rounded-3xl border border-indigo-200/80 bg-gray-50/95 p-5 shadow-[0_20px_50px_-20px_rgba(79,70,229,0.45)] ring-2 ring-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-gray-50/90">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-600 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                내 선수 카드
              </h3>
              <p className="mt-1 text-xs font-medium text-indigo-800/70">팀에서 가장 자랑하고 싶은 한 장 — 여기가 홈 포지션</p>
              {myPlayer && ovrRankLine ? (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-100/90 px-3 py-1 text-[11px] font-bold text-indigo-950 ring-1 ring-indigo-200/80">
                  <span aria-hidden>📈</span> {ovrRankLine}
                </p>
              ) : null}
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-indigo-600/35">
              MY LOADOUT
            </span>
          </div>
          <div className="relative flex justify-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[-8%] top-[-6%] bottom-[-8%] rounded-[2rem] bg-gradient-to-br from-indigo-400/25 via-transparent to-violet-500/20 blur-xl"
            />
            <div className="relative w-full max-w-sm origin-top scale-100 sm:max-w-md sm:scale-[1.02]">
              {myPlayer ? (
                <PlayerCard
                  player={myPlayer}
                  highlight
                  hero
                  participationHint={participationHint}
                  superBadgeCount={mySuperBadge.achieved ? mySuperBadge.count : 0}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-indigo-300 bg-white/90 p-8 text-center shadow-inner">
                  <p className="text-base font-bold text-gray-900">아직 이 팀에 연결된 플레이 카드가 없어요</p>
                  <p className="mt-2 text-sm text-gray-600">
                    {missingMemberForUser
                      ? "`teams/…/members`에서 내 계정(userId)을 찾지 못했어요. 멤버로 등록되어 있는지 확인해 주세요."
                      : authUid?.trim()
                        ? "멤버 정보를 기준으로 카드를 만들고 있어요. 문제가 계속되면 아래 버튼을 눌러 주세요."
                        : "로그인 후 플레이 카드를 불러올 수 있어요."}
                  </p>
                  {member && !rankLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        autoCreateAttempts.current = 0;
                        void ensurePlayerStatsDoc(teamId, member);
                      }}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-500"
                    >
                      내 카드 다시 만들기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section
        id="yago-play-growth-section"
        className="scroll-mt-28 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">최근 성장</h3>
            <p className="mt-1 text-xs text-gray-500">경기 피드백으로 반영된 최신 변화입니다.</p>
          </div>
        </div>

        {myPlayer && growthBoost && (
          <div className="mt-4 overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-3 text-sm shadow-inner">
            <p className="font-black text-amber-950">
              <span className="inline-flex animate-pulse rounded-md bg-amber-400 px-2 py-0.5 text-xs text-amber-950">
                레벨 파워 업
              </span>{" "}
              <span className="mt-2 block pt-2 text-amber-900/95 sm:inline sm:pl-2 sm:pt-0">
                능력치가 올랐어요 · 곧 더 센 경기 데이터가 카드로 이어져요!
              </span>
            </p>
          </div>
        )}
        <div className={`${myPlayer && growthBoost ? "mt-3" : "mt-4"} `}>
          {myPlayer ? (
            <RecentGrowthChips recentGrowth={myPlayer.recentGrowth} />
          ) : (
            <p className="text-sm text-gray-500">카드가 열리면 성장 기록이 여기에 쌓여요.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <RankingList
          title="OVR TOP 5"
          players={ranked}
          limit={5}
          highlightMemberId={myPlayer?.memberId}
        />
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h4 className="text-sm font-bold text-gray-900">포지션별 1위</h4>
          <p className="mt-1 text-xs text-gray-500">같은 포지션 안에서 OVR 기준입니다.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {POSITION_ORDER.map((pos) => (
              <div key={pos} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{pos}</p>
                <RankingList title="" players={ranked} limit={1} position={pos} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <BadgeList badges={myPlayer?.badges ?? []} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <PlayModeSection
          teamId={teamId}
          linkedMatchGameId={effectiveMatchId?.trim() || null}
          teamName={teamName}
          simulationRoster={simulationRoster}
          highlightMemberId={myPlayer?.memberId}
        />
      </section>

      {myPlayer && authUid?.trim() ? (
        <section className="rounded-xl border border-indigo-200/70 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">미니 체감 (1슛)</h3>
              <p className="mt-1 text-xs leading-relaxed text-indigo-100/85">
                내 카드 슛·패스·OVR이 조작감에 반영돼요. 한 번만 슛하고 HUD에 소량 XP 연출이 붙습니다.
              </p>
            </div>
            <Button
              type="button"
              className="h-10 shrink-0 bg-amber-400 px-4 font-black text-slate-950 shadow hover:bg-amber-300"
              onClick={() => setMiniShotOpen(true)}
            >
              미니 플레이 해보기
            </Button>
          </div>
          <MiniShot3DModal
            open={miniShotOpen}
            onOpenChange={setMiniShotOpen}
            teamId={teamId}
            viewerUid={authUid}
            ovr={myPlayer.ovr}
            shoot={myPlayer.stats.shoot}
            pass={myPlayer.stats.pass}
            onResult={(r) => {
              dispatchTeamPlayHudReveal(buildTeamPlayHudRevealFromMiniShot(r));
            }}
          />
        </section>
      ) : null}

      <p className="text-center text-[11px] text-gray-400">
        플레이 카드는 Firestore <code className="rounded bg-gray-100 px-1">teams/…/playerStats</code> 에 동기화됩니다. 시뮬은
        카드가 없을 때만 데모 로스터를 씁니다.
      </p>
    </div>
  );
}
