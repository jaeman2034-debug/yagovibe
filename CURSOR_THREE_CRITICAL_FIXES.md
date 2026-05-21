# 🔥 Cursor 개발자 수정 지시문: 3가지 핵심 문제 수정 완료

## ✅ 수정 완료

### 변경 사항 요약

1. **market 리스트 필터**: `useMarketPosts.ts`에서 기본적으로 `equipment`만 필터링
2. **activity 타입 분리**: 이미 완료됨 (`equipment_created`, `recruit_created`, `match_created`)
3. **recruit/match 리스트 라우트**: `/sports/:sport/recruit`, `/sports/:sport/match` 라우트 추가

---

## 📋 수정 상세

### 1️⃣ market 리스트 필터 수정

**파일**: `src/hooks/useMarketPosts.ts`

**Before**:
```typescript
// category가 "all"이면 필터 없음 (모든 카테고리 표시)
if (queryParams.category && queryParams.category !== "all") {
  q = query(q, where("category", "==", queryParams.category));
}
```

**After**:
```typescript
// category가 "all"이거나 없으면 equipment만 필터링 (market 리스트 기본값)
if (queryParams.category && queryParams.category !== "all") {
  q = query(q, where("category", "==", queryParams.category));
} else {
  q = query(q, where("category", "==", "equipment"));
}
```

**효과**: 
- market 리스트(`/sports/:sport/market`)는 기본적으로 `equipment`만 표시
- 모집/매칭 글은 market 리스트에 나타나지 않음

---

### 2️⃣ activity 타입 분리 확인

**상태**: ✅ 이미 완료됨

**확인된 파일**:
- `EquipmentForm.tsx`: `type: "equipment_created"`
- `RecruitForm.tsx`: `type: "recruit_created"`
- `MatchForm.tsx`: `type: "match_created"`

**효과**: 
- 활동 페이지에서 각 타입별로 올바르게 표시됨
- 거래/모집/매칭이 섞여 보이지 않음

---

### 3️⃣ recruit/match 리스트 라우트 추가

**파일**: `src/App.tsx`

**추가된 라우트**:
```typescript
{/* 🔥 종목별 모집 목록 페이지 */}
<Route 
  path="/sports/:sport/recruit" 
  element={
    <ProtectedRoute>
      <Suspense fallback={...}>
        <SportMarketPage />
      </Suspense>
    </ProtectedRoute>
  } 
/>

{/* 🔥 종목별 매칭 목록 페이지 */}
<Route 
  path="/sports/:sport/match" 
  element={
    <ProtectedRoute>
      <Suspense fallback={...}>
        <SportMarketPage />
      </Suspense>
    </ProtectedRoute>
  } 
/>
```

**파일**: `src/pages/sports/[sport]/market/SportMarketPage.tsx`

**수정 내용**: URL 경로에서 카테고리 자동 감지
```typescript
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
```

**효과**: 
- `/sports/:sport/recruit` → 모집 목록 표시
- `/sports/:sport/match` → 매칭 목록 표시
- 모집/매칭 상세에서 뒤로가기 시 올바른 리스트로 이동

---

## 📋 최종 구조

### 컬렉션

| 카테고리 | 기본 컬렉션 | 동기화 컬렉션 |
|---------|------------|-------------|
| `equipment` | `market` | `marketPosts` |
| `recruit` | `market` | `recruitPosts` |
| `match` | `market` | `matchPosts` |

### 리스트 라우트

| 카테고리 | 라우트 | 필터 |
|---------|--------|------|
| `equipment` | `/sports/:sport/market` | `equipment`만 표시 |
| `recruit` | `/sports/:sport/recruit` | `recruit`만 표시 |
| `match` | `/sports/:sport/match` | `match`만 표시 |

### 상세 라우트

| 카테고리 | 라우트 |
|---------|--------|
| `equipment` | `/sports/:sport/market/:postId` |
| `recruit` | `/sports/:sport/recruit/:postId` |
| `match` | `/sports/:sport/match/:postId` |

### Activity 타입

| 카테고리 | Activity 타입 |
|---------|--------------|
| `equipment` | `equipment_created` |
| `recruit` | `recruit_created` |
| `match` | `match_created` |

---

## 🧪 테스트 체크리스트

### 1️⃣ market 리스트 필터
- [ ] `/sports/soccer/market` 접속 → `equipment`만 표시되는지 확인
- [ ] 모집 글 작성 후 → market 리스트에 나타나지 않는지 확인
- [ ] 매칭 글 작성 후 → market 리스트에 나타나지 않는지 확인

### 2️⃣ activity 타입 분리
- [ ] 중고거래 글 작성 → 활동 페이지에 `equipment_created`로 표시되는지 확인
- [ ] 모집 글 작성 → 활동 페이지에 `recruit_created`로 표시되는지 확인
- [ ] 매칭 글 작성 → 활동 페이지에 `match_created`로 표시되는지 확인

### 3️⃣ recruit/match 리스트 라우트
- [ ] `/sports/soccer/recruit` 접속 → 모집 목록이 표시되는지 확인
- [ ] `/sports/soccer/match` 접속 → 매칭 목록이 표시되는지 확인
- [ ] 모집 상세에서 뒤로가기 → `/sports/soccer/recruit`로 이동하는지 확인
- [ ] 매칭 상세에서 뒤로가기 → `/sports/soccer/match`로 이동하는지 확인

---

## 📝 참고사항

### SportMarketPage 재사용
- `SportMarketPage`는 URL 경로에 따라 자동으로 카테고리를 감지합니다.
- `/sports/:sport/market` → `equipment` 필터
- `/sports/:sport/recruit` → `recruit` 필터
- `/sports/:sport/match` → `match` 필터

### useMarketPosts 필터
- market 리스트는 기본적으로 `equipment`만 표시합니다.
- `category` 파라미터로 다른 카테고리를 명시적으로 요청할 수 있습니다.

---

이 수정으로 **3가지 핵심 문제가 모두 해결**되었습니다.
