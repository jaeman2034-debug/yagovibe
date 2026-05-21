# 🧱 YAGO 개발 태스크 분해 (Figma 기준)

> 2주 스프린트 기준, 바로 개발 시작 가능한 백로그

---

## 🎯 전제

* MVP 범위
* 러닝 크루 1개 시나리오
* 설정 화면 ❌
* 회원가입 최소화 (토큰 or 익명 OK)

---

# 1️⃣ 프론트엔드 태스크 (FE)

> 목표: **"상태 전환이 자연스럽게 보이는 OS UI"**

---

## FE-1. 앱 기본 구조 세팅

**Priority:** P0 (Critical)  
**Estimate:** 4h  
**Sprint:** Week 1

### Task

* Mobile 기준 레이아웃 (390 × 844)
* Safe Area 대응 (iOS notch, Android gesture bar)
* Status Bar / Bottom Bar 고정
* 헤더 높이 상수 정의

### Deliverable

```
src/layout/
├── AppShell.tsx
├── HomeLayout.tsx
└── constants.ts
```

### Acceptance Criteria

- [ ] iOS Safe Area 적용
- [ ] Android Safe Area 적용
- [ ] 헤더/바텀바 고정
- [ ] 화면 회전 대응 (Portrait only)

### Dependencies

None

---

## FE-2. StatusHeader 컴포넌트

**Priority:** P0 (Critical)  
**Estimate:** 3h  
**Sprint:** Week 1

### Task

* Figma `StatusHeader` 그대로 구현
* Variant 처리 (Idle / Navigating / Arrived)
* Gradient 배경 적용

### Props

```typescript
interface StatusHeaderProps {
  variant: "idle" | "navigating" | "upcoming" | "arrived";
  title: string;
  subtitle?: string;
}
```

### Deliverable

```
src/components/movement/StatusHeader.tsx
```

### Acceptance Criteria

- [ ] 4개 Variant 모두 구현
- [ ] Gradient 배경 정확히 매칭
- [ ] 텍스트 길이 대응 (Ellipsis)
- [ ] Figma 디자인 100% 일치

### Dependencies

FE-1 (AppShell)

---

## FE-3. MapContainer 컴포넌트

**Priority:** P0 (Critical)  
**Estimate:** 6h  
**Sprint:** Week 1

### Task

* 지도 SDK 연동 (Google Maps / Kakao Map)
* 사용자 위치 점 표시
* UI 오버레이 금지 (지도 위에 UI 올리지 않음)
* 지도는 상태에 반응하지 않음 (표시/숨김만)

### Deliverable

```
src/components/map/
├── MapContainer.tsx
├── GoogleMapCanvas.tsx
└── UserLocationDot.tsx
```

### Acceptance Criteria

- [ ] 지도 로딩 성공
- [ ] 사용자 위치 표시 (파란 점)
- [ ] 지도 위 UI 오버레이 없음
- [ ] 줌/드래그 정상 작동
- [ ] 지도 숨김/표시 토글 가능

### Dependencies

FE-1 (AppShell)

### Notes

* 지도 SDK는 프로젝트 기존 설정 사용
* 초기엔 정적 지도만 (경로 표시는 FE-7에서)

---

## FE-4. StateBar 컴포넌트

**Priority:** P0 (Critical)  
**Estimate:** 2h  
**Sprint:** Week 1

### Task

* 하단 고정
* 터치 이벤트 없음 (버튼 아님)
* 상태 표시만
* Variant 처리

### Props

```typescript
interface StateBarProps {
  variant: "idle" | "listening" | "navigating";
}
```

### Deliverable

```
src/components/movement/StateBar.tsx
```

### Acceptance Criteria

- [ ] 3개 Variant 모두 구현
- [ ] 터치 이벤트 없음 (pointer-events: none)
- [ ] 하단 고정 (position: fixed)
- [ ] Figma 디자인 100% 일치

### Dependencies

FE-1 (AppShell)

---

## FE-5. ActionCue 컴포넌트

**Priority:** P1 (High)  
**Estimate:** 3h  
**Sprint:** Week 2

### Task

* 네비게이션 중 하단 액션 표시
* 단일 행동만 표시 (다음 단계 표시 금지)
* 아이콘 + 텍스트 + 거리

### Props

```typescript
interface ActionCueProps {
  direction: "straight" | "left" | "right" | "uturn";
  instruction: string;
  distance: string;
}
```

