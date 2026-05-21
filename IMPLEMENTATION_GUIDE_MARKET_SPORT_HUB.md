# 🚀 YAGO VIBE 종목 허브 + 마켓 구현 가이드

## 📁 파일/폴더 트리 구조

```
src/
├── pages/
│   ├── market/
│   │   ├── MarketPage.tsx              # 통합 마켓 (/market)
│   │   └── MarketCategoryPage.tsx      # 통합 마켓 카테고리 (/market/:category)
│   │
│   └── sports/
│       ├── [sport]/
│       │   ├── SportHubPage.tsx       # 종목 허브 (/soccer/home)
│       │   ├── market/
│       │   │   ├── SportMarketPage.tsx      # 종목 마켓 (/soccer/market)
│       │   │   └── SportMarketCategoryPage.tsx  # 종목 마켓 카테고리 (/soccer/market/:category)
│       │   ├── teams/
│       │   │   └── SportTeamsPage.tsx       # 팀 찾기 (/soccer/teams)
│       │   ├── grounds/
│       │   │   └── SportGroundsPage.tsx     # 구장 찾기 (/soccer/grounds)
│       │   └── my-team/
│       │       └── SportMyTeamPage.tsx      # 내 팀 (/soccer/my-team)
│       │
│       └── SportLayout.tsx             # 종목별 공통 레이아웃
│
├── components/
│   ├── market/
│   │   ├── MarketHeader.tsx            # 마켓 헤더 (타이틀 + 토글)
│   │   ├── MarketCategoryTabs.tsx      # 카테고리 탭
│   │   ├── MarketFilters.tsx            # 필터 바 (sport/지역/가격/날짜)
│   │   ├── MarketPostCard.tsx          # 마켓 게시글 카드
│   │   ├── MarketPostList.tsx          # 마켓 게시글 리스트
│   │   └── MarketFAB.tsx               # 글쓰기 FAB
│   │
│   └── sports/
│       ├── SportHubHeader.tsx           # 종목 허브 헤더
│       ├── SportHubBanner.tsx           # 종목별 배너 (대회/일정)
│       └── SportHubGrid.tsx             # 기능 그리드 (마켓/팀/구장/내팀)
│
├── hooks/
│   ├── useMarketFilters.ts             # 마켓 필터 상태 관리
│   ├── useMarketPosts.ts               # 마켓 게시글 데이터 페칭
│   └── useSportToggle.ts                # 종목 토글 상태 (localStorage)
│
├── utils/
│   ├── marketFilters.ts                # 마켓 필터 로직
│   ├── sportUtils.ts                   # 종목 관련 유틸
│   └── marketQueries.ts                # Firestore 쿼리 빌더
│
├── types/
│   ├── market.ts                       # 마켓 타입 정의
│   └── sport.ts                        # 종목 타입 정의
│
└── router/
    └── AppRouter.tsx                   # 메인 라우터 (업데이트)
```

---

## 🛣️ 라우터 코드 스켈레톤

### `src/router/AppRouter.tsx`

```typescript
import { Routes, Route } from "react-router-dom";
import SportLayout from "@/pages/sports/SportLayout";

// 통합 마켓
import MarketPage from "@/pages/market/MarketPage";
import MarketCategoryPage from "@/pages/market/MarketCategoryPage";

// 종목별 페이지
import SportHubPage from "@/pages/sports/[sport]/SportHubPage";
import SportMarketPage from "@/pages/sports/[sport]/market/SportMarketPage";
import SportMarketCategoryPage from "@/pages/sports/[sport]/market/SportMarketCategoryPage";
import SportTeamsPage from "@/pages/sports/[sport]/teams/SportTeamsPage";
import SportGroundsPage from "@/pages/sports/[sport]/grounds/SportGroundsPage";
import SportMyTeamPage from "@/pages/sports/[sport]/my-team/SportMyTeamPage";

export default function AppRouter() {
  return (
    <Routes>
      {/* 통합 마켓 */}
      <Route path="/market" element={<MarketPage />} />
      <Route path="/market/:category" element={<MarketCategoryPage />} />

      {/* 종목별 라우트 (SportLayout으로 감싸기) */}
      <Route path="/:sport" element={<SportLayout />}>
        <Route path="home" element={<SportHubPage />} />
        <Route path="market" element={<SportMarketPage />} />
        <Route path="market/:category" element={<SportMarketCategoryPage />} />
        <Route path="teams" element={<SportTeamsPage />} />
        <Route path="grounds" element={<SportGroundsPage />} />
        <Route path="my-team" element={<SportMyTeamPage />} />
      </Route>

      {/* 기존 라우트들... */}
    </Routes>
  );
}
```

