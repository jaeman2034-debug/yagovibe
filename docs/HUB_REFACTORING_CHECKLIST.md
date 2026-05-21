# 🔥 허브 리팩토링 작업 체크리스트

**목적**: 스포츠 앱 → Activity 중심 플랫폼 전환

**작업 기간**: 단계별 진행

---

## ✅ 1단계: 핵심 인프라 (완료)

### 생성된 파일

- [x] `src/context/HubContext.tsx` - 허브 상태 관리 컨텍스트
- [x] `src/hooks/useHubContext.ts` - 컨텍스트 사용 훅
- [x] `src/App.tsx` - HubProvider 추가 완료

### 상태

```typescript
✅ HubContext 생성 완료
✅ useHubContext 훅 생성 완료
✅ App.tsx에 HubProvider 추가 완료
```

---

## 📋 2단계: 페이지 생성 (진행 중)

### 새로 생성해야 하는 파일

- [ ] `src/pages/hub/HubHome.tsx` - 앱 루트 페이지
- [ ] `src/pages/hub/index.ts` - export용
- [ ] `src/pages/activity/ActivityRouter.tsx` - Activity 라우터
- [ ] `src/pages/activity/index.tsx` - export용

### 작업 내용

#### HubHome.tsx 구조

```tsx
- Context Header (위치, 시간, 종목)
- Activity Feed (최근 활동)
- Personal Layer (개인화 추천)
- Quick Actions (빠른 액션)
```

#### ActivityRouter.tsx 구조

```tsx
<Route path="trading/*" element={<MarketPage />} />
<Route path="team/*" element={<TeamRoutes />} />
<Route path="events/*" element={<TournamentRoutes />} />
<Route path="venues/*" element={<VoiceMapSearch />} />
```

---

## 📋 3단계: 기존 파일 수정

### 필수 수정 파일

- [ ] `src/App.tsx` - 루트 경로 변경
  ```tsx
  // 변경 전
  <Route path="/" element={<SportsHubPage />} />
  
  // 변경 후
  <Route path="/" element={<HubHome />} />
  <Route path="/activity/*" element={<ActivityRouter />} />
  <Route path="/sport/:type" element={<SportView />} />
  ```

- [ ] `src/pages/SportsHubPage.tsx` - 역할 변경
  ```tsx
  // 변경: 메인 진입 페이지 → Sport View 페이지
  const { sport } = useParams();
  const { setActiveSport } = useHubContext();
  
  useEffect(() => {
    if (sport) {
      setActiveSport(sport as SportType);
    }
  }, [sport]);
  ```

- [ ] `src/components/BottomNav.tsx` - 네비게이션 변경
  ```tsx
  // 변경 전
  { path: "/home", icon: Home, label: "홈" }
  { path: "/app/market", icon: ShoppingBag, label: "마켓" }
  
  // 변경 후
  { path: "/", icon: Home, label: "허브" }
  { path: "/activity/trading", icon: ShoppingBag, label: "거래" }
  { path: "/activity/team", icon: Users, label: "팀" }
  { path: "/activity/events", icon: Calendar, label: "이벤트" }
  { path: "/activity/venues", icon: Map, label: "장소" }
  ```

---

## 📋 4단계: 경로 매핑 (논리적 변경)

### 경로 변경 (코드 수정 최소화)

- [ ] Market 경로
  ```
  기존: /app/market
  변경: /activity/trading
  ```

- [ ] Team 경로
  ```
  기존: /sports/:type/team/*
  변경: /activity/team/*
  ```

- [ ] Tournament 경로
  ```
  기존: /tournament/*
  변경: /activity/events/*
  ```

- [ ] Venue 경로
  ```
  기존: /voice-map
  변경: /activity/venues
  ```

---

## 📋 5단계: 선택적 파일 (권장)

### 레이아웃

- [ ] `src/layouts/ActivityLayout.tsx` - Activity 공통 레이아웃
  ```tsx
  - 공통 헤더
  - 스포츠 필터
  - 정렬/검색 UI
  ```

### 컴포넌트

- [ ] `src/components/hub/ContextHeader.tsx` - 컨텍스트 헤더
- [ ] `src/components/hub/ActivityFeed.tsx` - 활동 피드
- [ ] `src/components/hub/PersonalLayer.tsx` - 개인화 레이어

---

## 📋 6단계: 변경 없는 파일 (절대 건드리지 말 것)

### 안전한 레이어

```
/services/*      ✅ 변경 없음
/utils/*         ✅ 변경 없음
/features/*      ✅ 변경 없음
/hooks/*         ✅ 변경 없음 (useHubContext 제외)
/lib/*           ✅ 변경 없음
```

---

## 🎯 작업 우선순위

### Phase 1: 핵심 인프라 (완료 ✅)
1. HubContext 생성
2. useHubContext 훅 생성
3. App.tsx에 HubProvider 추가

### Phase 2: 페이지 생성 (다음 단계)
1. HubHome.tsx 생성
2. ActivityRouter.tsx 생성
3. App.tsx 라우팅 변경

### Phase 3: 기존 페이지 수정
1. SportsHubPage.tsx 역할 변경
2. BottomNav.tsx 네비게이션 변경
3. 경로 매핑 업데이트

### Phase 4: 선택적 개선
1. ActivityLayout.tsx 생성
2. Hub 컴포넌트 분해
3. UI/UX 개선

---

## 📊 진행 상황

```
Phase 1: ████████████████████ 100% (완료)
Phase 2: ░░░░░░░░░░░░░░░░░░░░   0% (대기)
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0% (대기)
Phase 4: ░░░░░░░░░░░░░░░░░░░░   0% (대기)
```

---

## 🚀 다음 작업

**우선순위 1**: HubHome.tsx 생성
- 앱 루트 페이지
- Context Header 표시
- Activity Feed 표시
- Personal Layer 표시

**우선순위 2**: ActivityRouter.tsx 생성
- Activity 기반 라우팅
- 기존 페이지 재사용
- URL 매핑

**우선순위 3**: App.tsx 라우팅 변경
- 루트 경로를 HubHome으로
- ActivityRouter 연결
- 기존 경로 유지 (하위 호환)

---

## 📝 참고 사항

1. **기존 코드 재사용**: 90% 이상 재사용
2. **하위 호환성**: 기존 URL도 동작하도록 리다이렉트
3. **점진적 전환**: 한 번에 모든 것을 바꾸지 않음
4. **테스트**: 각 단계마다 테스트 필수

---

**작업 시작일**: 2024-12-19
**예상 완료일**: 단계별 진행
