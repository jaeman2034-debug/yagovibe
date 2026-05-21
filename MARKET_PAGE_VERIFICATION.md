# 🔥 마켓 페이지 검증 가이드

## 📋 현재 상태 분석

### ✅ 확인된 부분

1. **이벤트 타입 정의**
   - `MARKET_VIEW`: 마켓 조회 ✅
   - `MARKET_ITEM_CLICK`: 마켓 상품 클릭 ✅
   - `src/lib/activityLog.ts`에 정의됨

2. **마켓 페이지 구조**
   - `src/pages/market/MarketPage.tsx`: 메인 페이지
   - `src/pages/market/ProductCard.tsx`: 상품 카드
   - `src/pages/market/ProductDetail.tsx`: 상품 상세

---

## ❓ 확인 필요 사항

### 1. MARKET_VIEW 로그 트리거

**확인 위치:** `MarketPage.tsx`

**예상 구현:**
```typescript
useEffect(() => {
  logActivity({
    event: "MARKET_VIEW",
    location: "/app/market",
    meta: { viewMode: "list" | "map" },
  });
}, []);
```

**현재 상태:** ❓ 확인 필요

---

### 2. MARKET_ITEM_CLICK 로그 트리거

**확인 위치:** `ProductCard.tsx` 또는 `ProductDetail.tsx`

**예상 구현:**
```typescript
const handleProductClick = (product: MarketProduct) => {
  logActivity({
    event: "MARKET_ITEM_CLICK",
    location: `/app/market/${product.id}`,
    meta: { productId: product.id, category: product.category },
  });
  
  navigate(`/app/market/${product.id}`);
};
```

**현재 상태:** ❓ 확인 필요

---

## 🧪 검증 체크리스트

### 1단계: 마켓 페이지 진입

**테스트:**
1. `/app/market` 접속
2. 브라우저 콘솔 확인

**확인 사항:**
- [ ] 페이지 로드 성공
- [ ] 상품 목록 표시
- [ ] `MARKET_VIEW` 로그 전송 확인
- [ ] 관리자 대시보드에서 숫자 증가 확인

---

### 2단계: 상품 클릭

**테스트:**
1. 상품 카드 클릭
2. 상품 상세 페이지 이동
3. 브라우저 콘솔 확인

**확인 사항:**
- [ ] 상품 상세 페이지 로드
- [ ] `MARKET_ITEM_CLICK` 로그 전송 확인
- [ ] 관리자 대시보드에서 숫자 증가 확인

---

### 3단계: 지도 → 마켓 연결

**테스트:**
1. 지도 페이지에서 장소 선택
2. 마켓 관련 버튼/링크 클릭
3. 마켓 페이지 이동 확인

**확인 사항:**
- [ ] 지도에서 마켓으로 이동 가능
- [ ] 이동 시 `MARKET_VIEW` 로그 전송
- [ ] 퍼널 연결 확인

---

## 🔧 개선 필요 사항

### 1. MARKET_VIEW 로그 추가

**위치:** `src/pages/market/MarketPage.tsx`

**추가 코드:**
```typescript
import { logActivity } from "@/lib/activityLog";

useEffect(() => {
  // 마켓 페이지 진입 로그
  logActivity({
    event: "MARKET_VIEW",
    location: "/app/market",
    meta: { 
      viewMode: viewMode, // "list" | "map"
      category: selectedCategory,
    },
  });
}, [viewMode, selectedCategory]);
```

---

### 2. MARKET_ITEM_CLICK 로그 추가

**위치:** `src/pages/market/ProductCard.tsx`

**추가 코드:**
```typescript
import { logActivity } from "@/lib/activityLog";

const handleClick = () => {
  // 상품 클릭 로그
  logActivity({
    event: "MARKET_ITEM_CLICK",
    location: `/app/market/${product.id}`,
    meta: { 
      productId: product.id,
      category: product.category,
      price: product.price,
    },
  });
  
  navigate(`/app/market/${product.id}`);
};
```

---

### 3. 지도 → 마켓 연결

**위치:** `src/components/map/MapPageContainer.tsx` 또는 `PlaceDetailSheet.tsx`

**추가 코드:**
```typescript
// 장소 상세에서 마켓 버튼 추가
<button
  onClick={() => {
    logActivity({
      event: "MARKET_VIEW",
      location: "/app/market",
      meta: { source: "map", placeId: place.id },
    });
    navigate("/app/market");
  }}
>
  마켓 보기
</button>
```

---

## 📊 퍼널 연결 확인

### 현재 퍼널

```
지도 진입
→ story_impression ✅
→ story_click ✅
→ team/market 조회 ❓
→ 가입 ❓
```

### 목표 퍼널

```
지도 진입
→ story_impression ✅
→ story_click ✅
→ MARKET_VIEW ✅ (추가 필요)
→ MARKET_ITEM_CLICK ✅ (추가 필요)
→ TEAM_VIEW ✅
→ TEAM_JOIN ✅
```

---

## 🎯 다음 단계

### 즉시 확인
1. **마켓 페이지 접속** (`/app/market`)
2. **콘솔 확인**: `MARKET_VIEW` 로그 확인
3. **상품 클릭**: `MARKET_ITEM_CLICK` 로그 확인

### 개선 작업
1. **MARKET_VIEW 로그 추가** (MarketPage.tsx)
2. **MARKET_ITEM_CLICK 로그 추가** (ProductCard.tsx)
3. **지도 → 마켓 연결** (MapPageContainer.tsx)

---

## ✅ 예상 결과

### 정상 동작 시

1. **마켓 페이지 진입**
   ```
   [ACTIVITY] { event: "MARKET_VIEW", location: "/app/market", ... }
   ```

2. **상품 클릭**
   ```
   [ACTIVITY] { event: "MARKET_ITEM_CLICK", location: "/app/market/123", ... }
   ```

3. **관리자 대시보드**
   - FunnelPanel에서 `MARKET_VIEW` 숫자 증가
   - `MARKET_ITEM_CLICK` 숫자 증가
   - 퍼널 연결 확인

---

## 💡 참고

### 이벤트 로그 구조

```typescript
{
  event: "MARKET_VIEW" | "MARKET_ITEM_CLICK",
  location: string,
  meta: {
    viewMode?: "list" | "map",
    category?: string,
    productId?: string,
    price?: number,
    source?: "map" | "story" | "direct",
  },
}
```

### 관리자 대시보드 연동

- `FunnelPanel.tsx`에서 `MARKET_VIEW` 이벤트 수집
- `ActivityPanel.tsx`에서 마켓 활동 통계 표시
