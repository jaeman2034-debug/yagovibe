# Trade Page JSX 완성 세트 (붙여넣기용)

## 📋 파일별 완성 코드

---

## 1️⃣ `src/pages/market/MarketPage.tsx` (Trade 루트 스코프)

```tsx
// src/pages/market/MarketPage.tsx

import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "./ProductCard";
import { getDistanceKm } from "@/utils/geo";
import type { LatLng } from "@/utils/geo";
import type { MarketProduct } from "@/types/market";
import { parseMarketProduct } from "@/types/market";
import type { MarketSortMode } from "@/types/sort";
import { getSmartScore } from "@/utils/smartScore";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getAddressFromLatLng } from "@/utils/getAddressFromLatLng";
import { formatDistance } from "@/utils/formatDistance";
import { getDongFromLatLng } from "@/utils/getDongFromLatLng";
import { useAuth } from "@/context/AuthProvider";
import RecommendedSection from "@/components/market/RecommendedSection";
import { useRecommendedProducts } from "@/hooks/useRecommendedProducts";
import { useOutletContext } from "react-router-dom";
import OptimizedProductMap from "@/components/market/OptimizedProductMap";

// ... (기존 정렬 함수 등은 그대로 유지) ...

export default function MarketPage() {
  // ... (기존 상태 및 로직은 그대로 유지) ...

  return (
    <div className="trade-page w-full">
      {/* ✅ 1. Hero 영역: 이 스포츠에서 인기 (가로 스크롤) */}
      <RecommendedSection
        products={recommendedProducts}
        title="🔥 이 스포츠에서 인기"
        isLoading={recommendedSectionLoading}
      />

      {/* ✅ 2. 검색바 + AI 추천어 */}
      {/* ... (기존 검색바 코드) ... */}

      {/* ✅ 3. 뷰 모드 토글 (리스트 / 지도) */}
      {/* ... (기존 토글 코드) ... */}

      {/* ✅ 4. 메인 상품 리스트 (반응형: 모바일 1열 / 태블릿 3열 / PC auto-fit) */}
      {loading ? (
        <div className="mt-8 flex justify-center text-sm text-slate-500">
          상품을 불러오는 중입니다...
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-slate-500">
          <span>등록된 상품이 없습니다.</span>
          <span>오른쪽 아래의 버튼으로 처음 상품을 등록해 보세요.</span>
        </div>
      ) : viewMode === "map" ? (
        // 지도 뷰
        <div className="mt-4">
          {/* ... (기존 지도 코드) ... */}
        </div>
      ) : (
        // ✅ 메인 상품 리스트 (당근형 리스트 레이아웃)
        <section aria-label="상품 리스트" className="mt-2">
          <div className="market-grid trade-list">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                distanceKm={distanceById[product.id]}
                sortMode={sortMode}
              />
            ))}
          </div>
        </section>
      )}

      {/* ✅ 상품 등록 FAB */}
      <button
        type="button"
        className="fixed right-4 sm:right-6 z-50 px-4 sm:px-6 py-3 rounded-full bg-blue-500 text-white font-semibold shadow-lg active:scale-95 transition hover:bg-blue-600"
        style={{
          bottom: `calc(var(--bottom-h, 64px) + 16px + env(safe-area-inset-bottom, 0px))`
        }}
        onClick={() => navigate("/trade/create")}
        aria-label="상품 등록"
      >
        + 상품 등록
      </button>
    </div>
  );
}
```

**핵심 포인트:**
- 루트에 `className="trade-page"` 필수
- 메인 리스트는 `className="market-grid trade-list"` 사용
- RecommendedSection은 별도 컴포넌트로 분리

---

## 2️⃣ `src/pages/market/ProductCard.tsx` (당근형 카드 완전체)

