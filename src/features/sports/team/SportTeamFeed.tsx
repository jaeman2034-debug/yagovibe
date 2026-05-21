/**
 * 종목 허브 — 팀 탭
 * - 추천 팀(플랫폼 등록 팀 엔티티) + 모집 마켓 글 분리
 * - `?teamId=` 있으면 HUD → 플레이는 `/teams/:id/play` (비회원 포함 공개)
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { getTimeAgo, toDate } from "@/utils/timeUtils";
import FeedSkeletonGrid from "@/components/sports/FeedSkeletonGrid";
import FeedEmptyState from "@/components/sports/FeedEmptyState";
import { fetchMarketPosts } from "@/services/marketService";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { getTeamSummary } from "@/services/teamSummaryService";
import type { TeamSummary } from "@/types/teamSummary";
import { fetchRecommendedTeamsForSport, type RecommendedTeamRow } from "@/services/sportHubTeamDiscovery";
import { RecommendedTeamsSection } from "./RecommendedTeamsSection";
import { cn } from "@/lib/utils";
import { markTeamPlayEntryFromAppNav, teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";

interface TeamPost {
  id: string;
  sport: string;
  type?: string;
  title: string;
  content?: string;
  authorId: string;
  authorName?: string;
  createdAt: unknown;
  views?: number;
  participantsCount?: number;
  images?: string[];
  teamId?: string;
}

export interface SportTeamFeedProps {
  sport: string;
}

function parseTeamIdFromSearch(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const t = raw.trim();
  if (t === "null" || t === "undefined") return null;
  return t;
}

export type TeamHudSnapshot = {
  name: string | null;
  memberCount: number | null;
  summary: TeamSummary | null;
};

function activitySubtitle(summary: TeamSummary | null): string {
  if (summary?.lastMatchAt) {
    return `최근 경기 ${getTimeAgo(toDate(summary.lastMatchAt))}`;
  }
  if (summary && summary.matches > 0) {
    return `누적 ${summary.matches}경기 · 팀 플레이에서 상세 기록을 확인하세요.`;
  }
  return "요약 경기가 없습니다. 팀 플레이에서 첫 기록을 남겨보세요.";
}

/** `?teamId` 없음 — 팀 가입·생성 유도 (HUD는 teamId 있을 때만) */
function TeamJoinOnboardingBanner({ sport }: { sport: string }) {
  const navigate = useNavigate();

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900/40 dark:to-gray-900">
      <p className="text-base font-semibold text-gray-900 dark:text-white">팀에 가입하면 플레이가 시작됩니다</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        모집을 둘러보거나 팀을 만들면 경기·MVP·성장 루프가 이어져요.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="w-full border-emerald-300 text-emerald-800 hover:bg-emerald-50 sm:w-auto dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
          onClick={() =>
            navigate(`/team/search?sport=${encodeURIComponent(sport)}`)
          }
        >
          팀 찾기
        </Button>
        <Button
          type="button"
          className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700 sm:w-auto"
          onClick={() => navigate(`/sports/${encodeURIComponent(sport)}/team/create`)}
        >
          팀 만들기
        </Button>
      </div>
    </div>
  );
}

function TeamPlayHudCard({
  teamId,
  loading,
  hud,
}: {
  teamId: string;
  loading: boolean;
  hud: TeamHudSnapshot | null;
}) {
  const navigate = useNavigate();
  const displayName = loading ? "불러오는 중…" : hud?.name?.trim() || "선택된 팀";
  const summary = hud?.summary ?? null;
  const recordLine =
    summary != null ? `${summary.matches}경기 · ${summary.wins}승 ${summary.draws}무 ${summary.losses}패` : null;

  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-white/10 p-5 text-white shadow-lg",
        "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600",
        "ring-1 ring-white/10"
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-white/75">내 팀</div>
          <div className={cn("mt-0.5 text-2xl font-bold tracking-tight", loading && "animate-pulse")}>
            {displayName}
          </div>
          {hud?.memberCount != null && hud.memberCount > 0 ? (
            <div className="mt-1 text-xs text-white/80">멤버 {hud.memberCount}명</div>
          ) : null}
          <p className="mt-2 text-xs leading-relaxed text-white/85">
            이 팀에서 플레이 · 성장 · MVP 경쟁을 이어갑니다.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl bg-white/10 px-2 py-2.5 sm:px-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">OVR</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums">—</div>
              <div className="text-[10px] text-white/65">팀 플레이 집계</div>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2.5 sm:px-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">MVP</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums">—</div>
              <div className="text-[10px] text-white/65">경기 후 갱신</div>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2.5 sm:px-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">전적</div>
              <div className="mt-0.5 text-sm font-bold leading-snug sm:text-base">
                {loading ? "…" : recordLine ?? "—"}
              </div>
              <div className="text-[10px] text-white/65">team 요약</div>
            </div>
          </div>

          <p className="mt-3 text-xs text-white/90">{loading ? "활동 불러오는 중…" : activitySubtitle(summary)}</p>
        </div>

        <Button
          type="button"
          className="w-full shrink-0 bg-white font-semibold text-purple-700 shadow-md transition hover:bg-white/95 hover:scale-[1.02] lg:w-auto"
          onClick={() => {
            markTeamPlayEntryFromAppNav();
            navigate(teamPlayEntryPath(teamId));
          }}
        >
          플레이 🚀
        </Button>
      </div>
    </div>
  );
}

