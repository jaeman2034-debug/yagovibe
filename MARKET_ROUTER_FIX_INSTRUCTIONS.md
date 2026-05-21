# 🔥 YAGO SPORTS Market Router 수정 지시문

## 📋 현재 문제

### 정상 동작하는 라우터
- ✅ `/sports/:sport/market/write` → `MarketWritePage`
- ✅ `/sports/:sport/market/:postId` → `MarketPostDetailPage`

### 문제 발생
- ❌ `/sports/:sport/market` → **404 페이지 발생**
- 상세페이지에서 "농구 마켓 →" 화살표 클릭 시 `/sports/basketball/market`로 이동하는데 라우트가 없음

---

## 🔍 원인 분석

### 1. 누락된 라우트
`App.tsx`에 `/sports/:sport/market` 라우트가 **등록되지 않음**

### 2. SportMarketPage 리다이렉트 문제
`src/pages/sports/[sport]/market/SportMarketPage.tsx` 파일이 자동으로 리다이렉트하고 있음:

```typescript
// ❌ 문제 코드 (24-29줄)
useEffect(() => {
  if (sport) {
    navigate(`/sports/${sport}?tab=market`, { replace: true });
  }
}, [sport, navigate]);
```

이 코드 때문에 `/sports/:sport/market`에 접근하면 바로 리다이렉트되어 목록 페이지가 표시되지 않음.

---

## ✅ 수정 방법

### STEP 1: App.tsx에 라우트 추가

**파일**: `src/App.tsx`

**위치**: `/sports/:sport/market/write` 라우트 **위에** 추가

```tsx
{/* 🔥 종목별 마켓 목록 페이지 */}
<Route 
  path="/sports/:sport/market" 
  element={
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <SportMarketPage />
      </Suspense>
    </ProtectedRoute>
  } 
/>

{/* 🔥 종목별 마켓 글쓰기 페이지 */}
<Route 
  path="/sports/:sport/market/write" 
  element={
    <ProtectedRoute>
      <MarketWritePage />
    </ProtectedRoute>
  } 
/>

{/* 🔥 종목별 마켓 상세 페이지 */}
<Route 
  path="/sports/:sport/market/:postId" 
  element={
    <ProtectedRoute>
      <MarketPostDetailPage />
    </ProtectedRoute>
  } 
/>
```

**중요**: 라우트 순서가 중요합니다. 더 구체적인 경로(`/write`, `/:postId`)가 먼저 오면 안 됩니다.

**올바른 순서**:
1. `/sports/:sport/market` (목록)
2. `/sports/:sport/market/write` (글쓰기)
3. `/sports/:sport/market/:postId` (상세)

---

### STEP 2: SportMarketPage 리다이렉트 제거

**파일**: `src/pages/sports/[sport]/market/SportMarketPage.tsx`

**수정 전**:
```typescript
// 🔥 종목 허브로 리다이렉트
useEffect(() => {
  if (sport) {
    navigate(`/sports/${sport}?tab=market`, { replace: true });
  }
}, [sport, navigate]);
```

**수정 후**:
```typescript
// 🔥 리다이렉트 제거: /sports/:sport/market에서 직접 렌더링
// (이 useEffect 블록 전체 삭제)
```

---

## 📊 최종 Market Router 구조

### 필수 3개 라우트 (세트)

```tsx
// 1. 목록 페이지
<Route path="/sports/:sport/market" element={<SportMarketPage />} />

// 2. 글쓰기 페이지
<Route path="/sports/:sport/market/write" element={<MarketWritePage />} />

// 3. 상세 페이지
<Route path="/sports/:sport/market/:postId" element={<MarketPostDetailPage />} />
```

---

## 🔄 정상 동작 흐름

```
[상품 등록 버튼]
    ↓
/sports/:sport/market/write
    ↓
[폼 작성 및 제출]
    ↓
Firestore: market 컬렉션 저장
    ↓
[등록 성공]
    ↓
/sports/:sport/market/:postId (상세 페이지)
    ↓
[마켓 목록 버튼 클릭]
    ↓
/sports/:sport/market (목록 페이지) ✅
```

---

## 🎯 SportMarketPage 역할

### 책임
- 종목별 마켓 목록 표시
- `sport` 파라미터로 Firestore 쿼리 필터링
- 카테고리별 필터링 (equipment, recruit, match)

### Firestore 쿼리 예시
```typescript
const q = query(
  collection(db, "market"),
  where("sport", "==", sport),
  where("status", "==", "open"),
  orderBy("createdAt", "desc")
);
```

---

## ⚠️ 추가 확인 사항

### 레거시 라우트와의 충돌

현재 프로젝트에는 다음 라우트가 동시에 존재할 수 있음:

```
/market                    → MarketPage (전체 마켓)
/sports/:sport/market      → SportMarketPage (종목별 마켓)
```

**권장 구조**:
- `/sports/:sport/market` 사용 (종목별 분리)
- `/market`는 레거시 호환용으로 유지하되, `/sports/soccer/market`로 리다이렉트

---

## 📝 수정 체크리스트

- [ ] `App.tsx`에 `/sports/:sport/market` 라우트 추가
- [ ] `SportMarketPage.tsx`에서 리다이렉트 코드 제거
- [ ] 라우트 순서 확인 (목록 → 글쓰기 → 상세)
- [ ] `/sports/basketball/market` 접근 시 목록이 표시되는지 확인
- [ ] 상세페이지에서 "마켓 목록" 버튼 클릭 시 정상 이동 확인

---

## 🚀 테스트 방법

1. **목록 페이지 접근**
   ```
   /sports/soccer/market
   /sports/basketball/market
   ```
   → 각 종목의 상품 목록이 표시되어야 함

2. **상세페이지에서 목록으로 이동**
   ```
   /sports/basketball/market/OLikrnRWCvHzAnMzgS8
   ```
   → "농구 마켓 →" 버튼 클릭
   → `/sports/basketball/market`로 이동되어야 함

3. **글쓰기 페이지 접근**
   ```
   /sports/soccer/market/write
   ```
   → 정상적으로 글쓰기 폼이 표시되어야 함

---

## 💡 참고

이 수정을 완료하면 다음 기능들도 동일한 패턴으로 정리할 수 있습니다:

- Schedule: `/sports/:sport/schedule`
- Recruit: `/sports/:sport/recruit`
- Match: `/sports/:sport/match`
- Team: `/sports/:sport/team`

**전체 Router 구조를 한 번에 정리하면 앞으로 라우터가 절대 꼬이지 않습니다.**