```tsx
// src/pages/market/ProductCard.tsx

import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketProduct } from "@/types/market";
import { formatDistance } from "@/utils/formatDistance";
import { getSmartScore } from "@/utils/smartScore";
import { getRecommendReasons } from "@/utils/recommendationReasons";
import { isInvalidDistance } from "@/utils/distanceValidation";
import { logActivity } from "@/lib/activityLog";

type Props = {
  product: MarketProduct;
  distanceKm?: number;
  sortMode?: "latest" | "nearest" | "smart";
  className?: string; // 추천 영역에서 recommended-card 추가 가능
};

const ProductCard = memo(function ProductCard({ 
  product, 
  distanceKm, 
  sortMode,
  className = "" 
}: Props) {
  const navigate = useNavigate();

  const {
    id,
    name,
    price,
    imageUrl,
    images,
    gallery,
    category,
    location: productLocation,
    region,
    address,
    addressShort,
    latitude,
    longitude,
  } = product;

  const allImages = [...(images || []), ...(gallery || [])];
  const thumbnail =
    (allImages.length > 0 && typeof allImages[0] === "string")
      ? allImages[0]
      : (typeof imageUrl === "string" && imageUrl.length > 0)
      ? imageUrl
      : "/placeholder-image.png";

  const prettyPrice =
    typeof price === "number"
      ? price.toLocaleString("ko-KR") + "원"
      : "가격 미정";

  // GPS 좌표 유효성 검증
  const hasValidCoords = 
    latitude != null && 
    longitude != null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude)) &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180;

  // 추천 이유 계산
  const recommendationReasons = useMemo(() => {
    if (sortMode !== "smart") return [];
    const smartScore = getSmartScore(product, distanceKm ?? null);
    if (smartScore < 0.7) return [];
    return getRecommendReasons(product, distanceKm ?? null);
  }, [sortMode, product, distanceKm]);

  const isRecommended = sortMode === "smart" && recommendationReasons.length > 0;

  // 카드 클릭 핸들러
  const handleClick = (e: React.MouseEvent) => {
    if (!id) {
      console.error("❌ ProductCard: product.id가 없습니다!", product);
      return;
    }
    
    const productType = (product as any).type || "trade";
    let targetPath = "";
    
    if (productType === "trade") {
      targetPath = `/trade/${id}`;
    } else if (productType === "team") {
      targetPath = `/activity/team/${id}`;
    } else if (productType === "event") {
      targetPath = `/activity/event/${id}`;
    } else if (productType === "place") {
      targetPath = `/activity/place/${id}`;
    } else {
      targetPath = `/trade/${id}`;
    }
    
    logActivity({
      event: "MARKET_ITEM_CLICK",
      location: `/app/market/${id}`,
      meta: { 
        productId: id,
        category: category || "unknown",
        price: typeof price === "number" ? price : null,
        name: name,
      },
    });
    
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    
    navigate(targetPath);
  };

  return (
    <article
      onClick={handleClick}
      className={`trade-card ${className}`.trim()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick(e as any);
        }
      }}
    >
      {/* 썸네일 (당근마켓 스타일: 88x88px 정사각형) */}
      <div className="w-[88px] h-[88px] overflow-hidden rounded-xl bg-gray-100 flex-shrink-0">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            이미지 없음
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="trade-card-body product-info">
        {/* 추천 뱃지 (메인 리스트에서만 표시) */}
        {isRecommended && !className.includes("recommended-card") && (
          <div className="inline-flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white mb-1">
            추천
          </div>
        )}
        
        {/* 제목 */}
        <h2 className="product-title trade-title">
          {name}
        </h2>

        {/* 가격 */}
        <p className="product-price trade-price">
          {prettyPrice}
        </p>

        {/* 위치 및 거리 정보 */}
        <div className="product-location-group trade-meta">
          {(addressShort || address || product.dong || productLocation || region) ? (
            <div className="flex items-center gap-1 text-gray-500">
              <span className="location-text text-[12px]">
                {addressShort || product.dong || "위치 정보"}
              </span>
              {/* 거리 표시 (GPS 좌표 기준) */}
              {typeof distanceKm === "number" && 
               hasValidCoords && 
               !isInvalidDistance(distanceKm) && (
                <>
                  <span className="text-[12px]">·</span>
                  <span className="distance-text text-[12px]">
                    {formatDistance(distanceKm)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-[12px]">
              위치 정보 없음
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

export default ProductCard;
```

**핵심 포인트:**
- 기본 클래스: `trade-card`
- `className` prop으로 `recommended-card` 추가 가능
- 추천 뱃지는 메인 리스트에서만 표시 (추천 영역에서는 숨김)
- 키보드 접근성 지원 (Enter/Space)

