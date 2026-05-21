# 🔥 네비 UI 상태별 고정 와이어프레임 강제

## 📐 상태별 UI 존재 규칙

### 🟦 상태 ①: 검색 중 (IDLE / SEARCHING)

#### ✅ 존재해야 하는 UI
- [x] 검색바 (상단)
- [x] 지도 (내 위치 중심)
- [x] 검색 결과 리스트 (하단, SEARCHING일 때만)
- [x] PhaseStatusIndicator ("검색 중")

#### ❌ 존재하면 안 되는 UI
- [ ] 출발 버튼
- [ ] 경로선
- [ ] 목적지 확정 카드
- [ ] 상단 상태바 (NavigationStatusBar)
- [ ] "안내 중" 메시지

---

### 🟨 상태 ②: 목적지 선택됨 (CONFIRMED)

#### ✅ 존재해야 하는 UI
- [x] 검색바 (입력값 고정, ✕ 아이콘)
- [x] 지도 (출발지 + 목적지 fitBounds)
- [x] 하단 카드: "여기로 갈까요?" + "여기에 갈게요" 버튼
- [x] PhaseStatusIndicator ("목적지 선택됨")

#### ❌ 존재하면 안 되는 UI
- [ ] 출발 버튼 (NavigationCard의 "출발" 버튼)
- [ ] 경로선
- [ ] 경로 정보 (거리/시간)
- [ ] 상단 상태바
- [ ] "안내 중" 메시지

---

### 🟧 상태 ③: 출발 대기 (PRE_NAVIGATING) ⚠️ **현재 없음**

#### ✅ 존재해야 하는 UI
- [ ] 상단 상태바: "🚗 출발 준비됨"
- [ ] 지도 (출발지 강조 + 목적지 + 경로선 연한 색)
- [ ] 하단 카드: 목적지 이름 + 거리/시간 + "출발" 버튼
- [ ] PhaseStatusIndicator 숨김 (상단 상태바가 대체)

#### ❌ 존재하면 안 되는 UI
- [ ] 검색바
- [ ] 검색 결과 리스트
- [ ] "여기에 갈게요" 버튼
- [ ] "안내 중" 메시지

---

### 🟥 상태 ④: 안내 중 (NAVIGATING)

#### ✅ 존재해야 하는 UI
- [x] 상단 상태바: "⬆️ 300m 직진" (또는 "안내 중 · 서울월드컵경기장")
- [x] 지도 (경로선 진한 색, 카메라 추적)
- [x] 하단 카드: "이동 중..." + 거리/시간 + "중지" 버튼
- [x] PhaseStatusIndicator 숨김 (상단 상태바가 대체)

#### ❌ 존재하면 안 되는 UI
- [ ] 검색바
- [ ] 검색 결과 리스트
- [ ] 출발 버튼
- [ ] "여기에 갈게요" 버튼
- [ ] 목적지 확정 카드

---

## 🔧 현재 코드 수정 체크리스트

### Step 1: PRE_NAVIGATING 상태 추가

#### 1.1 Phase 타입 확장
- [ ] `MapPageContainer.tsx`의 Phase 타입에 `'PRE_NAVIGATING'` 추가
- [ ] `NavigationCard.tsx`의 NavigationMode 타입에 `'PRE_NAVIGATING'` 추가
- [ ] `PhaseStatusIndicator.tsx`의 Phase 타입에 `'PRE_NAVIGATING'` 추가

#### 1.2 CONFIRMED → PRE_NAVIGATING 전환
- [ ] `NavigationCard`의 CONFIRMED 모드에서 "여기에 갈게요" 버튼 클릭 시
- [ ] `handleConfirmDestination` 함수 생성
- [ ] `setPhase('PRE_NAVIGATING')` 호출
- [ ] 경로 계산 시작

#### 1.3 PRE_NAVIGATING → NAVIGATING 전환
- [ ] 경로 계산 완료 시
- [ ] "출발" 버튼 활성화
- [ ] "출발" 버튼 클릭 시 `setPhase('NAVIGATING')` 호출

---

### Step 2: 상태별 UI 강제 (존재/부재 명확화)

#### 2.1 검색바 조건부 렌더링
- [ ] IDLE/SEARCHING/CONFIRMED: 표시
- [ ] PRE_NAVIGATING/NAVIGATING/ARRIVED: 숨김
- [ ] CONFIRMED 상태에서 입력값 고정
- [ ] CONFIRMED 상태에서 ✕ 아이콘 추가

#### 2.2 상단 상태바 조건부 렌더링
- [ ] PRE_NAVIGATING: "🚗 출발 준비됨" 표시
- [ ] NAVIGATING: "안내 중 · 목적지" 표시
- [ ] 다른 상태: 숨김