### Deliverable

```
src/components/movement/ActionCue.tsx
```

### Acceptance Criteria

- [ ] 4개 방향 Variant 구현
- [ ] 하단 96px 위치 (BottomNav 위)
- [ ] 텍스트 길이 대응 (20자 제한)
- [ ] 네비게이션 중에만 표시

### Dependencies

FE-3 (MapContainer), FE-7 (상태 전환)

---

## FE-6. ArrivalPanel 화면

**Priority:** P1 (High)  
**Estimate:** 4h  
**Sprint:** Week 2

### Task

* 지도 완전 제거 (Display: none)
* 버튼 3개 배치 (Primary / Secondary / Ghost)
* 이후 플로우는 stub (navigate만)

### Deliverable

```
src/components/movement/ArrivalPanel.tsx
```

### Acceptance Criteria

- [ ] 지도 숨김 (z-index: 50)
- [ ] 버튼 3개 정확히 배치
- [ ] 클릭 시 navigate (stub)
- [ ] Figma 디자인 100% 일치

### Dependencies

FE-7 (상태 전환)

---

## FE-7. 상태 전환 로직 (중요)

**Priority:** P0 (Critical)  
**Estimate:** 8h  
**Sprint:** Week 1-2

### Task

* 화면 전환 ❌
* **상태 변경만** (컴포넌트 교체)
* 애니메이션 최소 (fade 정도만)

### 상태 머신

```
Idle → Listening → Navigating → Arrived
```

### Deliverable

```
src/pages/GeneralMapPage.tsx
src/hooks/useMovementState.ts
```

### State Management

```typescript
type MovementState = 
  | { type: "idle" }
  | { type: "listening" }
  | { type: "navigating"; destination: Location }
  | { type: "arrived"; destination: Location };
```

### Acceptance Criteria

- [ ] Idle → Listening 전환 (Auto / 3s)
- [ ] Listening → Navigating 전환 (Voice Trigger)
- [ ] Navigating → Arrived 전환 (Distance < 20m)
- [ ] Arrived → Idle 전환 (Button Click)
- [ ] 애니메이션 부드러움 (fade 300ms)

### Dependencies

FE-2, FE-3, FE-4, FE-5, FE-6

---

## FE-8. 음성 입력 UI 연결 (Stub)

**Priority:** P2 (Medium)  
**Estimate:** 4h  
**Sprint:** Week 2

### Task

* 실제 음성 인식 ❌ (초기엔 mock)
* Listening 상태 진입 트리거만 구현
* 버튼 클릭 or 자동 시작

### Deliverable

```
src/hooks/useVoiceInput.ts (Stub)
```

### Acceptance Criteria

- [ ] Listening 상태 진입 가능
- [ ] Mock 응답으로 Navigating 전환
- [ ] 실제 음성 인식은 Phase 2

### Dependencies

FE-7 (상태 전환)

---

# 2️⃣ 백엔드 태스크 (BE)

> 목표: **"사용자 입력 없이도 상태를 추론"**

---

## BE-1. 사용자 세션 모델

**Priority:** P0 (Critical)  
**Estimate:** 3h  
**Sprint:** Week 1

### Task

* MovementSession 엔티티 정의
* Firestore 컬렉션 구조 설계

### Entity

```typescript
interface MovementSession {
  id: string;
  userId: string;
  intent: "running" | "solo" | "team";
  status: "idle" | "listening" | "navigating" | "arrived";
  startedAt: Timestamp;
  updatedAt: Timestamp;
  destination?: {
    lat: number;
    lng: number;
    name: string;
  };
}
```

### Deliverable

```
functions/src/models/MovementSession.ts
functions/src/firestore/schemas.ts
```

### Acceptance Criteria

- [ ] Firestore 컬렉션 생성
- [ ] 타입 정의 완료
- [ ] 인덱스 설정 (userId, status)

### Dependencies

None

---

## BE-2. 러닝 크루 모델 (MVP)

**Priority:** P0 (Critical)  
**Estimate:** 2h  
**Sprint:** Week 1

### Task

* RunningCrew 엔티티 정의
* 크루 1개만 하드코딩 가능 (초기)

### Entity

```typescript
interface RunningCrew {
  id: string;
  name: string;
  meetupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  meetupTime: string; // "19:00"
  daysOfWeek: number[]; // [1, 3, 5] = 월수금
}
```

### Deliverable

