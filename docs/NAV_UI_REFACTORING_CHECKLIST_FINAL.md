# ✅ 현재 화면 UI 리팩토링 체크리스트 (상태 머신 기준)

> 기준 상태 머신:
> **① 검색 → ② 선택 → ③ 출발 대기 → ④ 안내 중**

---

## 🧱 0단계 — 리팩토링 전 공통 규칙 (필수)

- [x] **현재 상태를 나타내는 변수/플래그가 UI에 존재**
  - `phase: 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'PRE_NAVIGATING' | 'NAVIGATING' | 'ARRIVED'`
- [x] 화면 어딘가에 **상태 텍스트 임시 표시**
  - `PhaseStatusIndicator` 컴포넌트로 상태 표시

> ✅ 완료: `MapPageContainer.tsx`에 phase 상태 머신 존재, `PhaseStatusIndicator`로 상태 표시

---

## 🟦 ① 검색 중 상태 체크리스트 (IDLE / SEARCHING)

### 🔝 상단

- [x] 검색바 **보임**
  - 위치: `MapPageContainer.tsx` line 1714-1772
  - 조건: `phase === 'IDLE' || phase === 'SEARCHING' || phase === 'CONFIRMED'`
- [x] placeholder = `장소를 검색하세요`
  - 현재: `"장소를 검색하세요..."` ✅

### 🗺 지도

- [x] 내 위치 아이콘 표시
  - `WebMapRenderer.tsx`에서 처리
- [x] 지도 중심 = 내 위치
  - `initialCenter = MY_LOCATION` ✅

### 🔽 하단

- [x] 검색 결과 리스트 표시
  - `PlaceResultCard` 컴포넌트
  - 조건: `phase === 'SEARCHING' && places.length > 0`
- [x] 결과 선택 가능
  - `onSelect={selectResult}` ✅

### ❌ 제거 확인

- [x] 출발 버튼 ❌
  - IDLE/SEARCHING에서는 `NavigationCard` 렌더링 안 됨 ✅
- [x] 경로선 ❌
  - `navigationStarted`가 false이면 경로선 표시 안 됨 ✅

---

## 🟨 ② 목적지 선택 상태 체크리스트 (CONFIRMED)

### 🔝 상단

- [x] 검색바 유지
  - 조건: `phase === 'CONFIRMED'` 포함 ✅
- [ ] 선택된 장소명 고정
  - **TODO**: 검색바 입력값을 `confirmedDestination.name`으로 고정 필요
- [ ] ✕ 버튼으로 취소 가능
  - **TODO**: 검색바에 ✕ 아이콘 추가 필요

### 🗺 지도

- [x] 목적지 핀 표시
  - `selectedPlace` prop으로 처리 ✅
- [x] 내 위치 + 목적지 한 화면
  - `fitBounds` 로직 필요 (현재 확인 필요)

### 🔽 하단

- [x] "여기에 갈게요" 카드 표시
  - `NavigationCard` CONFIRMED 모드
  - 버튼 텍스트: "여기에 갈게요" ✅

### ❌ 제거 확인

- [x] 출발 버튼 ❌
  - CONFIRMED 모드에서는 "여기에 갈게요" 버튼만 표시 ✅
- [x] 검색 결과 리스트 ❌
  - 조건: `phase === 'SEARCHING'`에서만 표시 ✅

---

## 🟧 ③ 출발 대기 상태 체크리스트 (PRE_NAVIGATING) (**최중요**)

### 🔝 상단

- [x] 검색바 완전히 숨김
  - 조건: `phase === 'IDLE' || phase === 'SEARCHING' || phase === 'CONFIRMED'`
  - PRE_NAVIGATING은 제외 ✅
- [x] 텍스트: `🚗 출발 준비됨`
  - `NavigationStatusBar`에 `statusText="출발 준비됨"` prop 전달 ✅

### 🗺 지도

- [ ] 경로선 표시 (연한 색 OK)
  - **TODO**: PRE_NAVIGATING 상태에서 경로선 표시 필요
