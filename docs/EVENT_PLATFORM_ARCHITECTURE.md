# 🎯 생활체육 Event Platform 아키텍처

**생성일**: 2025-01-XX  
**플랫폼 방향**: Event(행사) 중심 플랫폼  
**전략**: 기존 시스템 활용 + Event Layer 추가

---

## 🎯 핵심 인사이트

### 노원구 생활체육 실제 구조

**1년 시즌 = 여러 행사(Event)의 집합**

```
Season (예: 2026)

├ 시무식 (ceremony)
├ 생활체육 팀 토너먼트 (tournament)
├ 협회장기 대회 (tournament)
├ 구청장기 대회 (tournament)
├ 스폰서 대회 A (tournament)
├ 스폰서 대회 B (tournament)
├ 유소년 아카데미 대회 (academy)
├ K7 대회 (league/tournament)
└ 종무식 (ceremony)
```

**핵심**: **모든 것이 Event**

---

## 📊 플랫폼 최종 구조

### Event 중심 구조

```
Season (시즌)
   ↓
Event (행사)
   ↓
Event Division / Category (부문/카테고리)
   ↓
Event Teams (참가 팀)
   ↓
Event Matches (경기)
   ↓
team_games (경기 기록)
   ↓
teams.stats (통계)
   ↓
Ranking (랭킹)
```

---

## 🔥 Firestore 데이터 모델

### 1. events 컬렉션

**경로**: `events/{eventId}`

```typescript
interface Event {
  id: string;
  
  // 기본 정보
  name: string;                    // "노원구 협회장기 축구대회"
  type: EventType;                 // "tournament" | "league" | "ceremony" | "academy" | "festival"
  sportType: string;               // "football" | "futsal"
  
  // 지역/시즌
  regionCode: string;              // "KR_SEOUL_NOWON"
  seasonId: string;                 // "2026"
  
  // 주최/주관
  organizer: string;                // "노원구축구협회"
  organizerId?: string;             // 협회 ID (선택적)
  sponsor?: string | null;          // 스폰서 (선택적)
  
  // 일정
  startDate: Timestamp;
  endDate: Timestamp;
  
  // 상태
  status: "scheduled" | "registration" | "active" | "completed" | "cancelled";
  
  // 설명
  description?: string;
  
  // 메타데이터
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**Event Type 정의**:
```typescript
type EventType =
  | "ceremony"      // 시무식, 종무식
  | "tournament"    // 토너먼트 (협회장기, 구청장기, 스폰서컵)
  | "league"        // 리그 (K7 등)
  | "academy"       // 유소년 아카데미
  | "festival";      // 축제
```

---

### 2. event_teams 컬렉션

**경로**: `event_teams/{id}`

```typescript
interface EventTeam {
  id: string;                      // {eventId}_{teamId}
  eventId: string;
  teamId: string;
  teamName: string;                // denormalized
  
  // 부문/카테고리
  division?: string;                // "U12", "Division A" 등
  category?: string;                // "성인", "유소년" 등
  
  // 참가 정보
  joinedAt: Timestamp;
  status: "registered" | "confirmed" | "withdrawn";
  
  // 메타데이터
  createdAt: Timestamp;
}
```

---

### 3. event_matches 컬렉션

**경로**: `event_matches/{matchId}`

```typescript
interface EventMatch {
  id: string;
  eventId: string;
  
  // 경기 정보
  round: string;                   // "16강", "8강", "4강", "결승", "조별리그"
  division?: string;                // 부문 (U12 등)
  
  // 팀 정보
  homeTeamId: string;
  homeTeamName: string;            // denormalized
  awayTeamId: string;
  awayTeamName: string;            // denormalized
  
  // 일정/장소
  scheduledAt: Timestamp;
  location?: string;
  address?: string;
  
  // 결과
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string | null;
  