```
functions/src/models/RunningCrew.ts
functions/src/data/mockCrew.ts (하드코딩)
```

### Acceptance Criteria

- [ ] Firestore 컬렉션 생성
- [ ] Mock 데이터 1개 생성
- [ ] 타입 정의 완료

### Dependencies

None

---

## BE-3. 상태 추론 API

**Priority:** P0 (Critical)  
**Estimate:** 6h  
**Sprint:** Week 1

### Task

* 현재 시간 / 위치 / 크루 시간 근접 여부로 상태 추론
* 사용자 입력 없이 상태 반환

### Endpoint

```
GET /api/movement/status
```

### Request

```typescript
{
  userId: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}
```

### Response

```typescript
{
  status: "idle" | "upcoming" | "navigating" | "arrived";
  message: string;
  timeRemaining?: string; // "42분"
  crewName?: string;
}
```

### Logic

1. 현재 시간 확인
2. 오늘 크루 모임 시간 확인
3. 시간 차이 계산
4. 상태 결정:
   - 60분 이내 → "upcoming"
   - 10분 이내 → "navigating" (자동 시작)
   - 그 외 → "idle"

### Deliverable

```
functions/src/api/getMovementStatus.ts
```

### Acceptance Criteria

- [ ] 시간 기반 상태 추론 정확
- [ ] 크루 정보 조회 성공
- [ ] 에러 핸들링 (크루 없음 등)

### Dependencies

BE-1, BE-2

---

## BE-4. 네비게이션 상태 API (Stub)

**Priority:** P1 (High)  
**Estimate:** 4h  
**Sprint:** Week 2

### Task

* 네비게이션 시작/도착 상태 변경
* 실제 경로 계산 ❌ (초기엔 stub)
* 상태만 변경

### Endpoints

```
POST /api/movement/start
POST /api/movement/arrive
```

### Request (Start)

```typescript
{
  userId: string;
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
}
```

### Request (Arrive)

```typescript
{
  userId: string;
  sessionId: string;
}
```

### Deliverable

```
functions/src/api/startNavigation.ts
functions/src/api/arriveNavigation.ts
```

### Acceptance Criteria

- [ ] MovementSession 상태 업데이트
- [ ] Firestore 업데이트 성공
- [ ] 실제 경로 계산은 Phase 2

### Dependencies

BE-1, BE-3

---

## BE-5. 출석 처리 로직

**Priority:** P1 (High)  
**Estimate:** 4h  
**Sprint:** Week 2

### Task

* Arrived 상태 + 시간 ±10분 조건으로 출석 처리
* RunningCrew 출석 기록

### Endpoint

```
POST /api/crew/attendance
```

### Request

```typescript
{
  userId: string;
  crewId: string;
  arrivedAt: Timestamp;
}
```

### Logic

1. Arrived 상태 확인
2. 크루 모임 시간 확인
3. ±10분 범위 내인지 확인
4. 출석 기록 생성

### Deliverable

```
functions/src/api/checkInToCrew.ts
functions/src/models/Attendance.ts
```

### Acceptance Criteria

- [ ] 시간 범위 검증 정확
- [ ] 중복 출석 방지
- [ ] 출석 기록 생성 성공

### Dependencies

BE-2, BE-4

---

## BE-6. 음성 의도 해석 (Phase 2 Stub)

**Priority:** P2 (Medium)  
**Estimate:** 2h  
**Sprint:** Week 2 (Stub만)

### Task

* 초기엔 하드코딩
* 이후 LLM 연동 (Phase 2)

### Endpoint

```
POST /api/voice/intent
```

### Request

```typescript
{
  text: string;
  userId: string;
}
```

### Response (Stub)

```typescript
{
  intent: "change_route" | "find_place" | "navigate";
  confidence: number;
}
```

### Deliverable

```
functions/src/api/parseVoiceIntent.ts (Stub)
```

### Acceptance Criteria

- [ ] Stub 응답 반환
- [ ] 타입 정의 완료
- [ ] LLM 연동은 Phase 2

### Dependencies

None (Stub)

---

# 3️⃣ 공통 / 인프라

---

## C-1. 상태 머신 정의 (문서)

**Priority:** P0 (Critical)  
**Estimate:** 2h  
**Sprint:** Week 1 (초반)

### Task

* 상태 다이어그램 작성
* FE/BE 공유 문서
* 전환 조건 명확화

### 상태 다이어그램

