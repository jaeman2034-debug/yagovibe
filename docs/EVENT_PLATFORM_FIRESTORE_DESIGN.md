# 🔥 Event Platform Firestore 설계 (실서비스 수준)

**생성일**: 2025-01-XX  
**플랫폼 방향**: 생활체육 행사 운영 플랫폼  
**핵심 원칙**: Event First (League는 Event의 한 종류)

---

## 🎯 최상위 도메인 구조

```
Organization (협회/구청/운영기관)
  ↓
Season (연도 시즌)
  ↓
Event (행사)
  ↓
Event Division (부문: U12, 일반부, 장년부 등)
  ↓
Event Entry (참가 신청 단위)
  ↓
Event Match (경기)
  ↓
Record (team_games / player_games)
  ↓
Stats / Ranking / Awards
```

---

## 📊 핵심 컬렉션 구조

### 필수 컬렉션 (7개)

```
1. seasons
2. events
3. event_divisions
4. event_entries
5. event_matches
6. team_games (기존 활용)
7. player_games
```

### 보조 컬렉션

```
8. event_schedules
9. event_brackets (선택적)
10. rankings
11. awards
12. organizations (선택적)
```

---

## 🔥 1. seasons 컬렉션

### 경로
```
seasons/{seasonId}
```

### 문서 예시
```typescript
{
  id: "2026",
  name: "2026 노원구 생활체육 축구 시즌",
  regionCode: "KR_SEOUL_NOWON",
  sportType: "football",
  startDate: Timestamp("2026-01-01T00:00:00Z"),
  endDate: Timestamp("2026-12-31T23:59:59Z"),
  status: "active", // planned | active | closed
  organizationId: "nowon_football_association",
  createdAt: Timestamp("2025-12-01T00:00:00Z"),
  updatedAt: Timestamp("2025-12-01T00:00:00Z")
}
```

### 필드 설명
- `id`: 시즌 ID (보통 연도, 예: "2026")
- `name`: 시즌 이름
- `regionCode`: 지역 코드
- `sportType`: 종목
- `startDate` / `endDate`: 시즌 기간
- `status`: 시즌 상태
- `organizationId`: 운영 기관 ID (선택적)

### 인덱스
```json
{
  "collectionGroup": "seasons",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "regionCode", "order": "ASCENDING" },
    { "fieldPath": "sportType", "order": "ASCENDING" },
    { "fieldPath": "startDate", "order": "DESCENDING" }
  ]
}
```

---

## 🔥 2. events 컬렉션

### 경로
```
events/{eventId}
```

### 문서 예시
```typescript
{
  id: "event_assoc_2026",
  seasonId: "2026",
  organizationId: "nowon_football_association",

  name: "2026 노원구 협회장기 축구대회",
  shortName: "협회장기",
  slug: "2026-nowon-association-cup",

  eventType: "tournament", // ceremony | tournament | league | academy | festival
  sportType: "football",
  regionCode: "KR_SEOUL_NOWON",

  organizerName: "노원구축구협회",
  sponsorName: null,

  venueSummary: "노원구민체육센터 외",
  startDate: Timestamp("2026-05-10T09:00:00Z"),
  endDate: Timestamp("2026-05-24T18:00:00Z"),

  status: "scheduled", // draft | registration_open | registration_closed | scheduled | ongoing | completed | canceled

  isPublic: true,
  description: "노원구축구협회 주최 2026년 협회장기 축구대회입니다.",
  posterImageUrl: null,

  createdBy: "user_admin_123",
  createdAt: Timestamp("2025-12-15T00:00:00Z"),
  updatedAt: Timestamp("2025-12-15T00:00:00Z")
}
```

### 필드 설명
- `id`: 행사 ID
- `seasonId`: 시즌 ID
- `organizationId`: 운영 기관 ID
- `name` / `shortName` / `slug`: 행사명
- `eventType`: 행사 유형
- `sportType`: 종목
- `regionCode`: 지역 코드
- `organizerName` / `sponsorName`: 주최/스폰서
- `venueSummary`: 장소 요약
- `startDate` / `endDate`: 행사 기간
- `status`: 행사 상태
- `isPublic`: 공개 여부
- `description`: 설명
- `posterImageUrl`: 포스터 이미지 URL

### 인덱스
```json
[
  {
    "collectionGroup": "events",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "seasonId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "startDate", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "events",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "regionCode", "order": "ASCENDING" },
      { "fieldPath": "sportType", "order": "ASCENDING" },
      { "fieldPath": "startDate", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "events",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "eventType", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "startDate", "order": "DESCENDING" }
    ]
  }
]
```

---

## 🔥 3. event_divisions 컬렉션

### 경로
```
event_divisions/{divisionId}
```