export default function SportTeamFeed({ sport }: SportTeamFeedProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamId = parseTeamIdFromSearch(searchParams.get("teamId"));

  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamHud, setTeamHud] = useState<TeamHudSnapshot | null>(null);
  const [teamHudLoading, setTeamHudLoading] = useState(false);
  const [recommendedTeams, setRecommendedTeams] = useState<RecommendedTeamRow[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRecommendedLoading(true);
    void fetchRecommendedTeamsForSport(sport, { max: 10 })
      .then((rows) => {
        if (!cancelled) setRecommendedTeams(rows);
      })
      .catch(() => {
        if (!cancelled) setRecommendedTeams([]);
      })
      .finally(() => {
        if (!cancelled) setRecommendedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sport]);

  useEffect(() => {
    if (!teamId) {
      setTeamHud(null);
      setTeamHudLoading(false);
      return;
    }
    let cancelled = false;
    setTeamHudLoading(true);
    void Promise.all([getDoc(doc(db, "teams", teamId)), getTeamSummary(teamId)])
      .then(([snap, summary]) => {
        if (cancelled) return;
        let name: string | null = null;
        let memberCount: number | null = null;
        if (snap.exists()) {
          const d = snap.data() as Record<string, unknown>;
          const n = d.name;
          name = typeof n === "string" && n.trim() ? n.trim() : "팀";
          const mc = d.memberCount;
          if (typeof mc === "number" && Number.isFinite(mc)) memberCount = mc;
          else if (typeof mc === "string" && mc.trim()) {
            const p = parseInt(mc, 10);
            memberCount = Number.isFinite(p) ? p : null;
          }
        }
        setTeamHud({ name, memberCount, summary });
      })
      .catch(() => {
        if (!cancelled) setTeamHud(null);
      })
      .finally(() => {
        if (!cancelled) setTeamHudLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const recruitPosts = await fetchMarketPosts({
          sport,
          category: "recruit",
          status: ["active", "open"],
          limit: 30,
          orderBy: "createdAt",
          orderDirection: "desc",
        });

        const postsData: TeamPost[] = recruitPosts.map((p) => ({
          id: p.id,
          sport: (p as { sport?: string }).sport || sport,
          title: (p as { title?: string }).title || "",
          content: (p as { description?: string }).description || "",
          authorId: (p as { authorId?: string }).authorId || "",
          authorName: (p as { authorName?: string }).authorName,
          createdAt: (p as { createdAt?: unknown }).createdAt,
          images: (p as { images?: string[] }).images,
          teamId: (p as { teamId?: string }).teamId,
        }));

        setPosts(postsData);
      } catch (err: unknown) {
        console.error("[SportTeamFeed] 조회 실패:", err);
        const anyErr = err as { code?: string; message?: string };
        if (anyErr?.code === "failed-precondition" || anyErr?.message?.includes("index")) {
          console.debug("[SportTeamFeed] 인덱스 필요(무시):", anyErr?.message);
          setError(null);
        } else {
          setError("팀 활동을 불러오지 못했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, [sport]);

  const topBanner = teamId ? (
    <TeamPlayHudCard teamId={teamId} loading={teamHudLoading} hud={teamHud} />
  ) : (
    <TeamJoinOnboardingBanner sport={sport} />
  );

  const recruitSectionTitle = (
    <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-white">모집 중</h2>
  );

  if (loading) {
    return (
      <div className="px-4 py-4">
        {topBanner}
        <RecommendedTeamsSection sport={sport} teams={recommendedTeams} loading={recommendedLoading} />
        {recruitSectionTitle}
        <FeedSkeletonGrid />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-4">
        {topBanner}
        <RecommendedTeamsSection sport={sport} teams={recommendedTeams} loading={recommendedLoading} />
        {recruitSectionTitle}
        <FeedEmptyState
          title="팀 활동을 불러올 수 없습니다"
          description="잠시 후 다시 시도해주세요."
          ctaText="새로고침"
          onClick={() => window.location.reload()}
        />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="px-4 py-4">
        {topBanner}
        <RecommendedTeamsSection sport={sport} teams={recommendedTeams} loading={recommendedLoading} />
        {recruitSectionTitle}
        <FeedEmptyState
          title="팀 활동이 없습니다"
          description="우리 지역 팀을 찾아 바로 참여해보세요."
          ctaText="팀 찾기"
          onClick={() =>
            navigate(`/team/search?sport=${encodeURIComponent(sport)}`)
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {topBanner}
      <RecommendedTeamsSection sport={sport} teams={recommendedTeams} loading={recommendedLoading} />
      {recruitSectionTitle}
      {posts.map((post) => (
        <div
          key={post.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(sportMarketDetailUrl(sport, post.id))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(sportMarketDetailUrl(sport, post.id));
            }
          }}
          className="cursor-pointer rounded-lg border-2 border-green-200 bg-green-50 p-4 transition-all hover:shadow-md dark:border-green-900/50 dark:bg-green-950/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl" aria-hidden>
              👥
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{post.title}</h3>

              {post.content ? (
                <p className="mb-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{post.content}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{post.authorName || "익명"}</span>
                <span>·</span>
                <span>{getTimeAgo(toDate(post.createdAt))}</span>
                {post.participantsCount !== undefined ? (
                  <>
                    <span>·</span>
                    <span>참여 {post.participantsCount}명</span>
                  </>
                ) : null}
              </div>
            </div>

            {post.images && post.images.length > 0 ? (
              <div className="flex-shrink-0">
                <img src={post.images[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