```
[Idle]
  ↓ (Auto / 3s or Voice Start)
[Listening]
  ↓ (Voice Command)
[Navigating]
  ↓ (Distance < 20m)
[Arrived]
  ↓ (Button Click)
[Idle]
```

### Deliverable

```
docs/STATE_MACHINE.md
docs/STATE_TRANSITIONS.md
```

### Acceptance Criteria

- [ ] 상태 다이어그램 완성
- [ ] 전환 조건 명확
- [ ] FE/BE 팀 공유 완료

### Dependencies

None

---

## C-2. Feature Flag

**Priority:** P1 (High)  
**Estimate:** 3h  
**Sprint:** Week 1

### Task

* ArrivalPanel ON/OFF
* Voice ON/OFF
* 테스트 안정성 확보

### Flags

```typescript
const FEATURE_FLAGS = {
  ARRIVAL_PANEL: true,
  VOICE_INPUT: false, // Phase 2
  AUTO_NAVIGATION: true,
};
```

### Deliverable

```
src/config/featureFlags.ts
functions/src/config/featureFlags.ts
```

### Acceptance Criteria

- [ ] Feature Flag 시스템 구축
- [ ] 런타임 토글 가능
- [ ] 환경변수 연동

### Dependencies

None

---

## C-3. 로그 수집 (중요)

**Priority:** P0 (Critical)  
**Estimate:** 4h  
**Sprint:** Week 2

### Task

* DAU ❌
* **행동 흐름만** 수집
* 상태 전환 이벤트 추적

### 수집할 이벤트

```typescript
type MovementEvent =
  | { type: "state_transition"; from: State; to: State }
  | { type: "arrival_button_click"; button: "primary" | "secondary" | "ghost" }
  | { type: "navigation_started"; destination: string }
  | { type: "navigation_completed"; duration: number };
```

### Deliverable

```
src/utils/analytics.ts
functions/src/utils/logMovementEvent.ts
```

### Acceptance Criteria

- [ ] 상태 전환 이벤트 수집
- [ ] Arrival 버튼 클릭 수집
- [ ] 네비게이션 완료율 수집
- [ ] Firestore / Analytics 연동

### Dependencies

FE-7, BE-4

---

# 🗓️ 2주 MVP 스프린트 예시

## Week 1 (Foundation)

### Day 1-2
- [ ] FE-1: 앱 기본 구조
- [ ] FE-2: StatusHeader
- [ ] FE-3: MapContainer
- [ ] C-1: 상태 머신 문서

### Day 3-4
- [ ] FE-4: StateBar
- [ ] FE-7: 상태 전환 로직 (기본)
- [ ] BE-1: 세션 모델
- [ ] BE-2: 크루 모델

### Day 5
- [ ] BE-3: 상태 추론 API
- [ ] FE-7: 상태 전환 완성
- [ ] C-2: Feature Flag

---

## Week 2 (Completion)

### Day 1-2
- [ ] FE-5: ActionCue
- [ ] FE-6: ArrivalPanel
- [ ] BE-4: 네비게이션 API

### Day 3-4
- [ ] BE-5: 출석 처리
- [ ] FE-8: 음성 입력 (Stub)
- [ ] C-3: 로그 수집

### Day 5
- [ ] 통합 테스트
- [ ] 버그 수정
- [ ] 배포 준비

---

## 🧠 이 분해의 핵심

> **지도 개발이 아니라
> "상태 전환 시스템"을 만든다**

그래서:

* 복잡한 네비 ❌
* 정밀 추천 ❌
* 정확도 경쟁 ❌

👉 **편안함 경쟁**

---

## 📊 우선순위 요약

### P0 (Critical) - Week 1
- FE-1, FE-2, FE-3, FE-4, FE-7
- BE-1, BE-2, BE-3
- C-1, C-3

### P1 (High) - Week 2
- FE-5, FE-6
- BE-4, BE-5

### P2 (Medium) - Phase 2
- FE-8 (Stub)
- BE-6 (Stub)

---

## 🚀 다음 단계

이제 바로 갈 수 있는 건:

1️⃣ **이 태스크를 Jira/Notion 티켓으로 써줄까**
2️⃣ **FE 기준 기술 스택 추천 (React Native / Flutter 등)**
3️⃣ **이 MVP로 실제 러닝 크루 테스트 운영 계획 짜줄까**

번호 하나.
이제 **출시 직전 단계**다.
