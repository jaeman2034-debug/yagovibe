/**
 * 팀 플레이 라운지 — `/teams/:teamId/play` (프리로비·HUD·모드 선택)
 * 실제 미니게임 씬: `/playground` · 큐: `/matchmaking` · 세션: `/game/session/:id`
 * 비회원도 열람 가능(멤버 전용 액션은 PlayTab·서비스에서 제한)
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams, useLocation, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Crown, Flame, Sparkles, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import PlayTab from "@/components/team/play/PlayTab";
import { TeamPlayHeader } from "@/components/team/play/TeamPlayHeader";
import { TeamPlayHUD } from "@/components/team/play/TeamPlayHUD";
import { RecentMatchSummary } from "@/components/team/play/RecentMatchSummary";
import { TEAM_PLAY_TAB_ANCHOR_ID } from "@/components/team/play/PlayActionPanel";
import { PlayLobbyDestinations } from "@/components/team/play/PlayLobbyDestinations";
import { useTeamPlayHudReveal } from "@/hooks/useTeamPlayHudReveal";
import { TeamPlayXpGainFloat } from "@/components/team/play/hud/TeamPlayXpGainFloat";
import { Button } from "@/components/ui/button";
import { TRACK } from "@/lib/analytics";
import {
  PLAY_TAB_CTA_SCROLL_EVENT,
  TEAM_PLAY_PAGE_SOURCE_STORAGE_KEY,
  isUserMemberOfTeam,
  type PlayTabCtaScrollDetail,
  type TeamPlayPageViewSource,
} from "@/lib/team/teamPlayRoutes";

export default function TeamPlayPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { teamMembers, loading: myTeamsLoading } = useMyTeams();
  const isTeamMember = Boolean(
    user && !myTeamsLoading && teamId && isUserMemberOfTeam(teamMembers, teamId)
  );
  const [teamName, setTeamName] = useState("우리 팀");
  const [playEntrySource, setPlayEntrySource] = useState<TeamPlayPageViewSource>("direct");
  const playEntrySourceRef = useRef<TeamPlayPageViewSource>("direct");
  const activeGameId = searchParams.get("matchId")?.trim() ?? "";
  /** 보상 후 CTA 연타 시 scroll/이벤트 중복 방지 */
  const postRewardCtaNavAtRef = useRef(0);
  const {
    snapshot,
    staggerHudReveal,
    applyPostMatchUpdate,
    xpFloat,
    hudXpEcho,
    hudLevelUpBurst,
    postRewardNextActionCta,
    dismissPostRewardNextActionCta,
  } = useTeamPlayHudReveal({ teamId });

  const goToPlayMatchFlow = () => {
    const now = Date.now();
    if (now - postRewardCtaNavAtRef.current < 450) return;
    postRewardCtaNavAtRef.current = now;

    const gid = activeGameId.trim();
    TRACK("CTA_CLICK_RESULT", {
      team_id: teamId,
      source: playEntrySource,
      ...(gid ? { game_id: gid } : {}),
      via: "post_reward_cta",
    });
    dismissPostRewardNextActionCta();
    document.getElementById(TEAM_PLAY_TAB_ANCHOR_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(
      new CustomEvent<PlayTabCtaScrollDetail>(PLAY_TAB_CTA_SCROLL_EVENT, { detail: { intent: "streak" } })
    );
  };

  useLayoutEffect(() => {
    let src: TeamPlayPageViewSource = "direct";
    const st = location.state as { justCreatedGameId?: string } | null | undefined;
    const gid = typeof st?.justCreatedGameId === "string" ? st.justCreatedGameId.trim() : "";
    if (gid) {
      src = "create_flow";
    } else {
      try {
        if (sessionStorage.getItem(TEAM_PLAY_PAGE_SOURCE_STORAGE_KEY) === "tab_click") {
          src = "tab_click";
          sessionStorage.removeItem(TEAM_PLAY_PAGE_SOURCE_STORAGE_KEY);
        }
      } catch {
        /* ignore */
      }
    }
    playEntrySourceRef.current = src;
    setPlayEntrySource(src);
  }, [location.state, teamId]);

  useEffect(() => {
    if (!teamId.trim()) return;
    TRACK("PLAY_PAGE_VIEW", { team_id: teamId, source: playEntrySourceRef.current });
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    void getDoc(doc(db, "teams", teamId)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      const n = snap.data()?.name;
      if (typeof n === "string" && n.trim()) setTeamName(n.trim());
    });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!teamId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">팀 정보가 없습니다.</div>
    );
  }

  const tid = encodeURIComponent(teamId);

  const runDemoReveal = () => {
    applyPostMatchUpdate({
      ovr: 78,
      ovrDelta: 2,
      ovrMomentumLabel: "🔥 최근 4경기 연속 상승",
      level: 12,
      xpCurrent: 210,
      xpToNext: 100,
      xpGainRecent: 90,
      mvpRank: 1,
      mvpLeadPoints: 0,
      mvpTrendLabel: "선두",
      mvpTurnaroundLine: "👑 이번 주 MVP 레이스 선두",
      mvpChaserRank: 2,
      mvpChaserGapPoints: 2,
      streakWins: 3,
      lastMatchScore: "4 : 2",
      lastMatchLabel: "방금 반영한 경기 (데모)",
    });
  };

  const runDemoLevelUpReveal = () => {
    applyPostMatchUpdate({
      ovr: 79,
      ovrDelta: 1,
      ovrMomentumLabel: "⭐ Lv.12 → Lv.13 레벨 업",
      level: 13,
      xpCurrent: 12,
      xpToNext: 100,
      xpGainRecent: 88,
      levelUpBurst: { fromLevel: 12, toLevel: 13 },
      mvpRank: 1,
      mvpLeadPoints: 0,
      mvpTrendLabel: "선두",
      mvpTurnaroundLine: "👑 이번 주 MVP 레이스 선두",
      mvpChaserRank: 2,
      mvpChaserGapPoints: 2,
      streakWins: 3,
      lastMatchScore: "2 : 1",
      lastMatchLabel: "방금 반영한 경기 (데모 · 레벨업)",
    });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070b14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <Link
            to={`/team/${tid}/public`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            팀 프로필 보기
          </Link>
          {isTeamMember ? (
            <>
              <span className="hidden text-slate-600 sm:inline" aria-hidden>
                |
              </span>
              <Link
                to={`/team/${tid}`}
                className="text-xs font-semibold text-cyan-400 hover:underline"
              >
                팀 홈 · 채팅 · 일정
              </Link>
            </>
          ) : null}
          {import.meta.env.DEV ? (
            <>
              <span className="hidden text-slate-600 sm:inline" aria-hidden>
                |
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-violet-300 text-xs font-semibold text-violet-800 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-950/40"
                onClick={runDemoReveal}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
                HUD 반영 연출 (데모)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-amber-400/80 text-xs font-semibold text-amber-900 hover:bg-amber-50 dark:border-amber-600/70 dark:text-amber-100 dark:hover:bg-amber-950/35"
                onClick={runDemoLevelUpReveal}
              >
                <Crown className="mr-1 h-3.5 w-3.5" aria-hidden />
                레벨업 연출 (데모)
              </Button>
            </>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-md space-y-3 px-4 py-3 pb-8">
        <TeamPlayHeader teamName={teamName} />
        <div className="relative">
          <TeamPlayXpGainFloat payload={xpFloat} />
          <TeamPlayHUD
            snapshot={snapshot}
            staggerHudReveal={staggerHudReveal}
            xpEcho={hudXpEcho}
            levelUpBurst={hudLevelUpBurst}
            hideMvp
          />
        </div>
        <PlayLobbyDestinations />
        <RecentMatchSummary snapshot={snapshot} variant="compact" />
        {postRewardNextActionCta ? (
          <div
            id="yago-post-reward-cta"
            role="region"
            aria-label="다음 행동"
            className="flex flex-col gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">피드백 이어가기</p>
              <p className="mt-0.5 text-xs text-slate-300">반영 완료. 경기 선택으로 OVR·MVP 루프를 이어가요.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-10 bg-cyan-600 px-4 font-bold text-white shadow hover:bg-cyan-500"
                onClick={goToPlayMatchFlow}
              >
                <Flame className="mr-1.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden />
                연승 이어가기
              </Button>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="배너 닫기"
                onClick={() => dismissPostRewardNextActionCta()}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
        <p className="pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">더 보기</p>
        <PlayTab
          teamId={teamId}
          authUid={user?.uid ?? undefined}
          teamName={teamName}
          playEntrySource={playEntrySource}
          variant="lounge"
        />
      </main>
    </div>
  );
}
