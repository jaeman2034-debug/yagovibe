/**
 * 🔥 축구 마켓 페이지 (/soccer/market)
 */

import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import MarketHeader from "./components/MarketHeader";
import MarketToggle from "./components/MarketToggle";
import MarketTabs from "./components/MarketTabs";
import MarketFeed from "./components/MarketFeed";
import { useMarketView } from "./hooks/useMarketView";
import { useMarketQuery } from "./hooks/useMarketQuery";
import type { MarketCategory } from "./types";

export default function SoccerMarketPage() {
  const { category = "all" } = useParams<{ category?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const viewParam = searchParams.get("view"); // "all" | null

  // 🔥 토글 상태 관리
  const { view, toggle, isExpanded } = useMarketView("soccer");

  // URL과 상태 동기화
  useEffect(() => {
    if (view === "all" && !viewParam) {
      setSearchParams({ ...searchParams, view: "all" });
    } else if (view === "sport" && viewParam === "all") {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("view");
      setSearchParams(newParams);
    }
  }, [view, viewParam, searchParams, setSearchParams]);

  // 쿼리 파라미터 - 🔥 축구 마켓은 항상 sport 필터 적용
  const queryParams = {
    contextSport: "soccer" as const,
    view: "sport" as const, // 🔥 축구 마켓은 항상 sport 필터 사용
    category: (category || "all") as MarketCategory,
    limit: 20,
  };

  const { posts, loading, error, hasMore, loadMore } = useMarketQuery(queryParams);

  // 이벤트 트래킹: 페이지 뷰
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_view", {
        contextSport: "soccer",
        view,
        category: category || "all",
      });
    }
  }, [category, view]);

  const handleCategoryChange = (newCategory: MarketCategory) => {
    console.log("🔥 [SoccerMarketPage] 카테고리 변경:", {
      from: category || "all",
      to: newCategory,
    });

    // URL 경로로 카테고리 변경 (라우트와 동기화)
    try {
      if (newCategory === "all") {
        navigate("/soccer/market", { replace: false });
        console.log("✅ [SoccerMarketPage] 전체로 이동");
      } else {
        navigate(`/soccer/market/${newCategory}`, { replace: false });
        console.log("✅ [SoccerMarketPage] 카테고리로 이동:", newCategory);
      }

      // 이벤트 트래킹
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "market_category_change", {
          contextSport: "soccer",
          view,
          fromCategory: category || "all",
          toCategory: newCategory,
        });
      }
    } catch (error) {
      console.error("❌ [SoccerMarketPage] 카테고리 변경 실패:", error);
    }
  };

  return (
    <div className="bg-gray-50 pb-20">
      <MarketHeader title="축구 마켓" />

      {/* 🔥 축구 마켓은 토글 없음 (항상 축구만 표시) */}
      {/* <MarketToggle
        checked={view === "sport"}
        onChange={toggle}
        contextSport="soccer"
      /> */}

      <MarketTabs
        active={(category || "all") as MarketCategory}
        onCategoryChange={handleCategoryChange}
      />

      <MarketFeed
        posts={posts}
        loading={loading}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        contextSport="soccer"
        showSportBadge={view === "all"}
      />
    </div>
  );
}
