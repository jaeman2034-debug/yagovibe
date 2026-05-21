import { useMemo } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";
import type { Sport } from "@/types/market";
import { useMarketList } from "@/hooks/useMarketList";
import MarketPostList from "@/components/market/MarketPostList";
import {
  normalizeMarketListCategory,
  normalizeMarketListSort,
  type MarketListCategoryFilter,
  type MarketListSort,
} from "@/services/marketService";
import { QuickHero } from "@/features/market/quick/QuickHero";
import { QuickActions } from "@/features/market/quick/QuickActions";
import { QuickRecommended } from "@/features/market/quick/QuickRecommended";
import MarketListUnifiedFilter from "@/components/market/MarketListUnifiedFilter";

const CATEGORY_OPTIONS: { value: MarketListCategoryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "equipment", label: "중고" },
  { value: "recruit", label: "모집" },
  { value: "match", label: "매칭" },
];

/**
 * `/sports/:sport/market` 인덱스 — URL 쿼리(`sort`, `category`, `source`)가 리스트 상태의 단일 소스
 * `?source=quick`: QuickHero · QuickActions · QuickRecommended만. 필터·정렬·전체 리스트는 비표시(탐색은 일반 `/market` URL).
 */
export default function MarketList() {
  const { sport: sportParam } = useParams<{ sport: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const sport = useMemo(() => normalizeSportId(sportParam) ?? "soccer", [sportParam]);
  const sortParam = searchParams.get("sort");
  const categoryParam = searchParams.get("category");
  const source = searchParams.get("source") ?? "default";
  const isQuick = source === "quick";

  const { items, loading, loadingMore, error, hasMore, loadMore, indexUnavailable } =
    useMarketList(sport, sortParam, categoryParam, source);

  const setSort = (next: MarketListSort) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (next === "latest") {
          n.delete("sort");
        } else {
          n.set("sort", next);
        }
        return n;
      },
      { replace: true }
    );
  };

  const setCategory = (next: MarketListCategoryFilter) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (next === "all") {
          n.delete("category");
        } else {
          n.set("category", next);
        }
        return n;
      },
      { replace: true }
    );
  };

  const safeActive = normalizeMarketListSort(sortParam);
  const categoryActive = normalizeMarketListCategory(categoryParam);

  const sportQuerySuffix = useMemo(() => {
    const s = searchParams.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  const goSportMarket = (sportId: string) => {
    navigate(`/sports/${encodeURIComponent(sportId)}/market${sportQuerySuffix}`, { replace: true });
  };

  return (
    <div className="min-h-[50vh] bg-gray-50 pb-24">
      {isQuick ? (
        <>
          <QuickHero />
          <QuickActions
            onNearMe={() => navigate("/market/map")}
            onCreateListing={() =>
              navigate(`/sports/${encodeURIComponent(sport)}/market/create`)
            }
          />
          <QuickRecommended sport={sport as Sport} allPosts={items} listLoading={loading} />
        </>
      ) : null}

      {isQuick && error ? (
        <div className="border-b border-red-100 bg-red-50/90 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!isQuick ? (
        <div className="sticky top-12 z-10 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-1">
            <MarketListUnifiedFilter
              sport={sport}
              onSportChange={goSportMarket}
              category={categoryActive}
              onCategoryChange={setCategory}
              sort={safeActive}
              onSortChange={setSort}
            />
            {source !== "default" && source !== "quick" ? (
              <span className="text-[11px] text-gray-400">진입: {source}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div
          className={`mx-auto w-full max-w-none px-4 text-center ${isQuick ? "py-8" : "py-12"}`}
        >
          {indexUnavailable ? (
            <>
              <p className="font-medium text-gray-800">목록을 불러오는 데 필요한 인덱스가 아직 준비 중이에요</p>
              <p className="mt-2 text-sm text-gray-600">
                Firebase Console에서 <code className="rounded bg-gray-100 px-1">marketPosts</code> 복합 인덱스를
                배포한 뒤 다시 시도해 주세요.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-700">
                {categoryActive === "all"
                  ? "아직 등록된 거래가 없어요"
                  : `이 종목의 ${CATEGORY_OPTIONS.find((c) => c.value === categoryActive)?.label ?? ""} 글이 없어요`}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {categoryActive === "all"
                  ? "첫 글을 올리면 같은 종목 회원들에게 바로 보여요."
                  : "다른 유형을 선택하거나 글을 등록해 보세요."}
              </p>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={() => navigate(`/sports/${encodeURIComponent(sport)}/market/create`)}
            >
              거래 등록하기
            </button>
            <Link
              to={`/sports/${encodeURIComponent(sport)}?tab=activity`}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              활동 보러가기
            </Link>
          </div>
        </div>
      ) : (
        <>
          {!isQuick ? (
            <MarketPostList
              posts={items}
              loading={loading}
              loadingMore={loadingMore}
              error={error ? new Error(error) : null}
              hasMore={hasMore}
              onLoadMore={loadMore}
              contextSport={sport as Sport}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
