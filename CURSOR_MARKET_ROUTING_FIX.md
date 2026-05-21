# 🔥 Cursor 개발자 즉시 수정 지시문

## 목표: Market 라우팅을 `/sports/:sport/market` 구조로 완전 전환

---

## ✅ 현재 상태 확인

### 상품 등록 버튼 이동 경로
**확인 결과**: ✅ 이미 올바른 경로 사용 중
- 파일: `src/features/market/components/MarketFAB.tsx`
- 코드: `navigate(\`/sports/${contextSport}/market/write\`)`
- **결론**: 수정 불필요

---

## 1️⃣ 기존 `/market` 라우팅 전부 제거

### 파일: `src/App.tsx`

### 삭제할 라우트 (994-1006줄)
```tsx
// ❌ 삭제
<Route path="/market" element={<MarketPage />} />
<Route 
  path="/market/create" 
  element={
    <ProtectedRoute>
      <Suspense fallback={...}>
        <MarketAddPage />
      </Suspense>
    </ProtectedRoute>
  } 
/>
```

### 레거시 리다이렉트 수정 (1032-1038줄)
```tsx
// ❌ 기존
<Route path="/trade" element={<Navigate to="/market" replace />} />
<Route path="/trade/*" element={<Navigate to="/market" replace />} />
<Route path="/app/market" element={<Navigate to="/market" replace />} />
<Route path="/app/market/*" element={<Navigate to="/market" replace />} />

// ✅ 수정 (기본 종목으로 리다이렉트)
<Route path="/trade" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/trade/*" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/app/market" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/app/market/*" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/market" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/market/*" element={<Navigate to="/sports/soccer/market" replace />} />
```

---

## 2️⃣ Market 기능을 `/sports/:sport/market` 하위로 이동

### 파일: `src/App.tsx`

### 추가할 라우트 (1349줄 근처에 이미 존재, 확인만)
```tsx
// ✅ 이미 존재하는 라우트 확인
<Route 
  path="/sports/:sport/market" 
  element={
    <ProtectedRoute>
      <SportMarketPage />
    </ProtectedRoute>
  } 
/>

<Route 
  path="/sports/:sport/market/write" 
  element={
    <ProtectedRoute>
      <MarketWritePage />
    </ProtectedRoute>
  } 
/>

<Route 
  path="/sports/:sport/market/:postId" 
  element={
    <ProtectedRoute>
      <MarketPostDetailPage />
    </ProtectedRoute>
  } 
/>
```

**확인**: 이미 구현되어 있음 ✅

---

## 3️⃣ MarketAddPage 이동 경로 수정

### 파일: `src/pages/MarketAddPage.tsx`

### 수정 위치: 420줄
```tsx
// ❌ 기존
setTimeout(() => {
  navigate(`/app/market/${id}`);
}, 1500);

// ✅ 수정
setTimeout(() => {
  // sport 파라미터 추출 (URL에서 또는 state에서)
  const sport = productData.sport || "soccer";
  navigate(`/sports/${sport}/market/${id}`);
}, 1500);
```

### 등록 모드 이동 경로도 수정 (424줄 이후)
```tsx
// 등록 모드
const docRef = await addDoc(collection(db, "market"), productDataWithGeohash);

console.log("✅ 상품 등록 완료:", docRef.id);

// ❌ 기존 (없으면 추가)
// navigate("/market");

// ✅ 수정
const sport = productData.sport || "soccer";
navigate(`/sports/${sport}/market`);
```

---

## 4️⃣ EquipmentForm 이동 경로 수정

### 파일: `src/features/market/components/forms/EquipmentForm.tsx`

### onSuccess 콜백 확인 (470줄 근처)
```tsx
// ✅ 이미 sport 파라미터를 받고 있으므로
onSuccess?.();

// onSuccess 내부에서 이동 경로 확인 필요
// MarketWritePage에서 onSuccess 정의 확인
```

### MarketWritePage 확인 필요
파일: `src/features/market/pages/MarketWritePage.tsx`

```tsx
// onSuccess 콜백 정의 확인
const handleSuccess = () => {
  // ❌ 기존
  // navigate("/market");
  
  // ✅ 수정
  navigate(`/sports/${sport}/market`);
};
```

---

## 5️⃣ SportHubPage에 거래 탭 추가

### 파일: `src/pages/sports/[sport]/SportHubPage.tsx`

### 수정 위치: 20줄, 50-54줄
```tsx
// ❌ 기존
type TabType = "activity" | "team" | "event";

const tabs: { id: TabType; label: string }[] = [
  { id: "activity", label: "활동" },
  { id: "team", label: "팀" },
  { id: "event", label: "이벤트" },
];

// ✅ 수정
type TabType = "market" | "activity" | "team" | "event";

const tabs: { id: TabType; label: string }[] = [
  { id: "market", label: "거래" },
  { id: "activity", label: "활동" },
  { id: "team", label: "팀" },
  { id: "event", label: "이벤트" },
];
```

### 탭 콘텐츠 추가 (88-92줄)
```tsx
// ❌ 기존
<div className="pb-20">
  {activeTab === "activity" && <SportActivityFeed sport={sport} />}
  {activeTab === "team" && <SportTeamFeed sport={sport} />}
  {activeTab === "event" && <SportEventFeed sport={sport} />}
</div>

// ✅ 수정
<div className="pb-20">
  {activeTab === "market" && (
    <div className="p-4">
      <SportMarketPage /> {/* 또는 직접 리다이렉트 */}
      {/* 또는 */}
      <Navigate to={`/sports/${sport}/market`} replace />
    </div>
  )}
  {activeTab === "activity" && <SportActivityFeed sport={sport} />}
  {activeTab === "team" && <SportTeamFeed sport={sport} />}
  {activeTab === "event" && <SportEventFeed sport={sport} />}
</div>
```

