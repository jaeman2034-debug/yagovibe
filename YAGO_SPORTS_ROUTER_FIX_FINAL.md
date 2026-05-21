# 🔥 YAGO SPORTS 하단 네비게이션 + Market / Activity Router 수정 지시문

## 📋 목표

앱의 하단 네비게이션 동작을 다음 구조로 통일하고, Market/Activity Router를 정확히 구성한다.

---

## 1️⃣ 하단 네비게이션 구조

### 메뉴 구성
```
홈 / 활동 / 거래 / 지도 / 채팅 / 마이
```

### 각 메뉴 라우터 경로

| 메뉴 | 경로 | 컴포넌트 |
|------|------|----------|
| 홈 | `/home` | HomePage |
| 활동 | `/activity` | ActivityPage |
| 거래 | `/sports/:sport/market` | SportMarketPage |
| 지도 | `/map` | MapPageContainer |
| 채팅 | `/chat` | ChatPage |
| 마이 | `/mypage` | MyPage |

---

## 2️⃣ 거래(마켓) Router 구조

### 필수 3개 라우트 (세트로 유지)

```tsx
// 1. 종목별 거래 목록
<Route 
  path="/sports/:sport/market" 
  element={
    <ProtectedRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <SportMarketPage />
      </Suspense>
    </ProtectedRoute>
  } 
/>

// 2. 글쓰기 페이지
<Route 
  path="/sports/:sport/market/write" 
  element={
    <ProtectedRoute>
      <MarketWritePage />
    </ProtectedRoute>
  } 
/>

// 3. 상품 상세 페이지
<Route 
  path="/sports/:sport/market/:postId" 
  element={
    <ProtectedRoute>
      <MarketPostDetailPage />
    </ProtectedRoute>
  } 
/>
```

### 라우트 순서 중요
**반드시 이 순서로 등록**:
1. `/sports/:sport/market` (목록)
2. `/sports/:sport/market/write` (글쓰기)
3. `/sports/:sport/market/:postId` (상세)

더 구체적인 경로가 먼저 오면 안 됩니다.

---

## 3️⃣ 종목별 거래 목록 (`/sports/:sport/market`)

### 역할
- 해당 종목의 거래 목록 표시
- Firestore `market` 컬렉션을 `sport` 기준으로 필터링

### Firestore 쿼리
```typescript
const q = query(
  collection(db, "market"),
  where("sport", "==", sport),
  where("status", "==", "open"),
  orderBy("createdAt", "desc")
);
```

### 예시
- `/sports/basketball/market` → 농구 상품만 표시
- `/sports/soccer/market` → 축구 상품만 표시

---

## 4️⃣ Activity Router 구조

### Activity 페이지
```
/activity
```

### 역할
- 사용자 행동 피드 표시
- 모든 종목의 활동 통합 표시

### Firestore 쿼리
```typescript
const q = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

### 표시되는 데이터
- `type: "market_created"` → 상품 등록
- `type: "team_created"` → 팀 생성
- `type: "match_created"` → 경기 매칭
- `type: "recruit_created"` → 팀원 모집

---

## 5️⃣ Market → Activity 생성 규칙

### 상품 등록 시 자동 생성

상품 등록 시 다음 2가지 작업이 수행되어야 합니다:

#### 1. Firestore `market` 컬렉션 저장
```typescript
const docRef = await addDoc(collection(db, "market"), {
  title: "...",
  description: "...",
  sport: sport,
  category: "equipment",
  // ...
});
```

#### 2. Firestore `activities` 컬렉션 자동 생성
```typescript
await addDoc(collection(db, "activities"), {
  type: "equipment_created", // 또는 "recruit_created", "match_created"
  refType: "market",
  refId: docRef.id,
  authorId: user.uid,
  title: postData.title,
  summary: postData.price ? `${postData.price.toLocaleString()}원` : undefined,
  thumbnailUrl: postData.images?.[0] || null,
  visibility: "public",
  sport: sport,
  category: postData.category,
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
});
```

### 생성 위치
- **EquipmentForm**: `src/features/market/components/forms/EquipmentForm.tsx`
- **RecruitForm**: `src/features/market/components/forms/RecruitForm.tsx`
- **MatchForm**: `src/features/market/components/forms/MatchForm.tsx`
- **Cloud Function**: `functions/src/market/integratedPostProcessor.ts`

---

## 6️⃣ Activity 클릭 동작

### Activity Item 클릭 시
Activity 피드의 항목을 클릭하면 해당 상품 상세 페이지로 이동:

```typescript
// ActivityItem 컴포넌트
const handleClick = () => {
  if (activity.refType === "market" && activity.refId) {
    navigate(`/sports/${activity.sport}/market/${activity.refId}`);
  }
};
```

### Deep Link 구조
```
/activity (Activity Feed)
    ↓