---

## 📦 타입 정의

### `src/types/market.ts`

```typescript
export type Sport = "soccer" | "basketball" | "running" | "baseball" | "tennis" | "all";

export type MarketCategory = 
  | "all" 
  | "used"      // 중고
  | "recruit"   // 모집
  | "matching"  // 매칭
  | "lesson"    // 레슨
  | "ground"    // 구장양도
  | "ticket";   // 티켓

export type PostStatus = "open" | "reserved" | "done";

export interface MarketPost {
  id: string;
  sport: Sport;
  category: MarketCategory;
  title: string;
  description?: string;
  price?: number;
  location?: string;
  images: string[];
  status: PostStatus;
  authorId: string;
  authorName?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any;
  viewCount?: number;
  likeCount?: number;
}

export interface MarketFilters {
  sport: Sport;
  category: MarketCategory;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: Date;
  dateTo?: Date;
}
```

### `src/types/sport.ts`

```typescript
export type SportType = "soccer" | "basketball" | "running" | "baseball" | "tennis";

export interface SportConfig {
  id: SportType;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  categories: string[];
}
```

---

## 🎨 MarketPage 컴포넌트 구조

### `src/pages/market/MarketPage.tsx`

```typescript
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import MarketHeader from "@/components/market/MarketHeader";
import MarketCategoryTabs from "@/components/market/MarketCategoryTabs";
import MarketFilters from "@/components/market/MarketFilters";
import MarketPostList from "@/components/market/MarketPostList";
import MarketFAB from "@/components/market/MarketFAB";
import { useMarketPosts } from "@/hooks/useMarketPosts";
import { useMarketFilters } from "@/hooks/useMarketFilters";
import type { MarketCategory, Sport } from "@/types/market";

export default function MarketPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = (searchParams.get("category") || "all") as MarketCategory;
  
  const { filters, updateFilter } = useMarketFilters({
    sport: (searchParams.get("sport") || "all") as Sport,
    category,
  });

  const { posts, loading, error } = useMarketPosts(filters);

  const handleCategoryChange = (newCategory: MarketCategory) => {
    setSearchParams({ ...searchParams, category: newCategory });
    updateFilter("category", newCategory);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MarketHeader 
        title="마켓" 
        showSportToggle={false} // 통합 마켓은 토글 없음
      />
      
      <MarketCategoryTabs 
        currentCategory={category}
        onCategoryChange={handleCategoryChange}
      />

      <MarketFilters 
        filters={filters}
        onFilterChange={updateFilter}
      />

      <MarketPostList 
        posts={posts}
        loading={loading}
        error={error}
      />

      <MarketFAB />
    </div>
  );
}
```

### `src/pages/sports/[sport]/market/SportMarketPage.tsx`

```typescript
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import MarketHeader from "@/components/market/MarketHeader";
import MarketCategoryTabs from "@/components/market/MarketCategoryTabs";
import MarketFilters from "@/components/market/MarketFilters";
import MarketPostList from "@/components/market/MarketPostList";
import MarketFAB from "@/components/market/MarketFAB";
import { useMarketPosts } from "@/hooks/useMarketPosts";
import { useMarketFilters } from "@/hooks/useMarketFilters";
import { useSportToggle } from "@/hooks/useSportToggle";
import type { MarketCategory, Sport } from "@/types/market";

export default function SportMarketPage() {
  const { sport } = useParams<{ sport: Sport }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = (searchParams.get("category") || "all") as MarketCategory;
  const viewParam = searchParams.get("view"); // "all" | null

  // 🔥 핵심: 토글 상태 관리
  const { 
    filterSport, 
    toggleSportFilter, 
    isExpanded 
  } = useSportToggle(sport!, viewParam === "all");

  const { filters, updateFilter } = useMarketFilters({
    sport: filterSport,
    category,
  });

  const { posts, loading, error } = useMarketPosts(filters);

  const handleCategoryChange = (newCategory: MarketCategory) => {
    setSearchParams({ ...searchParams, category: newCategory });
    updateFilter("category", newCategory);
  };

  const handleToggle = (expanded: boolean) => {
    toggleSportFilter(expanded);
    // URL 쿼리 업데이트 (URL은 /soccer/market 유지)
    if (expanded) {
      setSearchParams({ ...searchParams, view: "all" });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("view");
      setSearchParams(newParams);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MarketHeader 
        title={`${sport} 마켓`}
        showSportToggle={true}
        contextSport={sport!}
        filterSport={filterSport}
        isExpanded={isExpanded}
        onToggle={handleToggle}
      />
      
      <MarketCategoryTabs 
        currentCategory={category}
        onCategoryChange={handleCategoryChange}
      />

      <MarketFilters 
        filters={filters}
        onFilterChange={updateFilter}
      />

      <MarketPostList 
        posts={posts}
        loading={loading}
        error={error}
      />

      <MarketFAB />
    </div>
  );
}
```

