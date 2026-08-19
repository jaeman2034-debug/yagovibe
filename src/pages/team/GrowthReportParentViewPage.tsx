import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Download, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { ParentGrowthHeroCard } from "@/components/ai-growth/ParentGrowthHeroCard";
import { TacticalTrainingRecommendationCard } from "@/components/ai-growth/TacticalTrainingRecommendationCard";
import { generateGuardianNarrative } from "@/components/ai-growth/guardianNarrative";
import {
  buildComparisonBaselineFromSessions,
  compareGrowthScoreToHistory,
} from "@/lib/ai-growth/growthScore";
import {
  markGrowthReportViewedLocally,
  storedEventsToVerifiedItems,
} from "@/lib/ai-growth/growthReportFromSession";
import { canAccessGrowthReportSession, describeGrowthReportAccessDenial } from "@/lib/ai-growth/growthReportParentAccess";
import {
  getPlayerGrowthSessionByDocId,
  listPlayerGrowthSessions,
} from "@/lib/ai-growth/playerGrowthHistoryService";
import { computeGrowthScore } from "@/lib/ai-growth/growthScore";
import { isFiiEngineV1Enabled, isTacticalAgentV1Enabled } from "@/lib/fii/fiiFeatureFlags";
import { db } from "@/lib/firebase";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";
import { readParentLinksForTeam } from "@/lib/team/parentLinksRead";
import { readPlayers } from "@/lib/team/teamMemberRead";

type LoadState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "not_found" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      teamName: string;
      playerName: string;
      pdfUrl: string | null;
      pdfFilename: string | null;
    };

