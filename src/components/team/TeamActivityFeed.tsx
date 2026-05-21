import { useEffect } from "react";
import ActivityCard from "@/features/activity/ActivityCard";
import { useTeamActivityFeed } from "@/hooks/useTeamActivityFeed";
import TeamPostInput from "@/components/team/TeamPostInput";

interface TeamActivityFeedProps {
  teamId: string;
  /** 팀 문서 `sportType` / `sport` 등 — activities.sport 저장용 */
  sport?: string;
  /** 알림 등에서 `?focus=` 로 전달된 activity 문서 id */
  focusActivityId?: string;
}

/**
 * 팀 페이지 탭 — 팀원 전용 활동 (`activities`, visibility=team)
 */
export default function TeamActivityFeed({
  teamId,
  sport = "soccer",
  focusActivityId = "",
}: TeamActivityFeedProps) {
  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    indexUnavailable,
    refetch,
  } = useTeamActivityFeed(teamId, 15);

  const focus = focusActivityId?.trim() ?? "";

  useEffect(() => {
    if (!focus || loading) return;
    const el = document.getElementById(`activity-card-${focus}`);
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
    });
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
    }, 2200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [focus, loading, items]);

  if (!teamId?.trim()) {
    return <p className="py-8 text-center text-sm text-gray-500">팀 정보가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <TeamPostInput teamId={teamId} sport={sport} onPosted={refetch} />

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-slate-800 px-2 py-0.5 font-medium text-white">팀 전용</span>
        <span>팀원에게만 보이는 활동입니다.</span>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-gray-500">활동을 불러오는 중…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-600">{error}</p>
      ) : indexUnavailable ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          팀 활동 목록에 필요한 Firestore 인덱스가 아직 없을 수 있습니다. 콘솔에서{" "}
          <code className="rounded bg-white px-1">teamId + visibility + createdAt</code> 복합 인덱스를
          확인해 주세요.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center">
          <p className="text-sm font-medium text-gray-700">아직 팀 활동이 없어요</p>
          <p className="mt-1 text-xs text-gray-500">
            위에서 글을 남기거나, 공지·일정이 등록되면 팀원에게만 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <ActivityCard
              key={row.id}
              item={{
                id: row.id,
                type: row.type,
                title: row.title,
                summary: row.summary,
                refId: row.refId,
                refType: row.refType,
                sourceId: row.refId,
                sourceType: row.refType,
                sport: row.sport,
                category: row.category,
                thumbnailUrl: row.thumbnailUrl,
                createdAt: row.createdAt,
                createdAtMillis: row.createdAtMillis,
                authorId: row.authorId,
                authorName: row.authorName,
              }}
            />
          ))}
          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? "불러오는 중…" : "더 보기"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