---

## 🎯 핵심 컴포넌트 구현

### `src/components/market/MarketHeader.tsx`

```typescript
import { Sport } from "@/types/market";

interface MarketHeaderProps {
  title: string;
  showSportToggle?: boolean;
  contextSport?: Sport;
  filterSport?: Sport;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export default function MarketHeader({
  title,
  showSportToggle = false,
  contextSport,
  filterSport,
  isExpanded = false,
  onToggle,
}: MarketHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        
        {showSportToggle && contextSport && (
          <button
            onClick={() => onToggle?.(!isExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <span className={isExpanded ? "text-gray-500" : "text-blue-600"}>
              {isExpanded ? "전체 보기" : `${contextSport}만 보기`}
            </span>
            <span className={isExpanded ? "text-blue-600" : "text-gray-400"}>
              {isExpanded ? "✓" : "○"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
```

### `src/hooks/useSportToggle.ts`

```typescript
import { useState, useEffect } from "react";
import type { Sport } from "@/types/market";

const STORAGE_KEY = "yago_sport_toggle_state";

export function useSportToggle(
  contextSport: Sport,
  initialExpanded: boolean = false
) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // localStorage에서 복원
    const saved = localStorage.getItem(`${STORAGE_KEY}_${contextSport}`);
    if (saved !== null) {
      return saved === "true";
    }
    return initialExpanded;
  });

  const filterSport: Sport = isExpanded ? "all" : contextSport;

  const toggleSportFilter = (expanded: boolean) => {
    setIsExpanded(expanded);
    // localStorage에 저장
    localStorage.setItem(`${STORAGE_KEY}_${contextSport}`, String(expanded));
  };

  return {
    filterSport,
    isExpanded,
    toggleSportFilter,
  };
}
```

### `src/hooks/useMarketPosts.ts`

```typescript
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost, MarketFilters } from "@/types/market";

export function useMarketPosts(filters: MarketFilters) {
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        let q = query(collection(db, "marketPosts"), orderBy("createdAt", "desc"));

        // Sport 필터
        if (filters.sport !== "all") {
          q = query(q, where("sport", "==", filters.sport));
        }

        // Category 필터
        if (filters.category !== "all") {
          q = query(q, where("category", "==", filters.category));
        }

        // Status 필터 (기본: open만)
        q = query(q, where("status", "==", "open"));

        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as MarketPost[];

        setPosts(postsData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [filters]);

  return { posts, loading, error };
}
```

---

## ✅ 구현 체크리스트

### Phase 1: 라우팅 골격
- [ ] `AppRouter.tsx` 업데이트 (통합 마켓 + 종목별 라우트)
- [ ] `SportLayout.tsx` 생성 (종목별 공통 레이아웃)
- [ ] 타입 정의 (`market.ts`, `sport.ts`)

### Phase 2: 통합 마켓 MVP
- [ ] `MarketPage.tsx` 구현
- [ ] `MarketCategoryPage.tsx` 구현
- [ ] `MarketHeader.tsx` 구현
- [ ] `MarketCategoryTabs.tsx` 구현
- [ ] `MarketPostList.tsx` 구현
- [ ] `MarketPostCard.tsx` 구현
- [ ] `useMarketPosts.ts` 구현

### Phase 3: 종목 마켓 (축구 기준)
- [ ] `SportMarketPage.tsx` 구현
- [ ] `SportMarketCategoryPage.tsx` 구현
- [ ] `useSportToggle.ts` 구현 (localStorage 연동)
- [ ] `MarketHeader`에 토글 기능 추가

### Phase 4: 종목 허브
- [ ] `SportHubPage.tsx` 구현
- [ ] `SportHubGrid.tsx` 구현
- [ ] `SportHubBanner.tsx` 구현

### Phase 5: Firestore 설정
- [ ] `marketPosts` 컬렉션 생성
- [ ] Firestore 인덱스 설정 (sport, category, status)
- [ ] 보안 규칙 설정

### Phase 6: 이벤트 트래킹
- [ ] 허브 이벤트 트래킹 추가
- [ ] 마켓 이벤트 트래킹 추가

---

## 🔥 다음 단계

이 가이드를 바탕으로:
1. 라우팅부터 시작
2. 통합 마켓 MVP 구현
3. 축구 마켓 구현 (토글 포함)
4. 나머지 종목은 템플릿 복제

준비되면 알려주세요! 🚀