### 문서 예시 (일반부)
```typescript
{
  id: "div_general_2026",
  eventId: "event_assoc_2026",
  seasonId: "2026",

  name: "일반부",
  code: "GENERAL",
  gender: "male", // male | female | mixed
  ageRule: {
    min: 19,
    max: null
  },

  formatType: "knockout", // knockout | group | league | hybrid
  maxTeams: 16,

  status: "active",
  sortOrder: 1,

  createdAt: Timestamp("2025-12-15T00:00:00Z"),
  updatedAt: Timestamp("2025-12-15T00:00:00Z")
}
```

### 문서 예시 (유소년)
```typescript
{
  id: "div_u12_2026",
  eventId: "event_youth_2026",
  seasonId: "2026",

  name: "U12",
  code: "U12",
  gender: "mixed",
  ageRule: {
    minBirthYear: 2014,
    maxBirthYear: 2015
  },

  formatType: "group_knockout",
  maxTeams: 8,

  status: "active",
  sortOrder: 1,

  createdAt: Timestamp("2025-12-15T00:00:00Z"),
  updatedAt: Timestamp("2025-12-15T00:00:00Z")
}
```

### 필드 설명
- `id`: 부문 ID
- `eventId`: 행사 ID
- `seasonId`: 시즌 ID
- `name` / `code`: 부문명/코드
- `gender`: 성별 구분
- `ageRule`: 연령 규칙
- `formatType`: 대진 형식
- `maxTeams`: 최대 참가팀 수
- `status`: 부문 상태
- `sortOrder`: 정렬 순서

### 인덱스
```json
{
  "collectionGroup": "event_divisions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "eventId", "order": "ASCENDING" },
    { "fieldPath": "sortOrder", "order": "ASCENDING" }
  ]
}
```

---

## 🔥 4. event_entries 컬렉션

### 경로
```
event_entries/{entryId}
```

### 문서 예시
```typescript
{
  id: "entry_teamA_assoc_2026",
  eventId: "event_assoc_2026",
  divisionId: "div_general_2026",
  seasonId: "2026",

  teamId: "team_yago_fc",
  teamName: "야고FC",

  applicationStatus: "approved", // pending | approved | rejected | withdrawn
  participationStatus: "active", // active | eliminated | completed

  seed: 3,
  groupCode: null, // "A" | "B" | null

  appliedAt: Timestamp("2026-03-01T10:00:00Z"),
  approvedAt: Timestamp("2026-03-05T14:00:00Z"),

  managerUserId: "user_123",
  note: null,

  createdAt: Timestamp("2026-03-01T10:00:00Z"),
  updatedAt: Timestamp("2026-03-05T14:00:00Z")
}
```

### 필드 설명
- `id`: 참가 신청 ID
- `eventId`: 행사 ID
- `divisionId`: 부문 ID
- `seasonId`: 시즌 ID
- `teamId` / `teamName`: 팀 정보
- `applicationStatus`: 신청 상태
- `participationStatus`: 참가 상태
- `seed`: 시드 번호
- `groupCode`: 조 편성 코드
- `appliedAt` / `approvedAt`: 신청/승인 일시
- `managerUserId`: 담당자 ID
- `note`: 메모

### 인덱스
```json
[
  {
    "collectionGroup": "event_entries",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "eventId", "order": "ASCENDING" },
      { "fieldPath": "divisionId", "order": "ASCENDING" },
      { "fieldPath": "applicationStatus", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "event_entries",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "teamId", "order": "ASCENDING" },
      { "fieldPath": "seasonId", "order": "ASCENDING" }
    ]
  }
]
```

---

## 🔥 5. event_matches 컬렉션

### 경로
```
event_matches/{matchId}
```

### 문서 예시
```typescript
{
  id: "match_007",
  seasonId: "2026",
  eventId: "event_assoc_2026",
  divisionId: "div_general_2026",

  stageType: "knockout", // group | knockout | league
  roundCode: "QF",       // R16 | QF | SF | F
  roundName: "8강",

  bracketSlot: 2,
  matchNumber: 7,

  homeEntryId: "entry_teamA_assoc_2026",
  awayEntryId: "entry_teamB_assoc_2026",

  homeTeamId: "team_yago_fc",
  homeTeamName: "야고FC",
  awayTeamId: "team_nowon_fc",
  awayTeamName: "노원FC",

  scheduledAt: Timestamp("2026-05-15T14:00:00Z"),
  venueId: "venue_nowon_main",
  venueName: "노원구민체육센터",
  venueAddress: "서울시 노원구 상계동",

  status: "completed", // scheduled | live | completed | canceled | postponed

  homeScore: 2,
  awayScore: 1,
  winnerTeamId: "team_yago_fc",

  isPenaltyShootout: false,
  homePenaltyScore: null,
  awayPenaltyScore: null,

  reportStatus: "confirmed", // draft | submitted | confirmed
  confirmedAt: Timestamp("2026-05-15T16:00:00Z"),

  // 브래킷 연결 (선택적)
  nextMatchId: "match_011",
  homeSourceMatchId: null,
  awaySourceMatchId: null,

  createdAt: Timestamp("2026-04-20T00:00:00Z"),
  updatedAt: Timestamp("2026-05-15T16:00:00Z")
}
```

