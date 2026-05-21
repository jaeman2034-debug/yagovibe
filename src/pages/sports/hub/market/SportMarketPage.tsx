/**
 * 🔥 축구 마켓 페이지 (/soccer/market)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import MarketHeader from "@/components/market/MarketHeader";
import SportMarketUnifiedFilter, {
  type SportMarketSortMode,
} from "@/components/market/SportMarketUnifiedFilter";
import MarketPostList from "@/components/market/MarketPostList";
import MarketPostCard from "@/components/market/MarketPostCard";
import CategoryCTA from "@/components/market/CategoryCTA";
import EmptyCategoryBanner from "@/components/market/EmptyCategoryBanner";
import { useMarketView } from "@/hooks/useMarketView";
import { useMarketPosts } from "@/hooks/useMarketPosts";
import { useTopSellerPosts } from "@/hooks/useTopSellerPosts";
import type { Sport, MarketCategory } from "@/types/market";

export default function SportMarketPage() {
  const { sport } = useParams<{ sport: Sport }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 🔥 URL 경로에서 카테고리 자동 감지
  const pathname = location.pathname;
  let defaultCategory: MarketCategory = "all";
  
  if (pathname.includes("/recruit")) {
    defaultCategory = "recruit";
  } else if (pathname.includes("/match")) {
    defaultCategory = "match";
  } else if (pathname.includes("/market")) {
    defaultCategory = "equipment"; // market은 equipment만 표시
  }
  
  const category = (searchParams.get("category") || defaultCategory) as MarketCategory;
  const viewParam = searchParams.get("view"); // "all" | null
  const qParam = (searchParams.get("q") || "").trim();
  const sortParam = searchParams.get("sort") || "latest"; // 'latest' | 'nearest'

  // 🔥 핵심: 토글 상태 관리 (localStorage 연동)
  const { view, toggleView, isExpanded } = useMarketView(
    sport!,
    viewParam === "all" ? "all" : "sport"
  );

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

  // 쿼리 파라미터
  const queryParams = {
    contextSport: sport!,
    view,
    category,
    limit: 20,
  };

  const { posts, loading, error, hasMore, loadMore, refetch } = useMarketPosts(queryParams);
  // 🔍 안전 가드: 렌더 단계에서도 category 기준으로 한 번 더 필터 (예외 케이스 방지)
  // 📍 유저 위치 (권한 허용 시)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      () => {
        // 권한 거부 or 실패 → 거리 표시/정렬 비활성 (조용히 무시)
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
    );
  }, []);

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const displayedPosts = useMemo(() => {
    const base = Array.isArray(posts)
      ? posts.filter((p) => {
          if (!p?.category) return category === "all" ? true : false;
          if (category === "all") return p.category === "equipment";
          return p.category === category;
        })
      : [];
    const filtered = !qParam
      ? base
      : base.filter((p: any) => {
      const t = (p.title || p.name || "").toLowerCase();
      const d = (p.description || "").toLowerCase();
      const tags = Array.isArray(p.tags) ? (p.tags as string[]).join(" ").toLowerCase() : "";
      return t.includes(q) || d.includes(q) || tags.includes(q);
      });

    // 위치/거리 정규화 + 거리 계산
    const extractLatLng = (p: any): { lat: number | null; lng: number | null } => {
      const tryVals = [
        p.lat, p.latitude, p.Lat, p.Latitude,
        p.lng, p.longitude, p.Lng, p.Longitude,
      ];
      const lat =
        typeof p.lat === "number" ? p.lat
        : typeof p.latitude === "number" ? p.latitude
        : typeof p?.location?.lat === "number" ? p.location.lat
        : typeof p?.coords?.lat === "number" ? p.coords.lat
        : typeof p?.geo?.lat === "number" ? p.geo.lat
        : typeof p?.position?.lat === "number" ? p.position.lat
        : null;
      const lng =
        typeof p.lng === "number" ? p.lng
        : typeof p.longitude === "number" ? p.longitude
        : typeof p?.location?.lng === "number" ? p.location.lng
        : typeof p?.coords?.lng === "number" ? p.coords.lng
        : typeof p?.geo?.lng === "number" ? p.geo.lng
        : typeof p?.position?.lng === "number" ? p.position.lng
        : null;
      return { lat, lng };
    };
    const extractLocationName = (p: any): string | null => {
      return (
        p.location?.name ||
        p.address ||
        p.dong ||
        p.region ||
        (typeof p.location === "string" ? p.location : null) ||
        p.area ||
        null
      );
    };

    const withDistance = filtered.map((p: any) => {
      const locationName = extractLocationName(p);
      // 이미 계산된 경우 유지하되, location이 없으면 채움
      if (p.distanceMeters !== undefined) {
        return { ...p, location: p.location || locationName || p.location };
      }
      if (!userLocation) {
        return { ...p, location: p.location || locationName || p.location };
      }
      const { lat, lng } = extractLatLng(p);
      if (typeof lat === "number" && typeof lng === "number") {
        const dist = getDistance(userLocation.lat, userLocation.lng, lat, lng);
        return { ...p, distanceMeters: dist, distance: dist, location: p.location || locationName || p.location };
      }
      return { ...p, location: p.location || locationName || p.location };
    });

    // ✅ 빠른 UI 검증용: 거리 미존재 시 임시 600m 주입
    const withFallbackDistance = withDistance.map((p: any) =>
      p.distanceMeters == null ? { ...p, distanceMeters: 600, distance: 600 } : p
    );

    // 정렬
    if ((sortParam === "nearest" || sortParam === "distance") && userLocation) {
      return [...withFallbackDistance].sort((a: any, b: any) => {
        const da = a.distanceMeters;
        const db = b.distanceMeters;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }
    return withFallbackDistance;
  }, [posts, category, qParam, userLocation, sortParam]);

  // 🔥 등록 후 목록 새로고침 (location.state.refresh 확인)
  useEffect(() => {
    if (location.state?.refresh && refetch) {
      refetch();
      // state 초기화 (중복 새로고침 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);

  // 🔥 세션 플래그 기반 새로고침 (작성 후 뒤로가기로 돌아온 경우)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("market:refresh");
      if (raw) {
        const flag = JSON.parse(raw) as { sport?: string; category?: string; ts?: number };
        // 옵션: 동일 종목이거나 카테고리 상관없이 새로고침
        if (refetch) {
          refetch();
        }
        sessionStorage.removeItem("market:refresh");
      }
    } catch {
      // 무시
    }
  }, [refetch]);

  // 🔥 상위 판매자 게시글 (상단 슬롯)
  const { posts: topSellerPosts, loading: topSellerLoading } = useTopSellerPosts({
    limit: 2,
    sport: view === "sport" ? sport : undefined,
    category: category !== "all" ? category : undefined,
  });

  // 이벤트 트래킹: 페이지 뷰
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_view", {
        contextSport: sport,
        view,
        category,
      });
    }
  }, [sport, view, category]);

  const effectiveSort: SportMarketSortMode =
    sortParam === "nearest" || sortParam === "distance" ? "nearest" : "latest";

  const handleSortChange = useCallback(
    (s: SportMarketSortMode) => {
      const next = new URLSearchParams(searchParams);
      if (s === "latest") next.delete("sort");
      else next.set("sort", "nearest");
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const handleCategoryChange = (newCategory: MarketCategory) => {
    const newParams = new URLSearchParams(searchParams);
    if (newCategory === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", newCategory);
    }
    // view 파라미터 유지
    if (view === "all") {
      newParams.set("view", "all");
    }
    setSearchParams(newParams);

    // 이벤트 트래킹
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_category_change", {
        contextSport: sport,
        view,
        fromCategory: category,
        toCategory: newCategory,
      });
    }
  };

  const handleToggle = () => {
    const fromView = view;
    toggleView();
    const toView = view === "sport" ? "all" : "sport";

    // 이벤트 트래킹
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_toggle_expand", {
        contextSport: sport,
        from: fromView,
        to: toView,
      });
    }
  };

  const sportLabel: Record<string, string> = {
    soccer: "축구",
    basketball: "농구",
    running: "러닝",
    badminton: "배드민턴",
  };

  // 🔍 검색 UX (최근검색 + 추천)
  const [searchText, setSearchText] = useState(qParam);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const RECENT_KEY = `market:recent:${sport}`;
  const RECOMMENDED: string[] = ["가방", "축구화", "유니폼", "볼", "라켓"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, [RECENT_KEY]);

  const saveRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((v) => v !== t)].slice(0, 8);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  };

  const applySearch = (term: string) => {
    const next = new URLSearchParams(searchParams);
    if (term.trim()) next.set("q", term.trim());
    else next.delete("q");
    setSearchParams(next);
    saveRecent(term);
  };

  return (
    <div className="bg-gray-50 pb-16" style={{ overflow: "visible" }} data-page="sport-market">
      <MarketHeader
        title={`${sportLabel[sport!] || sport} 마켓`}
        showToggle={true}
        contextSport={sport!}
        view={view}
        onToggle={handleToggle}
      />

      {/* 🔥 상단 고정 영역: 탭 + 검색/토글 (겹침 제거, 일체형) */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="w-full max-w-5xl mx-auto">
          <SportMarketUnifiedFilter
            sportTitle={sportLabel[sport!] || sport || "마켓"}
            currentCategory={category}
            onCategoryChange={handleCategoryChange}
            sort={effectiveSort}
            onSortChange={handleSortChange}
          />
          <div className="px-4 py-3 space-y-2 relative overflow-visible md:px-6">
            {/* 검색 입력 */}
            <div className="relative overflow-visible">
              <input
                type="search"
                placeholder="상품명, 태그, 브랜드 검색..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch(searchText);
                  if (e.key === "Escape") setFocused(false);
                }}
              />
              {/* 드롭다운: 최근검색/추천 (레이아웃 분리: absolute top-full) */}
              {focused && (recent.length > 0 || RECOMMENDED.length > 0) && (
                <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-md overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                  {recent.length > 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">최근 검색</div>
                  )}
                  {recent.map((r) => (
                    <button
                      key={`r-${r}`}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onMouseDown={() => applySearch(r)}
                    >
                      {r}
                    </button>
                  ))}
                  <div className="px-3 py-2 text-xs text-gray-500 border-t">추천 검색</div>
                  {RECOMMENDED.map((w) => (
                    <button
                      key={`w-${w}`}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onMouseDown={() => applySearch(w)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* 리스트/지도 토글 - 공간 절약 SegmentedControl */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                className="flex-1 py-2 bg-white rounded-md text-sm font-medium"
              >
                리스트
              </button>
              <button
                type="button"
                className="flex-1 py-2 text-sm text-gray-500"
                onClick={() => navigate(`/sports/${sport}/market?mode=map`)}
              >
                지도
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 md:px-6">
        {/* 🔥 카테고리별 글쓰기 CTA */}
        <CategoryCTA sport={sport!} category={category} />

        {/* 🔥 빈 카테고리 배너 (로딩/에러가 아니고 3개 이하일 때만 표시) */}
        {!loading && !error && displayedPosts.length <= 3 && (
          <EmptyCategoryBanner
            sport={sport!}
            category={category}
            postCount={displayedPosts.length}
          />
        )}

        {/* 🔥 상위 판매자 게시글 (상단 슬롯) */}
        {topSellerPosts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">🔥 신뢰 판매자 상품</h3>
                <p className="text-xs text-gray-600">검증된 판매자의 안전한 거래</p>
              </div>
            </div>
            <div className="grid gap-3 grid-cols-2">
              {topSellerPosts.map((post) => (
                <MarketPostCard
                  key={post.id}
                  post={post}
                  contextSport={sport!}
                  showSportBadge={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 md:px-6">
        <MarketPostList
          posts={displayedPosts}
          loading={loading}
          error={error}
          hasMore={hasMore}
          onLoadMore={loadMore}
          contextSport={sport!}
          showSportBadge={view === "all"}
        />
      </div>
    </div>
  );
}
