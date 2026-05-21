# 🔴 지도 페이지 UI 리모델링 - 실제 코드 변경 계획

**목적**: 설계를 실제 코드로 반영  
**대상**: 개발자  
**상태**: 리모델링 실행 중

---

## 🎯 핵심 원칙

> **리모델링은 추가가 아니라 제거다**

---

# STEP 1: 삭제 (가장 중요)

## ❌ 지금 당장 제거해야 할 UI

### 1. StatusHeader (상단 상태 표시)

**위치**: `src/pages/GeneralMapPage.tsx` (5005-5035줄)

**제거 대상**:
```tsx
{mapMode === "navigation" && navigationInfo ? (
  <StatusHeader variant="navigating" ... />
) : runningCrewState ? (
  <StatusHeader variant="upcoming" ... />
) : (
  <StatusHeader variant="idle" title="주변 장소를 말로 찾아보세요" ... />
)}
```

**이유**: 상단에 상태 메시지가 있으면 안 됨 (Header는 항상 같은 모습)

**액션**: 전체 블록 삭제

---

### 2. 지도 상단 타이틀 (map-title)

**위치**: `src/pages/GeneralMapPage.tsx` (5044-5059줄)

**제거 대상**:
```tsx
<div className="map-title" style={{...}}>
  {sttStatus === 'listening' ? '👂 듣고 있어요…' :
   sttStatus === 'understood' ? '🧠 이해했어요' :
   sttStatus === 'searching' ? '🔍 찾는 중…' :
   sttStatus === 'error' ? '⚠️ 다시 말해주세요' :
   '지금 말하면 찾아드립니다'}
</div>
```

**이유**: 지도 위에 여러 상태 메시지가 떠다님

**액션**: 전체 블록 삭제

---

### 3. ListeningIndicator (지도 위)

**위치**: `src/pages/GeneralMapPage.tsx` (5064-5080줄)

**제거 대상**:
```tsx
<div style={{ position: 'absolute', top: '...', ... }}>
  <ListeningIndicator status={sttStatus} />
</div>
```

**이유**: 지도 위에 여러 상태 UI가 있음

**액션**: 전체 블록 삭제

---

### 4. RecognizedCaption (지도 위)

**위치**: `src/pages/GeneralMapPage.tsx` (5082-5098줄)

**제거 대상**:
```tsx
<div style={{ position: 'absolute', top: '...', ... }}>
  <RecognizedCaption text={recognizedText} />
</div>
```

**이유**: 지도 위에 여러 상태 UI가 있음

**액션**: 전체 블록 삭제

---

### 5. AIWhisper (지도 위)

**위치**: `src/pages/GeneralMapPage.tsx` (5061-5062줄)

**제거 대상**:
```tsx
<AIWhisper state={whisperState} />
```

**이유**: 지도 위에 여러 상태 UI가 있음

**액션**: 전체 블록 삭제

---

### 6. Debug UI (모든 곳)

**검색**: `process.env.NODE_ENV`, `debug`, `Debug`

**액션**: 모든 Debug UI에 환경 분기 추가 또는 제거

---

## ✅ STEP 1 완료 기준

- [ ] StatusHeader 제거
- [ ] map-title 제거
- [ ] ListeningIndicator 제거
- [ ] RecognizedCaption 제거
- [ ] AIWhisper 제거
- [ ] Debug UI 제거 또는 환경 분기

**결과**: 지도 위가 깨끗해짐

---

# STEP 2: 상태 UI 통합 컴포넌트 생성

## 새 컴포넌트: `StatusPill`

**파일**: `src/components/map/StatusPill.tsx` (신규)

**Props**:
```tsx
type StatusPillProps = {
  type: 'loading' | 'voice' | 'error' | null;
  errorMessage?: string;
  onRetry?: () => void;
};
```

**구현**:
- 위치: `fixed top: calc(48px + 44px + env(safe-area-inset-top) + 16px)`
- z-index: 50
- pill 형태 (rounded-full)
- 상태별 스타일:
  - loading: `bg-neutral-100 text-neutral-700`
  - voice: `bg-green-100 text-green-700`
  - error: `bg-red-100 text-red-700`

**렌더링 규칙**:
```tsx
if (error) return <StatusPill type="error" ... />;
if (isLoading) return <StatusPill type="loading" />;
if (isVoiceReady) return <StatusPill type="voice" />;
return null;
```

---

## ✅ STEP 2 완료 기준

- [ ] StatusPill 컴포넌트 생성
- [ ] 상태 타입 정의 (loading/voice/error)
- [ ] 렌더링 규칙 적용 (단일화)
- [ ] GeneralMapPage에 통합

