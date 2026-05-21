# 🧠 지도 페이지 UI 리모델링 - 실제 파일/컴포넌트 분리 목록

**목적**: 상태 머신 중심 UI 리모델링  
**대상**: 개발자  
**상태**: 리모델링 실행 중

---

## 🎯 핵심 원칙

> **UI는 오직 3개의 상태 값만 본다**
> 그 외 컴포넌트는 말할 권한이 없음

---

# 1️⃣ 상태 머신 (UI 독재자)

## 새 파일: `src/hooks/useMapUI.ts`

**역할**: UI 상태 통제 (유일한 진실의 원천)

```typescript
export type MapUIState =
  | 'idle'        // 아무것도 안 함
  | 'loading'     // 찾는 중
  | 'voice'       // 말해도 됨
  | 'result'      // 장소 선택됨
  | 'navigating'  // 안내 중
  | 'error';

export const useMapUI = () => {
  const [ui, setUI] = useState<MapUIState>('idle');
  return { ui, setUI };
};
```

**사용 위치**: `GeneralMapPage.tsx` (최상위)

---

# 2️⃣ 상태 UI (유일한 지도 위 UI)

## 기존 파일 수정: `src/components/map/StatusPill.tsx`

**역할**: MapUIState에 종속된 유일한 상태 UI

**수정 사항**:
- `type` prop을 `MapUIState`로 변경
- `loading`, `voice`, `error`만 처리
- `result`, `navigating`은 하단으로 이동

---

# 3️⃣ 상단 기능 영역

## 새 파일: `src/components/map/TransportTabs.tsx`

**역할**: 교통수단 선택 (상단 고정)

**위치**: Header 바로 아래
- `fixed top: calc(48px + env(safe-area-inset-top))`
- z-index: 999

**UI**:
```
[ 🚶 도보 ] [ 🚗 자동차 ] [ 🚇 대중교통 ]
```

**Props**:
```typescript
interface TransportTabsProps {
  currentMode?: 'WALKING' | 'DRIVING' | 'BICYCLING';
  onSelect: (mode: 'WALKING' | 'DRIVING' | 'BICYCLING') => void;
}
```

---

# 4️⃣ 하단 액션 시트

## 새 파일: `src/components/map/BottomActionSheet.tsx`

**역할**: 행동 (엄지 UX)

**위치**: `fixed bottom-0`
- z-index: 100
- Safe Area: `padding-bottom: env(safe-area-inset-bottom)`

**Props**:
```typescript
interface BottomActionSheetProps {
  ui: MapUIState;
  place?: { name: string; id: string };
  onNavigate?: () => void;
  onReopenRoute?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}
```

**상태별 UI**:
- `idle`: null (렌더링 안 함)
- `loading`: null (상태 pill만 표시)
- `voice`: null (상태 pill만 표시)
- `result`: 장소명 + "여기로 안내할게요" 버튼
- `navigating`: "안내 중" + "다시 길찾기" + "취소" 버튼
- `error`: 에러 메시지 + "다시 시도" 버튼

---

# 5️⃣ 제거 대상 컴포넌트/코드

## 완전 제거

### `src/pages/GeneralMapPage.tsx`에서 제거:

1. **StatusHeader 사용** (5005-5035줄)
   - 전체 블록 삭제

2. **map-title div** (5044-5059줄)
   - 전체 블록 삭제

3. **ListeningIndicator** (5064-5080줄)
   - 전체 블록 삭제

4. **RecognizedCaption** (5082-5098줄)
   - 전체 블록 삭제

5. **AIWhisper** (5061-5062줄)
   - 전체 블록 삭제

6. **AIOverlayIntent** (5020-5022줄)
   - 전체 블록 삭제

7. **AIOverlaySummary** (5025-5030줄)
   - 전체 블록 삭제

8. **AIOverlayProactive** (5033-5038줄)
   - 전체 블록 삭제

9. **AIOverlaySilent** (5041-5043줄)
   - 전체 블록 삭제

10. **AIOverlayTransportSelect** (하단 → 상단 TransportTabs로 이동)
    - 컴포넌트는 유지하되, 하단 렌더링 제거

11. **AIOverlayPhase33** (하단 → BottomActionSheet로 통합)
    - 컴포넌트는 유지하되, 하단 렌더링 제거