  // 상태
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 4. event_schedule 컬렉션

**경로**: `event_schedule/{id}`

```typescript
interface EventSchedule {
  id: string;                      // {eventId}_{date}
  eventId: string;
  
  // 일정
  date: Timestamp;                 // 날짜 (시간 제외)
  location: string;                // 장소
  address?: string;
  
  // 경기 목록
  matchIds: string[];              // event_matches ID 목록
  
  // 메타데이터
  createdAt: Timestamp;
}
```

---

### 5. event_divisions 컬렉션 (선택적)

**경로**: `events/{eventId}/divisions/{divisionId}`

```typescript
interface EventDivision {
  id: string;
  eventId: string;
  
  // 부문 정보
  name: string;                    // "U12", "Division A"
  category?: string;                // "유소년", "성인"
  
  // 참가 팀 수
  teamCount: number;
  
  // 메타데이터
  createdAt: Timestamp;
}
```

---

## 🔄 기존 시스템과의 연결

### team_games와의 연결

**핵심**: Event Match → team_games 자동 생성

```typescript
// event_matches 완료 시
event_matches/{matchId}
  status: "completed"
  ↓
Cloud Function: onEventMatchCompleted
  ↓
team_games 생성
  {
    sourceType: "event",
    sourceId: eventMatchId,
    eventId: eventId,
    // ... 기존 team_games 필드
  }
  ↓
teams.stats 자동 업데이트
```

---

## 🎮 Event Type별 구조

### 1. Ceremony (시무식/종무식)

```typescript
{
  type: "ceremony",
  name: "2026 시무식",
  // event_matches 없음 (행사만)
}
```

---

### 2. Tournament (토너먼트)

```typescript
{
  type: "tournament",
  name: "노원구 협회장기 축구대회",
  
  // event_matches
  matches: [
    { round: "16강", ... },
    { round: "8강", ... },
    { round: "4강", ... },
    { round: "결승", ... }
  ]
}
```

---

### 3. League (리그)

```typescript
{
  type: "league",
  name: "노원구 K7 리그",
  
  // event_matches
  matches: [
    { round: "조별리그", ... },
    { round: "플레이오프", ... }
  ]
}
```

---

### 4. Academy (유소년 아카데미)

```typescript
{
  type: "academy",
  name: "노원구 유소년 아카데미 대회",
  
  // event_divisions
  divisions: [
    { name: "U8" },
    { name: "U10" },
    { name: "U12" },
    { name: "U15" }
  ],
  
  // event_matches (부문별)
  matches: [
    { division: "U12", round: "결승", ... }
  ]
}
```

---

## 📅 Event Schedule 시스템

### 일정 관리

```typescript
// 이벤트 일정 조회
event_schedule
  where eventId == "협회장기"
  order by date asc

// 결과
[
  {
    date: "2026-05-10",
    location: "노원구민체육센터",
    matches: ["match1", "match2", "match3"]
  },
  {
    date: "2026-05-17",
    location: "노원구민체육센터",
    matches: ["match4", "match5"]
  }
]
```

---

## 🏗️ 실제 노원구 행사 구조 적용

### 2026 Season 예시

```typescript
// Season
seasons/2026
{
  name: "2026 시즌",
  sportType: "football",
  startDate: "2026-01-01",
  endDate: "2026-12-31"
}

// Events
events/event1
{
  name: "2026 시무식",
  type: "ceremony",
  seasonId: "2026",
  regionCode: "KR_SEOUL_NOWON",
  organizer: "노원구축구협회"
}

events/event2
{
  name: "노원구 협회장기 축구대회",
  type: "tournament",
  seasonId: "2026",
  regionCode: "KR_SEOUL_NOWON",
  organizer: "노원구축구협회",
  startDate: "2026-05-10",
  endDate: "2026-05-24"
}

events/event3
{
  name: "노원구 구청장기 축구대회",
  type: "tournament",
  seasonId: "2026",
  regionCode: "KR_SEOUL_NOWON",
  organizer: "노원구청",
  startDate: "2026-07-15",
  endDate: "2026-07-29"
}

events/event4
{
  name: "노원구 유소년 아카데미 대회",
  type: "academy",
  seasonId: "2026",
  regionCode: "KR_SEOUL_NOWON",
  organizer: "노원구축구협회",
  divisions: ["U8", "U10", "U12", "U15"]
}

events/event5
{
  name: "노원구 K7 리그",
  type: "league",
  seasonId: "2026",
  regionCode: "KR_SEOUL_NOWON",
  organizer: "노원구축구협회",
  startDate: "2026-09-01",
  endDate: "2026-11-30"
}

events/event6
{
  name: "2026 종무식",
  type: "ceremony",
  seasonId: "2026",
  regionCode: "KR_SEOUL_NOWON",
  organizer: "노원구축구협회"
}
```

---

## 🔧 Cloud Functions

### onEventMatchCompleted

**트리거**: `event_matches/{matchId}` onUpdate

**역할**: Event Match 완료 시 team_games 자동 생성

```typescript
export const onEventMatchCompleted = functions.firestore
  .document("event_matches/{matchId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // completed 상태로 변경된 경우만 처리
    if (before.status !== "completed" && after.status === "completed") {
      const { eventId, homeTeamId, awayTeamId, homeScore, awayScore, scheduledAt } = after;
      
      // team_games 생성
      await createTeamGameFromEventMatch({
        eventId,
        eventMatchId: context.params.matchId,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
        scheduledAt,
        sourceType: "event",
        sourceId: context.params.matchId
      });
    }
  });
```

---

## 📊 플랫폼 역할

### 운영자

- **협회**: 행사 생성/관리
- **구청**: 행사 생성/관리
- **대회 운영자**: 행사 생성/관리

### 사용자

- **팀**: 행사 참가 신청
- **선수**: 행사 참가

---

## 🚀 확장 가능성

### 지역 확장

```
노원구 (KR_SEOUL_NOWON)
   ↓
서울 전체
   ↓
수도권
   ↓
전국
```

### 조직 확장

```
노원구축구협회
   ↓
서울 축구 협회
   ↓
경기도 풋살 협회
   ↓
대한민국 생활체육
```

---

## 📝 구현 우선순위

### Phase 1: Event 기본 구조
1. ⭐ **events 컬렉션 타입 정의**
2. **event_teams 컬렉션**
3. **event_matches 컬렉션**
4. **event_schedule 컬렉션**

### Phase 2: 기존 시스템 연동
1. **onEventMatchCompleted Cloud Function**
2. **event_matches → team_games 자동 생성**
3. **Event Match 완료 시 통계 업데이트**

### Phase 3: UI 구현
1. **Event 목록 페이지**
2. **Event 상세 페이지**
3. **Event 참가 신청**
4. **Event 일정 페이지**

---

## 🎯 핵심 포인트

### 기존 시스템 활용

**이미 있는 것**:
- ✅ Team System
- ✅ Match System
- ✅ Stats System
- ✅ Ranking System
- ✅ League System
- ✅ Tournament System

**추가할 것**:
- ⭐ **Event Layer** (events, event_teams, event_matches, event_schedule)

**결과**: 기존 시스템을 거의 그대로 활용하면서 Event 중심 플랫폼 완성

---

## 📝 참고 문서

- `docs/PLATFORM_ROADMAP.md` - 플랫폼 로드맵
- `docs/FOOTBALL_FUTSAL_ARCHITECTURE.md` - 축구/풋살 아키텍처
- `docs/NATIONWIDE_EXPANSION_ARCHITECTURE.md` - 전국 확장 아키텍처

---

## 🎉 평가

**현재 플랫폼 구조**: **Sports Platform Core Engine**

**Event Platform 전환**: ✅ **기존 시스템 활용 가능**

**다음 단계**: Event Layer 추가

이 구조가 완성되면 **생활체육 Event Platform**이 됩니다. ⚽