### 필드 설명
- `id`: 경기 ID
- `seasonId` / `eventId` / `divisionId`: 계층 정보
- `stageType`: 경기 단계 유형
- `roundCode` / `roundName`: 라운드 정보
- `bracketSlot` / `matchNumber`: 대진표 위치
- `homeEntryId` / `awayEntryId`: 참가 신청 ID
- `homeTeamId` / `awayTeamId` / `homeTeamName` / `awayTeamName`: 팀 정보
- `scheduledAt`: 경기 일시
- `venueId` / `venueName` / `venueAddress`: 경기장 정보
- `status`: 경기 상태
- `homeScore` / `awayScore`: 점수
- `winnerTeamId`: 승자 팀 ID
- `isPenaltyShootout`: 승부차기 여부
- `homePenaltyScore` / `awayPenaltyScore`: 승부차기 점수
- `reportStatus`: 결과 보고 상태
- `confirmedAt`: 결과 확정 일시
- `nextMatchId`: 다음 경기 ID (토너먼트)
- `homeSourceMatchId` / `awaySourceMatchId`: 이전 경기 ID (토너먼트)

### 인덱스
```json
[
  {
    "collectionGroup": "event_matches",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "eventId", "order": "ASCENDING" },
      { "fieldPath": "divisionId", "order": "ASCENDING" },
      { "fieldPath": "scheduledAt", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "event_matches",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "eventId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "scheduledAt", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "event_matches",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "homeTeamId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "scheduledAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "event_matches",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "awayTeamId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "scheduledAt", "order": "DESCENDING" }
    ]
  }
]
```

---

## 🔥 6. team_games 컬렉션 (기존 활용)

### 경로
```
team_games/{teamGameId}
```

### 문서 예시 (Event 기반)
```typescript
{
  id: "tg_match_007_teamA",
  matchId: "match_007",
  eventId: "event_assoc_2026",
  divisionId: "div_general_2026",
  seasonId: "2026",

  sportType: "football",
  gameType: "tournament",
  sourceType: "event",
  sourceId: "match_007",

  homeTeamId: "team_yago_fc",
  homeTeamName: "야고FC",
  awayTeamId: "team_nowon_fc",
  awayTeamName: "노원FC",

  teamId: "team_yago_fc",
  opponentTeamId: "team_nowon_fc",
  isHome: true,

  scheduledAt: Timestamp("2026-05-15T14:00:00Z"),
  playedAt: Timestamp("2026-05-15T14:00:00Z"),

  result: "win", // win | draw | loss
  goalsFor: 2,
  goalsAgainst: 1,
  points: 3,

  eventType: "tournament",
  roundCode: "QF",
  roundName: "8강",

  location: "노원구민체육센터",
  address: "서울시 노원구 상계동",

  createdAt: Timestamp("2026-05-15T16:00:00Z"),
  updatedAt: Timestamp("2026-05-15T16:00:00Z")
}
```

### 필드 확장
- `eventId`: 행사 ID 추가
- `divisionId`: 부문 ID 추가
- `roundCode` / `roundName`: 라운드 정보 추가

---

## 🔥 7. player_games 컬렉션

### 경로
```
player_games/{playerGameId}
```

### 문서 예시
```typescript
{
  id: "pg_match_007_player_10",
  matchId: "match_007",
  eventId: "event_assoc_2026",
  divisionId: "div_general_2026",
  seasonId: "2026",

  teamId: "team_yago_fc",
  playerId: "player_10",
  playerName: "김철수",

  appearance: true,
  starter: true,
  minutesPlayed: 60,

  goals: 1,
  assists: 0,
  yellowCards: 1,
  redCards: 0,

  playedAt: Timestamp("2026-05-15T14:00:00Z"),
  createdAt: Timestamp("2026-05-15T16:00:00Z"),
  updatedAt: Timestamp("2026-05-15T16:00:00Z")
}
```

### 인덱스
```json
[
  {
    "collectionGroup": "player_games",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "playerId", "order": "ASCENDING" },
      { "fieldPath": "seasonId", "order": "ASCENDING" },
      { "fieldPath": "playedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "player_games",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "eventId", "order": "ASCENDING" },
      { "fieldPath": "goals", "order": "DESCENDING" }
    ]
  }
]
```