12. **AIOverlayPhase37** (하단 → BottomActionSheet로 통합)
    - 컴포넌트는 유지하되, 하단 렌더링 제거

---

## 환경 분기 적용 (제거 아님)

### Debug UI

**검색**: `process.env.NODE_ENV`, `debug`, `Debug`

**액션**: 모든 Debug UI에 환경 분기 추가

```tsx
{process.env.NODE_ENV === 'development' && <DebugUI />}
```

---

# 6️⃣ 파일 구조 (최종)

```
src/
├── hooks/
│   └── useMapUI.ts                    (신규) ← UI 상태 머신
├── components/
│   └── map/
│       ├── StatusPill.tsx             (수정) ← 상태 UI (지도 위)
│       ├── TransportTabs.tsx         (신규) ← 상단 기능
│       └── BottomActionSheet.tsx     (신규) ← 하단 행동
└── pages/
    └── GeneralMapPage.tsx            (대폭 수정) ← 상태 머신 적용
```

---

# 7️⃣ 상태 전환 타이밍 (코드 위치)

## `GeneralMapPage.tsx`에서 상태 전환

### 마커 클릭
```tsx
const handleMarkerSelect = (place) => {
  setUI('loading');  // ← 즉시
  // 검색 로직...
};
```

### 검색 완료
```tsx
const handleSearchComplete = (results) => {
  setUI('result');  // ← 즉시
  // 결과 표시...
};
```

### 음성 대기
```tsx
const handleVoiceReady = () => {
  setUI('voice');  // ← 즉시
};
```

### 길찾기 클릭
```tsx
const handleNavigate = () => {
  setUI('navigating');  // ← 즉시
  // Google Maps 열기...
};
```

### 실패
```tsx
const handleError = () => {
  setUI('error');  // ← 즉시
};
```

---

# 8️⃣ 컴포넌트 의존성 제거

## ❌ 금지 규칙

- 컴포넌트가 직접 UI를 띄우는 행위 ❌
- 여러 컴포넌트가 동시에 상태 UI 표시 ❌
- Debug UI가 운영 UI와 공존 ❌

## ✅ 허용 규칙

- 오직 `setUI`만 호출 ⭕
- StatusPill만 지도 위에 표시 ⭕
- BottomActionSheet만 하단에 표시 ⭕

---

# 9️⃣ 실행 순서 (중요)

## Phase 1: 상태 머신 생성

1. `src/hooks/useMapUI.ts` 생성
2. `GeneralMapPage.tsx`에 `useMapUI` 적용
3. 상태 전환 로직 추가

## Phase 2: 제거

1. StatusHeader 제거
2. map-title 제거
3. ListeningIndicator 제거
4. RecognizedCaption 제거
5. AIWhisper 제거
6. AIOverlayIntent/Summary/Proactive/Silent 제거

## Phase 3: 통합

1. StatusPill 수정 (MapUIState 사용)
2. TransportTabs 생성 및 상단 고정
3. BottomActionSheet 생성 및 하단 고정

## Phase 4: 상태 전환 연결

1. 모든 이벤트 핸들러에 `setUI` 추가
2. 상태별 UI 렌더링 확인

---

# 🔟 최종 체크리스트

## 상태 머신

- [ ] `useMapUI` 훅 생성
- [ ] `GeneralMapPage`에 적용
- [ ] 상태 전환 로직 추가

## 제거

- [ ] StatusHeader 제거
- [ ] map-title 제거
- [ ] ListeningIndicator 제거
- [ ] RecognizedCaption 제거
- [ ] AIWhisper 제거
- [ ] AIOverlayIntent/Summary/Proactive/Silent 제거

## 통합

- [ ] StatusPill 수정 (MapUIState 사용)
- [ ] TransportTabs 생성 및 상단 고정
- [ ] BottomActionSheet 생성 및 하단 고정

## 상태 전환

- [ ] 마커 클릭 → `setUI('loading')`
- [ ] 검색 완료 → `setUI('result')`
- [ ] 음성 대기 → `setUI('voice')`
- [ ] 길찾기 클릭 → `setUI('navigating')`
- [ ] 실패 → `setUI('error')`

---

**생성일**: 2024년  
**대상**: 개발자  
**상태**: 리모델링 실행 계획 완료