**또는 더 간단하게 탭 클릭 시 리다이렉트:**
```tsx
// handleTabChange 수정 (45줄)
const handleTabChange = (newTab: TabType) => {
  if (newTab === "market") {
    navigate(`/sports/${sport}/market`, { replace: true });
    return;
  }
  setActiveTab(newTab);
  navigate(`/sports/${sport}?tab=${newTab}`, { replace: true });
};
```

---

## 6️⃣ 기타 이동 경로 수정

### 파일: `src/features/market/components/details/EquipmentDetail.tsx`

### 수정 위치: 233줄, 260줄, 338줄, 465줄
```tsx
// ❌ 기존
navigate(`/${post.sport}/market`);
navigate("/app/market");
navigate(`/app/market/edit/${post.id}`);
navigate(`/app/market/seller/${post.authorId}`);

// ✅ 수정
navigate(`/sports/${post.sport}/market`);
navigate(`/sports/${post.sport || "soccer"}/market`);
navigate(`/sports/${post.sport}/market/edit/${post.id}`);
navigate(`/sports/${post.sport}/market/seller/${post.authorId}`);
```

### 파일: `src/features/market/components/BottomActionBar.tsx`

### 수정 위치: 65줄
```tsx
// ❌ 기존
navigate(`/app/market/edit/${post.id}`);

// ✅ 수정
const sport = post.sport || "soccer";
navigate(`/sports/${sport}/market/edit/${post.id}`);
```

### 파일: `src/features/market/pages/MarketPostDetailPage.tsx`

### 수정 위치: 304줄
```tsx
// ❌ 기존
navigate(`/${sport}/market`);

// ✅ 수정
navigate(`/sports/${sport}/market`);
```

---

## 7️⃣ 레거시 경로 리다이렉트 추가

### 파일: `src/App.tsx`

### 추가할 리다이렉트 (1032줄 근처)
```tsx
{/* 🔥 레거시: /market → /sports/soccer/market 리다이렉트 */}
<Route path="/market" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/market/*" element={<Navigate to="/sports/soccer/market" replace />} />

{/* 🔥 레거시: /trade → /sports/soccer/market 리다이렉트 */}
<Route path="/trade" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/trade/*" element={<Navigate to="/sports/soccer/market" replace />} />

{/* 🔥 레거시: /app/market → /sports/soccer/market 리다이렉트 */}
<Route path="/app/market" element={<Navigate to="/sports/soccer/market" replace />} />
<Route path="/app/market/*" element={<Navigate to="/sports/soccer/market" replace />} />
```

---

## 🎯 수정 후 정상 흐름

### 상품 등록
```
1. 사용자가 상품 등록 버튼 클릭
   → /sports/basketball/market/write

2. 상품 정보 입력 및 저장
   → Firestore에 저장 (sport: "basketball")

3. 저장 완료 후 자동 이동
   → /sports/basketball/market

4. 목록 표시
   → basketball 종목 상품만 표시
```

### 종목 홈
```
1. 사용자가 종목 선택
   → /sports/basketball

2. 탭 표시
   → 거래 | 활동 | 팀 | 이벤트

3. 거래 탭 클릭
   → /sports/basketball/market

4. 상품 목록 표시
   → basketball 종목 상품만 표시
```

---

## ✅ 작업 완료 체크리스트

- [ ] `App.tsx`에서 `/market`, `/market/create` 라우트 삭제
- [ ] `App.tsx`에서 레거시 리다이렉트 수정
- [ ] `MarketAddPage.tsx`에서 이동 경로 수정
- [ ] `EquipmentForm.tsx`에서 `onSuccess` 이동 경로 확인
- [ ] `MarketWritePage.tsx`에서 `onSuccess` 이동 경로 확인
- [ ] `SportHubPage.tsx`에 "거래" 탭 추가
- [ ] `EquipmentDetail.tsx`에서 모든 이동 경로 수정
- [ ] `BottomActionBar.tsx`에서 이동 경로 수정
- [ ] `MarketPostDetailPage.tsx`에서 이동 경로 수정
- [ ] 모든 레거시 경로 리다이렉트 추가

---

## 🔥 테스트 항목

1. **상품 등록 테스트**
   - `/sports/basketball/market`에서 상품 등록 버튼 클릭
   - `/sports/basketball/market/write`로 이동 확인
   - 상품 등록 후 `/sports/basketball/market`로 이동 확인

2. **레거시 경로 테스트**
   - `/market` 접속 → `/sports/soccer/market`로 리다이렉트 확인
   - `/market/create` 접속 → `/sports/soccer/market`로 리다이렉트 확인
   - `/app/market` 접속 → `/sports/soccer/market`로 리다이렉트 확인

3. **종목 홈 테스트**
   - `/sports/basketball` 접속
   - "거래" 탭 표시 확인
   - "거래" 탭 클릭 → `/sports/basketball/market`로 이동 확인

---

## ⚠️ 주의사항

1. **sport 파라미터 추출**: 모든 컴포넌트에서 `useParams`로 `sport` 추출
2. **기본값 처리**: `sport`가 없을 경우 기본값 `"soccer"` 사용
3. **레거시 호환**: 기존 URL 접근 시 자동 리다이렉트
4. **데이터 일관성**: 모든 Firestore 저장 시 `sport` 필드 포함 확인

---

**이 지시문을 따라 작업하면 Market 라우팅이 완전히 `/sports/:sport/market` 구조로 전환됩니다.**
