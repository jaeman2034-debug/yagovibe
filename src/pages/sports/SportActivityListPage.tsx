import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import ActivityCard from "@/features/activity/ActivityCard";
import { sportHubHref } from "@/utils/sportHubHref";

/**
 * 종목별 공개 활동 피드 — `activities` 단일 소스 + 페이지네이션
 * URL: `/sports/:sport/activity`
 */
export default function SportActivityListPage() {
  const { sport: sportParam } = useParams<{ sport: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sport = useMemo(() => normalizeSportId(sportParam) ?? "soccer", [sportParam]);
  const focusId = searchParams.get("focus")?.trim() ?? "";

  const { items, loading, loadingMore, error, hasMore, loadMore, indexUnavailable } =
    useActivityFeed({ sport, visibility: "public", pageSize: 20 });

  const hubBack = sportHubHref("activity", sport);

  useEffect(() => {
    if (!focusId || loading) return;
    const el = document.getElementById(`activity-card-${focusId}`);
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
  }, [focusId, loading, items]);

  return (
    <div className="min-h-[50vh] bg-gray-50 pb-28">
      <div className="sticky top-[4.5rem] z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            ← 뒤로
          </button>
          <Link to={hubBack} className="text-sm text-blue-600 hover:underline">
            허브 활동 탭
          </Link>
        </div>
        <h1 className="mx-auto mt-2 max-w-4xl text-lg font-bold text-gray-900">활동 피드</h1>
        <p className="mx-auto mt-1 max-w-4xl text-xs text-gray-500">
          <span className="font-medium text-gray-600">{sport}</span> · 중고·모집·매칭 등록이 활동으로 쌓입니다.
          카드를 누르면 마켓 상세로 이동합니다.
        </p>
      </div>

      <div className="w-full max-w-none px-3 py-4 md:mx-auto md:max-w-4xl">
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-500">불러오는 중…</p>
        ) : error ? (
          <p className="py-12 text-center text-sm text-red-600">{error}</p>
        ) : indexUnavailable ? (
          <div className="py-12 text-center text-sm text-gray-700">
            <p className="font-medium">인덱스가 필요합니다</p>
            <p className="mt-2 text-gray-600">
              Firebase Console에서 <code className="rounded bg-gray-100 px-1">activities</code> 복합 인덱스
              (visibility + sport + createdAt 등)를 배포한 뒤 다시 시도해 주세요.
            </p>
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">아직 공개 활동이 없어요.</p>
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
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loadingMore ? "불러오는 중…" : "더 보기"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
