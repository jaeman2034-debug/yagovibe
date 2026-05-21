# 🔥 네비 UI 상태 머신 실코드 템플릿 (Web React)

## ✅ 완성된 파일 구조

```
src/components/map/
├── NavUIStateMachine.tsx              # 상태 정의 및 매핑
├── NavigationTransitionAnimation.tsx  # 전환 애니메이션
├── MapPageContainer.tsx                # 메인 컨테이너 (상태 머신 통합)
├── NavigationCard.tsx                  # 하단 카드 (상태별 모드)
├── NavigationStatusBar.tsx            # 상단 상태바
└── PhaseStatusIndicator.tsx            # 상태 표시 (디버그)
```

## 📋 핵심 코드 스니펫

### 1. 상태 정의 및 매핑

```typescript
// src/components/map/NavUIStateMachine.tsx
export type NavUIState = 'SEARCH' | 'SELECTED' | 'PRE_NAV' | 'NAVIGATING' | 'ARRIVED';

// MapPageContainer.tsx
const navUIState: NavUIState = 
  phase === 'IDLE' || phase === 'SEARCHING' ? 'SEARCH' :
  phase === 'CONFIRMED' ? 'SELECTED' :
  phase === 'PRE_NAVIGATING' ? 'PRE_NAV' :
  phase === 'NAVIGATING' ? 'NAVIGATING' :
  phase === 'ARRIVED' ? 'ARRIVED' :
  'SEARCH';
```

### 2. TopLayer 조건부 렌더링

```typescript
// MapPageContainer.tsx
{/* 검색바: SEARCH/SELECTED 상태 */}
{(phase === 'IDLE' || phase === 'SEARCHING' || phase === 'CONFIRMED') && (
  <div style={{ /* 검색바 스타일 */ }}>
    <input
      value={phase === 'CONFIRMED' && confirmedDestination 
        ? confirmedDestination.name 
        : searchQuery}
      readOnly={phase === 'CONFIRMED'}
    />
  </div>
)}

{/* 상태바: PRE_NAVIGATING/NAVIGATING 상태 */}
{phase === 'PRE_NAVIGATING' && (
  <NavigationStatusBar
    statusText="🚗 출발 준비됨"
    destinationName={confirmedDestination.name}
  />
)}

{phase === 'NAVIGATING' && (
  <NavigationStatusBar
    destinationName={confirmedDestination.name}
    distance={routeInfo?.distance}
    duration={routeInfo?.duration}
  />
)}
```

### 3. BottomLayer 조건부 렌더링

```typescript
// MapPageContainer.tsx
{/* 결과 리스트: SEARCHING 상태 */}
{phase === 'SEARCHING' && places.length > 0 && (
  <div>{/* 검색 결과 리스트 */}</div>
)}

{/* 확인 카드: CONFIRMED 상태 */}
{phase === 'CONFIRMED' && confirmedDestination && (
  <NavigationCard
    mode="CONFIRMED"
    place={confirmedDestination}
    onStart={() => setPhase('PRE_NAVIGATING')}
  />
)}

{/* 출발 대기 카드: PRE_NAVIGATING 상태 */}
{phase === 'PRE_NAVIGATING' && confirmedDestination && (
  <NavigationCard
    mode="PRE_NAVIGATING"
    place={confirmedDestination}
    routeInfo={routeInfo}
    isRouteCalculating={isRouteCalculating}
    onStart={() => {
      // 🔥 3연타 애니메이션
      setIsStartButtonPressed(true);
      setTimeout(() => {
        handleStartNavigation();
        setTimeout(() => {
          setIsStartButtonPressed(false);
        }, 300);
      }, 150);
    }}
  />
)}

{/* 안내 카드: NAVIGATING 상태 */}
{phase === 'NAVIGATING' && confirmedDestination && (
  <NavigationCard
    mode="NAVIGATING"
    place={confirmedDestination}
    routeInfo={routeInfo}
    onStop={handleStopNavigation}
  />
)}
```

### 4. 출발 버튼 전환 애니메이션 (3연타)

```typescript
// MapPageContainer.tsx
const [isStartButtonPressed, setIsStartButtonPressed] = useState<boolean>(false);

// PRE_NAVIGATING → NAVIGATING 전환
onStart={() => {
  // 1. 버튼 피드백 (150ms)
  setIsStartButtonPressed(true);
  
  // 2. 지도 연출 (300ms)
  setTimeout(() => {
    handleStartNavigation(); // fitBounds 자동 실행
    // 3. UI 스왑 (즉시)
    setTimeout(() => {
      setIsStartButtonPressed(false);
    }, 300);
  }, 150);
}}

// StartButtonFeedback 컴포넌트
{isStartButtonPressed && (
  <StartButtonFeedback isPressed={true} />
)}
```

### 5. 디버그 배지

```typescript
// MapPageContainer.tsx
<DebugBadge state={navUIState} />
```

## 🎯 상태 전환 플로우

```
IDLE/SEARCHING (SEARCH)
  ↓ [장소 선택]
CONFIRMED (SELECTED)
  ↓ [여기에 갈게요 클릭]
PRE_NAVIGATING (PRE_NAV)
  ↓ [출발 버튼 클릭] → 3연타 애니메이션
NAVIGATING (NAVIGATING)
  ↓ [도착]
ARRIVED (ARRIVED)
```

## ✅ 핵심 원칙

1. **상태가 바뀌면 UI 세트가 통째로 갈아끼워진다**
2. **조건문을 컴포넌트 단위로 자른다** (UI 섞임 방지)
3. **디버그 배지로 상태 확인 가능** (개발 모드)
4. **출발 버튼 클릭 시 즉각적인 피드백** (3연타 애니메이션)