/** Sprint D-1d — 보호자 성장 리포트 뷰 (Hero · TOP3 · 코치 검증) */
export default function GrowthReportParentViewPage() {
  const { teamId = "", sessionId = "" } = useParams<{ teamId: string; sessionId: string }>();
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [historySessions, setHistorySessions] = useState<
    Awaited<ReturnType<typeof listPlayerGrowthSessions>>
  >([]);
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof getPlayerGrowthSessionByDocId>>
  >(null);

  const memberRole = useMemo(
    () => teamMembers.find((tm) => tm.teamId === teamId)?.role,
    [teamMembers, teamId]
  );

  useEffect(() => {
    if (!teamId || !sessionId || !user?.uid || teamsLoading) return;

    let cancelled = false;
    setLoadState({ status: "loading" });

    void (async () => {
      try {
        const [loadedSession, links, roster, academyPlayers, teamSnap] = await Promise.all([
          getPlayerGrowthSessionByDocId(teamId, sessionId),
          readParentLinksForTeam(teamId),
          readPlayers(teamId),
          readAcademyPlayers(teamId),
          getDoc(doc(db, "teams", teamId)),
        ]);

        if (cancelled) return;
        if (!loadedSession) {
          setLoadState({ status: "not_found" });
          return;
        }

        const rosterNames = new Map<string, string>();
        for (const r of roster) {
          rosterNames.set(r.memberDocumentId, r.displayName);
          if (r.billingUid) rosterNames.set(r.billingUid, r.displayName);
          if (r.linkedAuthUid) rosterNames.set(r.linkedAuthUid, r.displayName);
        }
        for (const p of academyPlayers) {
          rosterNames.set(p.playerId, p.displayName);
        }

        const allowed = canAccessGrowthReportSession({
          memberRole,
          parentUid: user.uid,
          session: loadedSession,
          parentLinks: links,
          rosterNames,
        });

        if (!allowed) {
          console.warn(
            "[GrowthReportParentViewPage] access denied",
            describeGrowthReportAccessDenial({
              memberRole,
              parentUid: user.uid,
              session: loadedSession,
              parentLinks: links,
              rosterNames,
            })
          );
          setLoadState({ status: "denied" });
          return;
        }

        const sessions = await listPlayerGrowthSessions(teamId, loadedSession.playerName);
        if (cancelled) return;

        setSession(loadedSession);
        setHistorySessions(sessions);
        markGrowthReportViewedLocally(teamId, sessionId);

        setLoadState({
          status: "ready",
          teamName: String(teamSnap.data()?.name ?? teamId),
          playerName: loadedSession.playerName,
          pdfUrl: loadedSession.delivery?.pdfDownloadUrl ?? null,
          pdfFilename: loadedSession.delivery?.pdfFilename ?? null,
        });
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: error instanceof Error ? error.message : "불러오기 실패",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, sessionId, user?.uid, teamsLoading, memberRole]);

  const verifiedItems = useMemo(
    () => (session ? storedEventsToVerifiedItems(session) : []),
    [session]
  );
  const growthScore = useMemo(
    () => (verifiedItems.length > 0 ? computeGrowthScore(verifiedItems) : null),
    [verifiedItems]
  );
  const growthScoreDelta = useMemo(() => {
    if (!growthScore?.snapshot.overall || !session) return null;
    const baseline = buildComparisonBaselineFromSessions(
      historySessions,
      session.videoId
    );
    return compareGrowthScoreToHistory(growthScore.snapshot.overall, baseline);
  }, [growthScore, historySessions, session]);

  const narrative = useMemo(() => {
    if (!session) return null;
    return generateGuardianNarrative({
      playerName: session.playerName,
      tone: session.tone,
      verifiedItems,
    });
  }, [session, verifiedItems]);

  if (loadState.status === "loading" || teamsLoading) {
    return (
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-12 text-sm text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        성장 리포트 불러오는 중…
      </div>
    );
  }

  if (loadState.status === "denied") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-gray-700">
        <p className="font-semibold">이 리포트를 볼 권한이 없습니다.</p>
        <Link to="/home/parent" className="mt-4 inline-block text-indigo-600 underline">
          보호자 홈
        </Link>
      </div>
    );
  }

  if (loadState.status === "not_found") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-gray-700">
        <p className="font-semibold">리포트를 찾을 수 없습니다.</p>
        <Link to="/home/parent" className="mt-4 inline-block text-indigo-600 underline">
          보호자 홈
        </Link>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-red-700">
        {loadState.message}
      </div>
    );
  }

  const { teamName, playerName, pdfUrl, pdfFilename } = loadState;

  return (
    <div
      className="mx-auto max-w-lg space-y-4 px-4 py-6 pb-16"
      data-testid="growth-report-parent-view"
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-violet-700">
          <Sparkles className="h-5 w-5" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide">YAGO 성장 리포트</p>
        </div>
        <h1 className="text-xl font-black text-gray-900">{playerName} 선수</h1>
        <p className="text-sm text-gray-600">
          {teamName} · 코치가 확인한 훈련 리포트
        </p>
      </header>

      <ParentGrowthHeroCard
        playerName={playerName}
        growthScore={growthScore}
        delta={growthScoreDelta}
        historySessions={historySessions}
        historyLoading={false}
      />

      {growthScore && isFiiEngineV1Enabled() && isTacticalAgentV1Enabled() ? (
        <section aria-label="다음 훈련 추천">
          <p className="mb-2 text-sm font-bold text-violet-950">다음 훈련 추천 TOP 3</p>
          <TacticalTrainingRecommendationCard growthScore={growthScore} audience="parent" />
        </section>
      ) : null}

      {narrative && narrative.eventBlocks.length > 0 ? (
        <section
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-label="코치 검증 장면"
        >
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
            <h2 className="text-base font-bold text-gray-900">코치 검증 장면</h2>
          </div>
          <p className="text-xs text-gray-600">{narrative.opening}</p>
          <ul className="mt-3 space-y-3">
            {narrative.eventBlocks.map((block) => (
              <li
                key={block.eventId}
                className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3"
              >
                <p className="text-sm font-bold text-violet-900">{block.labelKo}</p>
                <p className="mt-2 text-[11px] font-semibold text-indigo-600">무엇을 잘했는가</p>
                <p className="text-sm leading-relaxed text-gray-800">{block.behavior}</p>
                <p className="mt-2 text-[11px] font-semibold text-emerald-700">왜 중요한가</p>
                <p className="text-sm leading-relaxed text-gray-800">{block.meaning}</p>
                <p className="mt-2 text-[11px] font-semibold text-blue-700">다음 훈련</p>
                <p className="text-sm leading-relaxed text-gray-800">{block.training}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pdfUrl ? (
        <Button type="button" className="w-full gap-2" asChild>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={pdfFilename ?? undefined}
            data-testid="growth-report-parent-pdf-download"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF 다운로드
          </a>
        </Button>
      ) : null}

      <p className="text-center text-xs text-gray-500">
        <Link to="/home/parent" className="text-indigo-600 underline">
          보호자 홈
        </Link>
      </p>
    </div>
  );
}