- [ ] 출발지 강조
  - **TODO**: 출발지 마커 pulse 애니메이션 추가 필요

### 🔽 하단

- [x] 목적지명
  - `NavigationCard` PRE_NAVIGATING 모드 ✅
- [x] 예상 시간 / 거리
  - `routeInfo` prop으로 전달 ✅
- [x] **출발 버튼 노출**
  - `routeInfo`가 있을 때만 표시 ✅

### ❌ 제거 확인

- [x] 검색바 ❌
  - PRE_NAVIGATING에서는 숨김 ✅
- [x] 검색 결과 ❌
  - SEARCHING에서만 표시 ✅

---

## 🟥 ④ 안내 중 상태 체크리스트 (NAVIGATING)

### 🔝 상단

- [x] 검색바 ❌
  - NAVIGATING에서는 숨김 ✅
- [x] 턴 안내 텍스트 표시
  - `NavigationStatusBar` 컴포넌트
  - 거리/시간 표시 ✅

### 🗺 지도

- [x] 차량 시점
  - `WebMapRenderer.tsx`에서 카메라 추적 처리
- [x] 지도 자동 추적
  - `navigationStarted` 상태로 제어 ✅
- [x] 경로선 강조
  - `directionsResult`로 경로선 표시 ✅

### 🔽 하단

- [x] 남은 시간
  - `NavigationCard` NAVIGATING 모드에서 `routeInfo.duration` 표시 ✅
- [x] 다음 안내
  - 추후 구현 예정
- [x] 종료 버튼
  - "중지" 버튼 표시 ✅

---

## 🚨 UX QA 필수 테스트 (이거 안 되면 실패)

- [x] 출발 버튼 누르면 **화면이 즉시 달라진다**
  - `handleStartNavigation`에서 즉시 `setPhase('NAVIGATING')` 호출 ✅
  - 상단 상태바 즉시 표시 ✅
  - 하단 카드 즉시 업데이트 ✅
- [x] 0.5초 안에 "안내 중"임을 인지 가능
  - `PhaseStatusIndicator` 또는 `NavigationStatusBar`로 상태 표시 ✅
- [ ] 뒤로가기/종료 시 **이전 상태 UI로 복귀**
  - **TODO**: `handleStopNavigation`에서 상태 복귀 로직 확인 필요

---

## 📋 남은 작업 체크리스트

### 우선순위 1: CONFIRMED 상태 검색바 개선
- [ ] 검색바 입력값을 `confirmedDestination.name`으로 고정
- [ ] 검색바에 ✕ 아이콘 추가 (선택 취소)

### 우선순위 2: PRE_NAVIGATING 상태 지도 연출
- [ ] 경로선 표시 (연한 색)
- [ ] 출발지 마커 강조 (pulse 애니메이션)

### 우선순위 3: 상태 복귀 로직
- [ ] `handleStopNavigation`에서 이전 상태로 복귀
- [ ] 뒤로가기 버튼 처리

---

## ✅ 완료된 작업 요약

1. ✅ Phase 상태 머신 구현
2. ✅ PRE_NAVIGATING 상태 추가
3. ✅ 상태별 UI 조건부 렌더링
4. ✅ PhaseStatusIndicator 추가
5. ✅ NavigationStatusBar 개선
6. ✅ NavigationCard PRE_NAVIGATING 모드 구현
7. ✅ CONFIRMED → PRE_NAVIGATING 전환
8. ✅ PRE_NAVIGATING → NAVIGATING 전환
9. ✅ 출발 버튼 클릭 시 즉각적인 UI 변화

---

## 🎯 다음 단계

현재 상태:
- ✅ 상태 머신 구조 완성
- ✅ 각 상태별 UI 분리 완료
- ⚠️ 일부 UI 연출 보완 필요 (경로선, 출발지 강조)

다음 선택지:
1. **이 UI 상태 머신을 코드 구조로 번역** (React 기준)
2. **전환 애니메이션 설계** (출발 눌렀을 때 연출)