#### 2.3 하단 카드 조건부 렌더링
- [ ] CONFIRMED: "여기로 갈까요?" + "여기에 갈게요" 버튼
- [ ] PRE_NAVIGATING: 목적지 + 거리/시간 + "출발" 버튼
- [ ] NAVIGATING: "이동 중..." + 거리/시간 + "중지" 버튼
- [ ] 다른 상태: 숨김

#### 2.4 PhaseStatusIndicator 조건부 렌더링
- [ ] IDLE/SEARCHING/CONFIRMED: 표시
- [ ] PRE_NAVIGATING/NAVIGATING/ARRIVED: 숨김 (상단 상태바가 대체)

---

### Step 3: 잘못된 UI 제거

#### 3.1 CONFIRMED 상태에서 "출발" 버튼 제거
- [ ] `NavigationCard`의 CONFIRMED 모드에서 "출발" 버튼 제거
- [ ] "여기에 갈게요" 버튼만 유지

#### 3.2 NAVIGATING 상태에서 검색바 제거 확인
- [ ] 이미 숨김 처리되어 있는지 확인
- [ ] 조건문 수정 필요 시 수정

#### 3.3 검색 결과 리스트 조건부 렌더링
- [ ] SEARCHING 상태에서만 표시
- [ ] 다른 상태에서는 숨김

---

## 📋 파일별 수정 사항

### `MapPageContainer.tsx`

```typescript
// 1. Phase 타입 확장
type Phase = 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'PRE_NAVIGATING' | 'NAVIGATING' | 'ARRIVED';

// 2. 검색바 조건부 렌더링
const shouldShowSearchBar = phase === 'IDLE' || phase === 'SEARCHING' || phase === 'CONFIRMED';

// 3. PhaseStatusIndicator 조건부 렌더링
{phase !== 'PRE_NAVIGATING' && phase !== 'NAVIGATING' && phase !== 'ARRIVED' && (
  <PhaseStatusIndicator phase={phase} />
)}

// 4. 상단 상태바 조건부 렌더링
{phase === 'PRE_NAVIGATING' && (
  <NavigationStatusBar
    destinationName={confirmedDestination.name}
    travelMode="DRIVING"
    isCalculating={isRouteCalculating}
    statusText="출발 준비됨"
  />
)}
{phase === 'NAVIGATING' && confirmedDestination && (
  <NavigationStatusBar ... />
)}

// 5. 하단 카드 조건부 렌더링
{(phase === 'CONFIRMED' || phase === 'PRE_NAVIGATING' || phase === 'NAVIGATING' || phase === 'ARRIVED') && confirmedDestination && (
  <NavigationCard
    mode={
      phase === 'ARRIVED' ? 'ARRIVED' :
      phase === 'NAVIGATING' ? 'NAVIGATING' :
      phase === 'PRE_NAVIGATING' ? 'PRE_NAVIGATING' :
      'CONFIRMED'
    }
    ...
  />
)}
```

### `NavigationCard.tsx`

```typescript
// 1. NavigationMode 타입 확장
type NavigationMode = 'CONFIRMED' | 'PRE_NAVIGATING' | 'NAVIGATING' | 'ARRIVED';

// 2. CONFIRMED 모드: "여기에 갈게요" 버튼만
if (mode === 'CONFIRMED') {
  return (
    ...
    <button onClick={onStart}>여기에 갈게요</button> // "출발" 버튼 아님
  );
}

// 3. PRE_NAVIGATING 모드 추가
if (mode === 'PRE_NAVIGATING') {
  return (
    ...
    <div>목적지 이름</div>
    <div>거리/시간</div>
    <button onClick={onStart}>출발</button> // 여기서만 "출발" 버튼
  );
}
```

### `PhaseStatusIndicator.tsx`

```typescript
// PRE_NAVIGATING/NAVIGATING/ARRIVED 상태에서는 숨김
if (phase === 'PRE_NAVIGATING' || phase === 'NAVIGATING' || phase === 'ARRIVED') {
  return null;
}
```

### `NavigationStatusBar.tsx`

```typescript
// statusText prop 추가 (PRE_NAVIGATING용)
type Props = {
  ...
  statusText?: string; // "출발 준비됨" 등 커스텀 텍스트
};

// PRE_NAVIGATING 상태에서 사용
{statusText || (isCalculating ? '경로 계산 중...' : `${modeLabel} · ${distance} · ${duration}`)}
```

---

## ✅ 구현 우선순위

1. **PRE_NAVIGATING 상태 추가** (가장 중요)
2. **상태별 UI 강제** (존재/부재 명확화)
3. **잘못된 UI 제거** (CONFIRMED에서 "출발" 버튼 제거)

---

## 🎯 최종 목표

**"이 상태에선 이 UI만 존재한다"를 강제**

각 상태 전환마다:
- ✅ 불필요한 UI 제거
- ✅ 필요한 UI만 표시
- ✅ 상태별 UI 완전 분리