---

## 🔥 8. event_schedules 컬렉션 (보조)

### 경로
```
event_schedules/{scheduleId}
```

### 문서 예시
```typescript
{
  id: "schedule_assoc_2026_2026-05-15",
  eventId: "event_assoc_2026",
  divisionId: "div_general_2026",

  date: Timestamp("2026-05-15T00:00:00Z"),
  venueId: "venue_nowon_main",
  venueName: "노원구민체육센터",
  venueAddress: "서울시 노원구 상계동",

  matchIds: ["match_007", "match_008", "match_009"],

  status: "published",
  createdAt: Timestamp("2026-04-20T00:00:00Z"),
  updatedAt: Timestamp("2026-04-20T00:00:00Z")
}
```

### 인덱스
```json
{
  "collectionGroup": "event_schedules",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "eventId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

---

## 🔥 9. rankings 컬렉션 (보조)

### 경로
```
rankings/{rankingId}
```

### 문서 예시
```typescript
{
  id: "ranking_event_k7_2026_general_teamA",
  scope: "event_division", // season | event | division | team
  seasonId: "2026",
  eventId: "event_k7_2026",
  divisionId: "div_general_2026",

  teamId: "team_yago_fc",
  teamName: "야고FC",

  played: 8,
  won: 6,
  drawn: 1,
  lost: 1,

  goalsFor: 17,
  goalsAgainst: 6,
  goalDiff: 11,
  points: 19,

  rank: 1,
  updatedAt: Timestamp("2026-11-30T18:00:00Z")
}
```

### 인덱스
```json
{
  "collectionGroup": "rankings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "eventId", "order": "ASCENDING" },
    { "fieldPath": "divisionId", "order": "ASCENDING" },
    { "fieldPath": "points", "order": "DESCENDING" },
    { "fieldPath": "goalDiff", "order": "DESCENDING" }
  ]
}
```

---

## 🔥 10. awards 컬렉션 (보조)

### 경로
```
awards/{awardId}
```

### 문서 예시
```typescript
{
  id: "award_assoc_2026_general_champion",
  seasonId: "2026",
  eventId: "event_assoc_2026",
  divisionId: "div_general_2026",

  awardType: "champion", // champion | runner_up | top_scorer | mvp | fair_play
  targetType: "team",    // team | player
  targetId: "team_yago_fc",
  targetName: "야고FC",

  createdAt: Timestamp("2026-05-24T18:00:00Z")
}
```

---

## 📋 전체 인덱스 요약

### 필수 인덱스

1. **seasons**
   - `regionCode + sportType + startDate`

2. **events**
   - `seasonId + status + startDate`
   - `regionCode + sportType + startDate`
   - `eventType + status + startDate`

3. **event_divisions**
   - `eventId + sortOrder`

4. **event_entries**
   - `eventId + divisionId + applicationStatus`
   - `teamId + seasonId`

5. **event_matches**
   - `eventId + divisionId + scheduledAt`
   - `eventId + status + scheduledAt`
   - `homeTeamId + status + scheduledAt`
   - `awayTeamId + status + scheduledAt`

6. **player_games**
   - `playerId + seasonId + playedAt`
   - `eventId + goals`

7. **event_schedules**
   - `eventId + date`

8. **rankings**
   - `eventId + divisionId + points + goalDiff`

---

## 🔄 기존 시스템과의 연결

### 그대로 활용
- `teams` 컬렉션
- `team_games` 컬렉션 (필드 확장)
- `player_stats` 컬렉션

### 이름 재정의
- `league_matches` → `event_matches` (eventType=league)
- `tournament_matches` → `event_matches` (eventType=tournament)

### 새로 추가
- `events`
- `event_divisions`
- `event_entries`
- `event_schedules`
- `rankings` (보조)
- `awards` (보조)

---

## 📝 다음 단계

1. **타입 정의 업데이트**
   - `src/types/event.ts` 확장
   - `src/types/teamGame.ts`에 `eventId`, `divisionId` 추가

2. **서비스 레이어 확장**
   - `src/services/eventService.ts` 확장
   - `event_entries`, `event_schedules` 서비스 추가

3. **Cloud Functions**
   - `onEventMatchCompleted` 구현
   - `rebuildRankings` 함수 구현

4. **Firestore 인덱스 배포**
   - `firestore.indexes.json` 업데이트
   - 인덱스 배포

---

## 🎉 평가

**Event Platform Firestore 설계**: ✅ **실서비스 수준**

**기존 시스템 활용**: ✅ **최대한 활용**

**다음 단계**: 타입 정의 업데이트 + 인덱스 배포

이 구조가 완성되면 **생활체육 Event Platform**이 완성됩니다. ⚽
