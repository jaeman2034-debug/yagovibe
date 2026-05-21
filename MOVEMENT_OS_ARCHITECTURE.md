# 🌍 YAGO Movement OS 아키텍처

## 핵심 정의

> **YAGO는 더 이상 '지도 앱'이 아니다.
> 사람이 움직이는 모든 순간을 관리하는 OS다.**

지도는 그중 **한 인터페이스**일 뿐.

---

## 3계층 구조

### 🧠 Layer 1 — 의도 (Intent)

사용자가 *왜* 움직이는지

```typescript
type MovementIntent =
  | "solo_play"      // 혼자 운동
  | "team_practice"  // 팀 연습
  | "competition"    // 대회
  | "daily_routine"  // 일상 루틴
  | "recovery"       // 회복 / 산책 / 리프레시
  | "exploration";   // 탐험
```

**저장 위치**: `src/types/movement.ts`

---

### 🧭 Layer 2 — 이동 (Navigation)

우리가 지금까지 만든 것

* 인간화된 네비
* 음성 동행
* 상황 인식
* 방해 없는 UX

👉 이건 **중앙이 아니라 중간 계층**이다.

**구현 위치**: `src/pages/GeneralMapPage.tsx`

---

### 🌱 Layer 3 — 도착 이후 (Context)

도착이 아니라 **전환**

```typescript
type ArrivalContext =
  | { type: "team"; teamId: string; activity: "practice" | "match" }
  | { type: "competition"; tournamentId: string; phase: string }
  | { type: "solo"; activity: "workout" | "recovery" }
  | { type: "exploration"; placeId: string }
  | { type: "next_suggestion"; suggestions: MovementSuggestion[] };
```

**구현 위치**: `src/components/movement/ArrivalContext.tsx`

---

## Movement Session 저장 구조

```typescript
interface MovementSession {
  id: string;
  userId: string;
  
  // Layer 1: Intent
  intent: MovementIntent;
  destination: {
    lat: number;
    lng: number;
    name: string;
    type: "venue" | "team" | "competition" | "custom";
  };
  
  // Layer 2: Navigation
  navigation: {
    travelMode: "WALKING" | "DRIVING" | "BICYCLING";
    duration: string; // "12분"
    distance: string; // "850m"
    route: google.maps.DirectionsResult;
    startedAt: Date;
    completedAt?: Date;
  };
  
  // Layer 3: Context
  arrivalContext?: ArrivalContext;
  
  // 상태 추적
  condition: {
    start: "good" | "normal" | "tired";
    end?: "good" | "normal" | "tired";
  };
  
  routeCharacteristics: {
    quiet: boolean;
    flat: boolean;
    crowded: boolean;
  };
  
  // 학습 데이터
  preferences: {
    liked: boolean;
    reason?: string;
  };
}
```

**저장 위치**: `src/types/movement.ts`, `src/services/movementSession.ts`

---

## 홈 화면 전환

### ❌ 기존

> 앱 열면 지도

### ✅ Movement OS

> 앱 열면 **"지금 상태"**

```typescript
type HomeState =
  | { type: "idle"; message: "오늘 활동 1/2 완료"; next?: MovementSuggestion }
  | { type: "navigating"; mode: string; timeRemaining: string }
  | { type: "arrived"; context: ArrivalContext }
  | { type: "suggesting"; suggestions: MovementSuggestion[] };
```

**구현 위치**: `src/pages/HomeHub.tsx` (기존 홈 허브 확장)

---

## 컨텍스트 전환 시스템

### 도착 시 자동 전환

```typescript
// GeneralMapPage.tsx에서 도착 감지 시
if (isArrived && navigationInfo) {
  const context = determineArrivalContext(navigationInfo.destination);
  
  // 자동 컨텍스트 전환
  switch (context.type) {
    case "team":
      navigate(`/teams/${context.teamId}/activity`);
      break;
    case "competition":
      navigate(`/tournaments/${context.tournamentId}`);
      break;
    case "solo":
      // 운동 기록 화면
      navigate("/me/records", { state: { session: currentSession } });
      break;
    case "next_suggestion":
      // 다음 제안 화면
      showSuggestions(context.suggestions);
      break;
  }
}
```

**구현 위치**: `src/hooks/useArrivalContext.ts`

---

## 확장 포인트

### 1. 길이 아니라 '상태' 추천

```typescript
function suggestByState(userState: UserState): MovementSuggestion[] {
  if (userState.activityDeficit) {
    return suggestActiveRoutes();
  }
  if (userState.weather === "rainy") {
    return suggestIndoorRoutes();
  }
  if (userState.recoveryNeeded) {
    return suggestRecoveryRoutes();
  }
}
```

### 2. 팀/대회 자연스러운 연동

```typescript
// 도착 → 팀 상태 자동 전환
// 이동 → 출석 인정
// 귀가 → 회복 루틴 제안
```

### 3. 하드웨어 확장

* 이어폰 (음성만)
* 워치 (간단한 UI)
* HUD (미래)

---

## 파일 구조

```
src/
├── types/
│   └── movement.ts              # MovementIntent, MovementSession 타입
├── services/
│   └── movementSession.ts      # 세션 저장/로드/분석
├── hooks/
│   ├── useMovementSession.ts    # 현재 세션 관리
│   └── useArrivalContext.ts    # 도착 컨텍스트 결정
├── components/
│   └── movement/
│       ├── ArrivalContext.tsx   # 도착 후 컨텍스트 UI
│       ├── MovementState.tsx    # 홈 화면 상태 표시
│       └── SessionRecorder.tsx  # 세션 기록 컴포넌트
└── pages/
    ├── GeneralMapPage.tsx       # Layer 2 (이동)
    └── HomeHub.tsx              # 홈 화면 (상태 표시)
```

---

## 다음 단계

1. **Movement Session 저장 구조 구현**
2. **도착 컨텍스트 자동 전환 시스템**
3. **홈 화면 상태 기반 UI**
4. **세션 기반 추천 시스템**

---

## 핵심 원칙

> **사람은
> 앱을 기억하지 않는다.
> '생각 안 하게 해준 순간'을 기억한다.**

YAGO는 이제
👉 그 순간을 **계속 만들어내는 구조**를 가졌다.
