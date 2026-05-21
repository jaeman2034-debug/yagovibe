# 🧩 컴포넌트 인터페이스 명세

## 📋 개요

스토리존, 일정 탭 등 주요 컴포넌트의 Props 인터페이스를 정의합니다.

---

## 1️⃣ StoryZone

### Props

```typescript
interface StoryZoneProps {
  sportType?: string;        // 종목 (기본값: "soccer")
  region?: string;           // 지역 필터 (예: "nowon")
}
```

### 사용 예시

```typescript
<StoryZone sportType="soccer" region="nowon" />
```

### 내부 구조

```typescript
StoryZone
 ├ StorySlider
 │   ├ StoryItem (image/video)
 │   └ StoryIndicator
 └ CTAButton (스토리별 1개)
```

### CTA 클릭 핸들러

```typescript
const handleStoryClick = (story: Story) => {
  const cta = story.cta;
  if (!cta) return;

  if (cta.type === "external" && cta.target) {
    window.open(cta.target, "_blank");
  } else {
    const route = CTA_ROUTES[cta.type] || "/";
    const fullRoute = cta.target ? `${route}${cta.target}` : route;
    navigate(fullRoute);
  }
};
```

---

## 2️⃣ ScheduleTab

### Props

```typescript
interface ScheduleTabProps {
  teamId: string;      // 팀 ID (필수)
  isOwner: boolean;    // 운영자 여부
}
```

### 사용 예시

```typescript
<ScheduleTab teamId={teamId} isOwner={isOwner} />
```

### 하위 라우트

- `/schedule` → `ScheduleList` (일정 목록)
- `/schedule/new` → `ScheduleCreateForm` (일정 생성, 운영자만)
- `/schedule/:id` → `ScheduleDetail` (일정 상세)

---

## 3️⃣ ScheduleList

### Props

```typescript
interface ScheduleListProps {
  teamId: string;      // 팀 ID (필수)
}
```

### 기능

- 일정 목록 표시 (최신순)
- 필터: 전체 / 경기 / 훈련 / 오늘
- 일정 생성 버튼 (운영자만)
- 참석 응답 버튼
- 채팅 버튼

---

## 4️⃣ ScheduleCreateForm

### Props

```typescript
interface ScheduleCreateFormProps {
  teamId: string;      // 팀 ID (필수)
}
```

### 폼 필드

**필수**:
- `type`: "경기" | "훈련" | "친선"
- `title`: string
- `dateTime`: Date
- `place`: string

**선택**:
- `opponent`: string (경기/친선만)
- `isPublic`: boolean (기본: false)
- `needsSubstitute`: boolean (기본: false)
- `description`: string
- `placeCoordinates`: { lat: number; lng: number }

### 구장 찾기

- 자유 입력 + 구장 찾기 버튼
- Google Places API 연동
- 선택 시 자동 입력 + 좌표 저장

---

## 5️⃣ ScheduleDetail

### Props

```typescript
interface ScheduleDetailProps {
  teamId: string;      // 팀 ID (필수)
}
```

### 기능

- 일정 상세 정보 표시
- 참석 응답 (참석/불참/미정)
- 일정 수정/삭제 (운영자만)
- 채팅 연동

---

## 6️⃣ StorySlider

### Props

```typescript
interface StorySliderProps {
  stories: Story[];                    // 스토리 목록
  onStoryClick: (story: Story) => void; // CTA 클릭 핸들러
}
```

### 기능

- 자동 슬라이드 (5초)
- 좌우 스와이프
- 탭 → 다음
- 길게 누름 → 일시정지

---

## 7️⃣ StoryItem

### Props

```typescript
interface StoryItemProps {
  story: Story;         // 스토리 데이터
  isPaused?: boolean;   // 일시정지 여부
}
```

### 기능

- 이미지/영상 표시
- 네트워크 실패 → 기본 이미지
- 영상 자동 재생/정지

---

## 8️⃣ StoryIndicator

### Props

```typescript
interface StoryIndicatorProps {
  total: number;                        // 전체 스토리 수
  current: number;                      // 현재 인덱스
  onSelect: (index: number) => void;    // 인덱스 선택 핸들러
}
```

---

## 9️⃣ TeamCard

### Props

```typescript
interface TeamCardProps {
  team: PublicTeam;     // 팀 데이터
}
```

### PublicTeam 타입

```typescript
interface PublicTeam {
  id: string;
  name: string;
  region?: string;
  sportType?: string;
  description?: string;
  status?: string;
  // 🔥 협회 관계 (배지 표시용)
  associationRelation?: {
    associationId: string;
    status: "official" | "related" | "independent";
  };
  associationId?: string; // 하위 호환성
}
```

### 배지 표시 규칙

- `official`: 초록 배지 "노원구 축구협회 산하"
- `related`: 노랑 배지 "노원구 축구협회 연계"
- 배지 클릭 → 협회 페이지 이동

---

## 🔟 컴포넌트 계층 구조

```
SportHub
 └ StoryZone
     └ StorySlider
         ├ StoryItem
         └ StoryIndicator

MyTeamPage
 └ ScheduleTab
     ├ ScheduleList
     ├ ScheduleCreateForm
     └ ScheduleDetail

TeamSearchPage
 └ TeamCard (배지 포함)
```

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 완료