---

## 3️⃣ `src/components/market/RecommendedSection.tsx` (가로 스크롤 고정)

```tsx
// src/components/market/RecommendedSection.tsx
// 🔥 마켓 상단 추천 섹션 (가로 스크롤, 작은 카드)
// 규칙: 탐색 UX = 가로 스크롤, 작은 카드, 최대 6~10개

import { useNavigate } from "react-router-dom";
import type { MarketProduct } from "@/types/market";
import ProductCard from "../../pages/market/ProductCard";

interface RecommendedSectionProps {
  products: MarketProduct[];
  title?: string;
  isLoading?: boolean;
}

export default function RecommendedSection({
  products,
  title = "🔥 이 지역에서 인기",
  isLoading = false,
}: RecommendedSectionProps) {
  const navigate = useNavigate();

  // 🔥 추천 0개면 섹션 숨김
  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section aria-label="추천 상품" className="mb-4 px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {products.length > 6 && (
          <button
            onClick={() => {
              // TODO: 추천 전체 보기 페이지로 이동 (선택)
            }}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            더보기
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="recommended-list flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="recommended-card flex-shrink-0 w-40 h-48 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : (
        // ✅ 규칙: 가로 스크롤, 작은 카드 (탐색 UX)
        <div className="recommended-list flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {products.slice(0, 6).map((product) => {
            // 🔥 타입별 라우팅 분기
            const handleProductClick = () => {
              const productType = (product as any).type || "trade";
              if (productType === "trade") {
                navigate(`/trade/${product.id}`);
              } else if (productType === "team") {
                navigate(`/activity/team/${product.id}`);
              } else if (productType === "event") {
                navigate(`/activity/event/${product.id}`);
              } else if (productType === "place") {
                navigate(`/activity/place/${product.id}`);
              } else {
                navigate(`/trade/${product.id}`);
              }
            };

            return (
              <div
                key={product.id}
                className="recommended-card flex-shrink-0 w-40 cursor-pointer"
                onClick={handleProductClick}
              >
                <ProductCard
                  product={product}
                  distanceKm={undefined}
                  sortMode="latest"
                  className="recommended-card"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

**핵심 포인트:**
- 컨테이너: `className="recommended-list"` (가로 스크롤)
- 각 카드: `className="recommended-card"` (작은 크기, flex-shrink-0)
- ProductCard에 `className="recommended-card"` 전달

---

## 4️⃣ CSS 확인 (`src/styles/trade.css`)

이미 생성된 `trade.css`가 다음 규칙을 포함하는지 확인:

```css
/* 추천 영역: 가로 스크롤 고정 */
.trade-page .recommended-list {
  display: flex !important;
  overflow-x: auto !important;
  /* grid 절대 금지 */
  grid: none !important;
}

/* 메인 리스트: 모바일 1열 */
.trade-page .market-grid.trade-list {
  display: flex !important;
  flex-direction: column !important;
}

/* 태블릿: 3열 그리드 */
@media (min-width: 768px) and (max-width: 1023px) {
  .trade-page .market-grid.trade-list {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

/* PC: auto-fit 그리드 */
@media (min-width: 1024px) {
  .trade-page .market-grid.trade-list {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important;
  }
}
```

---

## ✅ 체크리스트

- [ ] `MarketPage.tsx` 루트에 `className="trade-page"` 있음
- [ ] 메인 리스트에 `className="market-grid trade-list"` 있음
- [ ] `ProductCard.tsx`에 `className="trade-card"` 있음
- [ ] `RecommendedSection.tsx`에 `className="recommended-list"` 있음
- [ ] 각 추천 카드에 `className="recommended-card"` 있음
- [ ] `src/main.tsx`에 `import "./styles/trade.css"` 있음
- [ ] `src/styles/trade.css` 파일 존재 및 규칙 적용됨

---

## 🚀 다음 단계 (선택)

1. **디버깅**: "추천이 세로로 떨어져" → CSS 우선순위 확인
2. **실전 완성**: 라우팅/데이터 연결까지 포함
3. **UI 개선**: 뱃지/상태/찜 기능 추가