[Activity Item 클릭]
    ↓
/sports/:sport/market/:postId (Market Detail)
```

---

## 7️⃣ 하단 네비게이션 "거래" 버튼 동작

### 파일
`src/components/BottomNav.tsx`

### 현재 경로 추출 로직
```typescript
// 🔥 현재 경로에서 sport 추출 (기본값: soccer)
const getCurrentSport = (): string => {
  // 1. URL 파라미터에서 추출
  if (sportParam) return sportParam;
  
  // 2. 경로에서 추출
  const match = location.pathname.match(/\/sports\/([^/]+)/);
  if (match) return match[1];
  
  // 3. localStorage에서 마지막 선택한 sport 가져오기
  try {
    const lastSport = localStorage.getItem("lastSport");
    if (lastSport) return lastSport;
  } catch {}
  
  // 4. 기본값
  return "soccer";
};
```

### 거래 버튼 클릭 핸들러
```typescript
const handleMarketClick = (e: React.MouseEvent) => {
  if (nav.path === "/market") {
    e.preventDefault();
    navigate(`/sports/${currentSport}/market`);
  }
};
```

### NavLink 설정
```typescript
<NavLink
  to={nav.path === "/market" ? `/sports/${currentSport}/market` : nav.path}
  onClick={nav.path === "/market" ? handleMarketClick : undefined}
  // ...
