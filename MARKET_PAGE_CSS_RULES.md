# YAGO VIBE Market Page CSS 규칙 문서 (Final)

## 📋 목적

이 문서는 MarketPage의 CSS 규칙을 명확히 정의하여, 레이아웃 충돌을 방지하고 일관된 UX를 유지하기 위한 것입니다.

---

## 🎯 핵심 원칙

### 원칙 1: 탐색 vs 거래 분리

```
추천 영역 (RecommendedSection) = 탐색 UX
  → 가로 스크롤, 작은 카드, grid 사용 가능

메인 리스트 (ProductList) = 거래 UX  
  → 세로 리스트, 당근형 카드, grid 절대 금지
```

### 원칙 2: grid는 거래 리스트에서 절대 금지

MarketPage의 메인 상품 리스트는 **절대 grid를 사용하지 않는다**.

```css
/* ❌ 금지 */
.market-grid { display: grid; }
.grid-cols-*
masonry
auto-fill
auto-fit

/* ✅ 허용 */
display: flex;
flex-direction: column;
```

---

## 📐 레이아웃 구조

### RecommendedSection (탐색 영역)

**역할**: 빠른 탐색, 둘러보기

**CSS 규칙**:
```css
.recommended-section {
  display: flex;
  overflow-x: auto;
  gap: 12px;
}

.recommended-section .product-card {
  flex-shrink: 0;
  width: 160px; /* 작은 카드 */
}
```

**허용**: grid, 가로 스크롤, 작은 카드

---

### ProductList (거래 영역)

**역할**: 실제 거래, 상세 정보

**CSS 규칙**:
```css
.trade-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  width: 100% !important;
}

.trade-list .product-card {
  display: flex;
  flex-direction: row;
  width: 100%;
}
```

**금지**: grid, masonry, 2열 이상 레이아웃

---

## 🔒 강제 적용 규칙

### 규칙 1: .trade-list 클래스 필수

MarketPage의 메인 상품 리스트는 **반드시 `.trade-list` 클래스를 사용**한다.

```tsx
// ✅ 올바름
<div className="trade-list">
  {products.map(...)}
</div>

// ❌ 잘못됨
<div className="market-grid">
  {products.map(...)}
</div>
```

### 규칙 2: .trade-list는 무조건 flex

`.trade-list` 클래스가 있으면 **무조건 `display: flex`**로 처리된다.

```css
/* index.css */
.trade-list,
.market-grid.trade-list,
.trade-page .trade-list {
  display: flex !important;
  flex-direction: column !important;
  grid: none !important;
}
```

### 규칙 3: grid 완전 차단

`.trade-list` 내부에서는 grid 관련 모든 속성이 무효화된다.

```css
.trade-list {
  grid-template-columns: none !important;
  grid-template-rows: none !important;
  grid: none !important;
}
```

---

## 🚫 금지 사항

### MarketPage 메인 리스트에서 금지

1. **grid 사용 금지**
   ```css
   /* ❌ 금지 */
   .market-grid { display: grid; }
   .grid-cols-2
   .grid-cols-3
   ```

2. **masonry 레이아웃 금지**
   ```css
   /* ❌ 금지 */
   columns: 2;
   column-count: 2;
   ```

3. **auto-fill/auto-fit 금지**
   ```css
   /* ❌ 금지 */
   grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
   ```

4. **2열 이상 레이아웃 금지**
   ```css
   /* ❌ 금지 */
   grid-template-columns: repeat(2, 1fr);
   ```

---

## ✅ 허용 사항

### RecommendedSection에서 허용

1. **가로 스크롤**
   ```css
   overflow-x: auto;
   ```

2. **작은 카드 크기**
   ```css
   width: 160px;
   flex-shrink: 0;
   ```

3. **grid 사용 가능** (탐색 영역이므로)

---

## 📝 CSS 파일별 역할

### `src/index.css`

**역할**: 기본 스타일 정의

**규칙**:
- `.market-grid`는 기본적으로 `display: grid` (다른 페이지용)
- **하지만** `.trade-list`가 있으면 무조건 `display: flex !important`

```css
/* 다른 페이지용 (허용) */
.market-grid:not(.trade-list) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

/* Trade 페이지용 (강제) */
.trade-list {
  display: flex !important;
  flex-direction: column !important;
  grid: none !important;
}
```

### `src/styles/mobile.css`

**역할**: 모바일 전용 override

**규칙**:
- `@media (max-width: 767px)` 내부에서만 적용
- `.trade-list`에 대한 추가 보강 규칙
- 모든 가능한 셀렉터로 강제 적용

```css
@media (max-width: 767px) {
  .trade-page .trade-list,
  main.trade-main .trade-list {
    display: flex !important;
    flex-direction: column !important;
    grid: none !important;
  }
}
```

---

## 🔧 수정 시 체크리스트

MarketPage 관련 CSS를 수정할 때:

- [ ] `.trade-list` 클래스가 있는가?
- [ ] `display: flex`가 적용되는가?
- [ ] `grid` 관련 속성이 제거되었는가?
- [ ] `!important`로 우선순위가 확보되었는가?
- [ ] 모든 환경(로컬/배포)에서 테스트했는가?

---

## 🎯 최종 한 줄 규칙

**MarketPage 메인 리스트는 `.trade-list` 클래스를 사용하고, `display: flex; flex-direction: column;`만 허용한다. grid는 절대 사용하지 않는다.**

---

## 📚 참고

- MarketPage UI 규칙 문서: `MARKET_PAGE_UI_RULES.md`
- ProductCard 스타일 가이드: `ProductCard.tsx` 내부 주석
