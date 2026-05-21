# 🔥 지도 페이지 StoryZone 통합 가이드

## 📋 현재 상태

### ✅ StoryZone이 있는 곳
- `src/pages/sports/SportHub.tsx` (240줄)
  - `/sports/:type` 경로에서 사용

### ❌ StoryZone이 없는 곳
- `src/components/map/MapPageContainer.tsx`
  - `/app/map` 경로에서 사용
  - **StoryZone 컴포넌트 없음**

---

## 🎯 문제점

### 현재 상황
- 지도 페이지(`/app/map`)에서 `story_impression`, `story_click` 로그가 **트리거되지 않음**
- StoryZone이 없으므로 이벤트 로그가 생성되지 않음

### 사용자 질문
> "지금 콘솔에 `logEvent("story_impression")` 로그 보이니?"

**답변:** 
- ❌ 지도 페이지에서는 안 보임 (StoryZone 없음)
- ✅ SportHub 페이지에서는 보임 (StoryZone 있음)

---

## 🚀 해결 방안

### 옵션 1: 지도 페이지에 StoryZone 추가 (권장)

**위치:** `src/components/map/MapPageContainer.tsx`

**추가 위치:**
- 하단 카드 영역 (PlaceDetailSheet 위 또는 아래)
- 또는 별도 섹션으로 추가

**코드:**
```typescript
import { StoryZone } from "@/components/story/StoryZone";

// MapPageContainer 컴포넌트 내부
{previewPlace && !currentRouteResult?.routes?.[0]?.legs?.[0] && (
  <>
    <PlaceDetailSheet ... />
    
    {/* 🔥 스토리 존 추가 (지역 축구 콘텐츠) */}
    <StoryZone 
      sportType="football" 
      region="seoul" 
      autoPlayMs={0} 
    />
  </>
)}
```

**장점:**
- ✅ 지도 페이지에서도 이벤트 로그 생성
- ✅ 사용자에게 콘텐츠 노출
- ✅ 퍼널 연결 완성

**단점:**
- UI 공간 추가 필요
- 지도 페이지 레이아웃 조정 필요

---

### 옵션 2: 마커 클릭 시 스토리 자동 표시

**개념:**
- 마커 클릭 → 해당 장소 관련 스토리 자동 표시
- StoryZone을 모달/시트로 표시

**코드:**
```typescript
const [showStoryModal, setShowStoryModal] = useState(false);

// 마커 클릭 핸들러
onSelectPlace={(place) => {
  // ... 기존 코드 ...
  
  // 🔥 스토리 모달 표시
  setShowStoryModal(true);
}}

// StoryZone 모달
{showStoryModal && (
  <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50">
    <StoryZone 
      sportType="football" 
      region="seoul" 
      autoPlayMs={0} 
    />
    <button onClick={() => setShowStoryModal(false)}>닫기</button>
  </div>
)}
```

**장점:**
- ✅ 컨텍스트에 맞는 스토리 표시
- ✅ UI 공간 효율적 사용

**단점:**
- 모달/시트 UI 구현 필요
- 사용자 경험 테스트 필요

---

### 옵션 3: 현재 상태 유지 + 다른 이벤트 로그 추가

**개념:**
- StoryZone 없이 지도 페이지 자체 이벤트 로그 추가
- 마커 클릭, 검색, 길찾기 등 이벤트 로깅

**코드:**
```typescript
import { logActivity } from "@/lib/activityLog";

// 마커 클릭 시
onSelectPlace={(place) => {
  logActivity({
    event: "MAP_MARKER_CLICK",
    location: `/app/map`,
    meta: { placeId: place.id, placeName: place.name },
  });
  
  // ... 기존 코드 ...
}}
```

**장점:**
- ✅ 지도 페이지 특화 이벤트 로깅
- ✅ UI 변경 최소화

**단점:**
- ❌ `story_impression`, `story_click` 로그는 여전히 없음
- ❌ 퍼널 연결 불완전

---

## 🎯 추천: 옵션 1 (StoryZone 추가)

### 이유
1. **퍼널 완성**: 지도 → 스토리 → 팀/마켓 연결
2. **일관성**: SportHub와 동일한 UX
3. **데이터 수집**: `story_impression`, `story_click` 로그 생성

---

## 📝 구현 단계

### 1단계: StoryZone import 추가

```typescript
import { StoryZone } from "@/components/story/StoryZone";
```

### 2단계: StoryZone 컴포넌트 추가

**위치:** `MapPageContainer.tsx` return 문 내부

**추가 위치 옵션:**
- A. PlaceDetailSheet 아래 (하단 고정)
- B. 검색 결과 리스트 위 (상단)
- C. 별도 섹션 (스크롤 가능)

### 3단계: 스타일링

```typescript
<div className="w-full">
  <StoryZone 
    sportType="football" 
    region="seoul" 
    autoPlayMs={0} 
    height={220}
  />
</div>
```

### 4단계: 테스트

1. 지도 페이지 접속
2. 콘솔에서 `[STORY_LOG]` 메시지 확인
3. CTA 버튼 클릭 후 `story_click` 로그 확인
4. 관리자 대시보드에서 숫자 증가 확인

---

## 🔍 현재 확인 방법

### 지금 콘솔에서 확인할 수 있는 로그

**지도 페이지 (`/app/map`):**
- ❌ `[STORY_LOG]` 메시지 없음 (StoryZone 없음)
- ✅ 다른 이벤트 로그는 있을 수 있음 (마커 클릭, 검색 등)

**SportHub 페이지 (`/sports/:type`):**
- ✅ `[STORY_LOG]` 메시지 있음 (StoryZone 있음)
- ✅ `story_impression` 로그 확인 가능
- ✅ `story_click` 로그 확인 가능

---

## 💡 다음 단계

### 즉시 확인
1. **SportHub 페이지 접속** (`/sports/football`)
2. **콘솔 확인**: `[STORY_LOG]` 메시지 확인
3. **CTA 버튼 클릭**: `story_click` 로그 확인

### 개선 작업
1. **지도 페이지에 StoryZone 추가** (옵션 1)
2. **이벤트 로그 검증**
3. **퍼널 연결 확인**

---

## ✅ 결론

**현재 상태:**
- ❌ 지도 페이지에 StoryZone 없음
- ✅ SportHub 페이지에 StoryZone 있음
- ❌ 지도 페이지에서 `story_impression`, `story_click` 로그 없음

**해결 방안:**
- ✅ 지도 페이지에 StoryZone 추가 (권장)
- ✅ 또는 마커 클릭 시 스토리 모달 표시

**확인 방법:**
- SportHub 페이지에서 로그 확인 가능
- 지도 페이지는 StoryZone 추가 후 확인 가능