**결과**: 상태 메시지가 하나만 표시됨

---

# STEP 3: 위치 변경

## TransportTabs 컴포넌트 생성

**파일**: `src/components/map/TransportTabs.tsx` (신규)

**위치**: Header 바로 아래
- `fixed top: calc(48px + env(safe-area-inset-top))`
- z-index: 999

**UI**: `[ 🚶 도보 ] [ 🚗 자동차 ] [ 🚇 대중교통 ]`

**액션**: 기존 `AIOverlayTransportSelect`를 상단 고정으로 변경

---

## 지도 영역 offset 계산

**위치**: `src/pages/GeneralMapPage.tsx`

**계산**:
- 상단: `calc(48px + 44px + env(safe-area-inset-top))`
- 하단: `calc(BottomActionSheet 높이 + env(safe-area-inset-bottom))`

---

## ✅ STEP 3 완료 기준

- [ ] TransportTabs 컴포넌트 생성 및 상단 고정
- [ ] 지도 영역 offset 계산
- [ ] StatusPill 중앙 상단 배치
- [ ] 지도 컨트롤 가려지지 않음 확인

**결과**: 레이아웃이 정리됨

---

# STEP 4: 하단 액션 시트 생성

## 새 컴포넌트: `BottomActionSheet`

**파일**: `src/components/map/BottomActionSheet.tsx` (신규)

**위치**: `fixed bottom-0`
- z-index: 100
- Safe Area: `padding-bottom: env(safe-area-inset-bottom)`

**상태별 UI**:

### 1. 결과 없음 (대기)
- 렌더링 안 함

### 2. 검색 완료 (장소 선택됨)
```tsx
📍 {placeName}
───────────────
[ 여기로 안내할게요 ]
```

### 3. 안내 중
```tsx
🧭 {placeName}까지 안내 중
───────────────
[ 다시 길찾기 ]   [ 취소 ]
```

### 4. 에러
```tsx
지금은 길찾기를 열 수 없어요
───────────────
[ 다시 시도 ]
```

---

## 기존 하단 UI 제거

**제거 대상**:
- `AIOverlayTransportSelect` (하단 → 상단 TransportTabs로 이동)
- `AIOverlayPhase33` (하단 → BottomActionSheet로 통합)
- `AIOverlayPhase37` (하단 → BottomActionSheet로 통합)
- 기타 하단 오버레이

---

## ✅ STEP 4 완료 기준

- [ ] BottomActionSheet 컴포넌트 생성
- [ ] 상태별 하단 UI 구현
- [ ] 기존 하단 UI 제거
- [ ] Safe Area 적용

**결과**: 행동이 항상 하단에 있음

---

# STEP 5: Header 높이 변경

## Header 높이 48px로 변경

**파일**: `src/layout/Header.tsx`

**변경**:
- `HEADER_HEIGHT = 56` → `HEADER_HEIGHT = 48`
- `minHeight: 56px` → `minHeight: 48px`

---

## ✅ STEP 5 완료 기준

- [ ] Header 높이 48px로 변경
- [ ] 관련 offset 계산 업데이트
- [ ] 레이아웃 깨짐 없음 확인

**결과**: Header가 더 얇아짐

---

# 📊 최종 체크리스트

## 삭제 완료

- [ ] StatusHeader 제거
- [ ] map-title 제거
- [ ] ListeningIndicator 제거
- [ ] RecognizedCaption 제거
- [ ] AIWhisper 제거
- [ ] Debug UI 제거

## 통합 완료

- [ ] StatusPill 컴포넌트 생성
- [ ] 상태 UI 단일화

## 위치 변경 완료

- [ ] TransportTabs 상단 고정
- [ ] StatusPill 중앙 상단 배치
- [ ] 지도 영역 offset 계산

## 하단 액션 완료

- [ ] BottomActionSheet 생성
- [ ] 상태별 하단 UI 구현
- [ ] 기존 하단 UI 제거

## Header 변경 완료

- [ ] Header 높이 48px
- [ ] 관련 offset 업데이트

---

# 🚀 실행 순서 (중요)

**반드시 이 순서대로**:

1. STEP 1: 삭제 (가장 먼저)
2. STEP 2: 상태 UI 통합
3. STEP 3: 위치 변경
4. STEP 4: 하단 액션 시트
5. STEP 5: Header 높이

**이유**: 삭제를 먼저 해야 나머지 작업이 명확해짐

---

**생성일**: 2024년  
**대상**: 개발자  
**상태**: 리모델링 실행 계획 완료