/>
```

---

## 8️⃣ 기존 Router 충돌 방지

### 레거시 라우트 리다이렉트

현재 프로젝트에 다음 레거시 라우트가 존재할 수 있습니다:

```tsx
// ❌ 레거시 라우트 → 새 구조로 리다이렉트
<Route path="/market" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/market/*" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/trade" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/trade/*" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/app/market" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/app/market/*" element={<Navigate to="/sports/soccer/market" replace />} />
```

### 권장 구조
- **새 구조 사용**: `/sports/:sport/market`
- **레거시 경로**: 리다이렉트 처리

---

## 9️⃣ 최종 Router 구조

### 전체 라우터 목록

```tsx
// 홈
<Route path="/home" element={<HomePage />} />

// 활동
<Route path="/activity" element={<ActivityPage />} />

// 거래 (Market)
<Route path="/sports/:sport/market" element={<SportMarketPage />} />
<Route path="/sports/:sport/market/write" element={<MarketWritePage />} />
<Route path="/sports/:sport/market/:postId" element={<MarketPostDetailPage />} />

// 지도
<Route path="/map" element={<MapPageContainer />} />

// 채팅
<Route path="/chat" element={<ChatPage />} />

// 마이
<Route path="/mypage" element={<MyPage />} />
```

---

## 🔟 정상 사용자 흐름

### 상품 등록 플로우
```
[하단 네비: 거래 클릭]
    ↓
/sports/soccer/market (목록)
    ↓
[글쓰기 버튼 클릭]
    ↓
/sports/soccer/market/write
    ↓
[폼 작성 및 제출]
    ↓
Firestore: market 컬렉션 저장
    ↓
Firestore: activities 컬렉션 자동 생성
    ↓
Cloud Function: onMarketPostCreated 실행
    ↓
[등록 성공]
    ↓
/sports/soccer/market/abc123 (상세 페이지)
    ↓
[마켓 목록 버튼 클릭]
    ↓
/sports/soccer/market (목록)
```

### Activity Feed 플로우
```
[하단 네비: 활동 클릭]
    ↓
/activity (Activity Feed)
    ↓
[Activity Item 클릭]
    ↓
/sports/basketball/market/xyz789 (상품 상세)
```

---

## 1️⃣1️⃣ UX 기준

### 거래 탭 (`/sports/:sport/market`)
- **역할**: 종목별 거래 목록
- **데이터**: Firestore `market` 컬렉션
- **필터**: `sport` 파라미터로 자동 필터링

### 활동 탭 (`/activity`)
- **역할**: 사용자 행동 피드
- **데이터**: Firestore `activities` 컬렉션
- **필터**: 모든 종목 통합 표시

### 분리 원칙
- **거래 탭**: 상품 거래 중심
- **활동 탭**: 사용자 행동 중심
- **두 기능은 반드시 분리 유지**

---

## 1️⃣2️⃣ 수정 체크리스트

### App.tsx
- [ ] `/sports/:sport/market` 라우트 추가
- [ ] `/sports/:sport/market/write` 라우트 확인
- [ ] `/sports/:sport/market/:postId` 라우트 확인
- [ ] 라우트 순서 확인 (목록 → 글쓰기 → 상세)
- [ ] 레거시 라우트 리다이렉트 확인

### BottomNav.tsx
- [ ] 거래 버튼 클릭 핸들러 추가
- [ ] `getCurrentSport()` 함수 구현
- [ ] `NavLink` 경로 설정 확인

### SportMarketPage.tsx
- [ ] 리다이렉트 코드 제거
- [ ] Firestore 쿼리 `sport` 필터링 확인

### CreateModal.tsx
- [ ] 모든 버튼 경로를 sport 기반으로 수정
- [ ] `getCurrentSport()` 함수 구현

### Activity 생성
- [ ] EquipmentForm에서 `activities` 생성 확인
- [ ] Cloud Function `onMarketPostCreated` 확인

---

## 1️⃣3️⃣ 테스트 방법

### 1. 하단 네비게이션 테스트
```
[거래 버튼 클릭]
→ /sports/soccer/market (또는 현재 sport)
→ 목록이 정상 표시되는지 확인
```

### 2. 상품 등록 테스트
```
[글쓰기 버튼 클릭]
→ /sports/soccer/market/write
→ 폼 작성 및 제출
→ /sports/soccer/market/:postId (상세 페이지)
→ 정상 표시 확인
```

### 3. 목록 이동 테스트
```
[상세 페이지에서 "마켓 목록" 버튼 클릭]
→ /sports/soccer/market
→ 404가 아닌 목록이 표시되는지 확인
```

### 4. Activity Feed 테스트
```
[활동 탭 클릭]
→ /activity
→ 상품 등록 활동이 표시되는지 확인
→ [Activity Item 클릭]
→ /sports/:sport/market/:postId
→ 상세 페이지 정상 표시 확인
```

---

## 1️⃣4️⃣ 중요 포인트

### Router 순서
React Router는 **위에서부터 매칭**하므로, 더 구체적인 경로가 먼저 와야 합니다:

```tsx
// ✅ 올바른 순서
/sports/:sport/market          // 목록
/sports/:sport/market/write    // 글쓰기
/sports/:sport/market/:postId   // 상세

// ❌ 잘못된 순서 (이렇게 하면 /write가 :postId로 매칭됨)
/sports/:sport/market/:postId   // 상세
/sports/:sport/market/write    // 글쓰기
/sports/:sport/market          // 목록
```

### Sport 추출 우선순위
1. URL 파라미터 (`useParams()`)
2. 경로 패턴 (`/sports/:sport`)
3. localStorage (`lastSport`)
4. 기본값 (`"soccer"`)

### Activity 생성 위치
- **클라이언트**: 각 Form 컴포넌트에서 생성 (즉시 반영)
- **서버**: Cloud Function에서 생성 (백업)

---

## 🚀 다음 단계 (선택사항)

이 수정을 완료하면 다음 기능들도 동일한 패턴으로 정리할 수 있습니다:

- Schedule: `/sports/:sport/schedule`
- Recruit: `/sports/:sport/recruit`
- Match: `/sports/:sport/match`
- Team: `/sports/:sport/team`

**전체 Router 구조를 한 번에 정리하면 앞으로 라우터가 절대 꼬이지 않습니다.**
