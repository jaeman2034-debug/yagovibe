# 📊 YAGO SPORTS ERD (Entity Relationship Diagram)

> **작성일**: 2024년  
> **목적**: YAGO SPORTS 플랫폼의 엔티티 관계 다이어그램

---

## 1️⃣ 핵심 ERD

```
┌─────────────┐
│    User     │
│─────────────│
│ id          │
│ displayName │
│ email       │
│ role        │
│ region      │
└──────┬──────┘
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
┌─────────────┐      ┌──────────────┐
│ TeamMember  │      │   Player     │
│─────────────│      │──────────────│
│ userId      │      │ id           │
│ teamId      │      │ name         │
│ role        │      │ teamId       │
│ status      │      │ position     │
└──────┬──────┘      │ academyId   │
       │             └──────┬───────┘
       │                    │
       ▼                    │
┌─────────────┐             │
│    Team     │             │
│─────────────│             │
│ id          │             │
│ name        │             │
│ sportType   │             │
│ region      │             │
│ ownerUid    │             │
│ visibility  │             │
└──────┬──────┘             │
       │                    │
       ├────────┬────────────┤
       │        │            │
       ▼        ▼            ▼
┌──────────┐ ┌──────┐ ┌──────────┐
│TeamEvent │ │Match │ │  Stats   │
│──────────│ │──────│ │──────────│
│teamId    │ │id    │ │playerId  │
│title     │ │home  │ │goals     │
│date      │ │away  │ │assists   │
│attendees │ │score │ │matches   │
└──────────┘ └───┬──┘ └──────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Tournament   │
         │──────────────│
         │ id           │
         │ name         │
         │ type         │
         │ startDate    │
         │ endDate      │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  Standings   │
         │──────────────│
         │tournamentId  │
         │teamId        │
         │points        │
         │rank          │
         └──────────────┘
```

---

## 2️⃣ 상세 ERD

### 2-1. User 중심 관계

```
User (1)
  │
  ├──< (N) TeamMember
  │     │
  │     └──> (1) Team
  │
  ├──< (1) Player
  │
  └──< (N) ChatRoom (participant)
```

### 2-2. Team 중심 관계

```
Team (1)
  │
  ├──< (N) TeamMember
  │     │
  │     └──> (1) User
  │
  ├──< (N) TeamEvent
  │
  ├──< (N) TeamNotice
  │
  ├──< (N) TeamSchedule
  │
  ├──< (1) ChatRoom
  │
  ├──< (N) Match (as homeTeam or awayTeam)
  │
  └──> (N) Tournament (through TournamentTeam)
```

### 2-3. Match 중심 관계

```
Match (1)
  │
  ├──> (2) Team (homeTeam, awayTeam)
  │
  ├──< (N) MatchEvent
  │
  ├──< (N) MatchLineup
  │     │
  │     └──> (1) Player
  │
  ├──> (1) Tournament (optional)
  │
  └──< (1) MatchStats
```

### 2-4. Tournament 중심 관계

```
Tournament (1)
  │
  ├──> (N) TournamentTeam
  │     │
  │     └──> (1) Team
  │
  ├──< (N) Match
  │
  └──< (1) Standings
```

### 2-5. Player 중심 관계

```
Player (1)
  │
  ├──> (1) Team (optional)
  │
  ├──> (1) Academy (optional)
  │
  ├──< (N) PlayerStats
  │     │
  │     └──> (1) Match
  │
  └──> (N) Match (through MatchLineup)
```

### 2-6. Academy 중심 관계

```
Academy (1)
  │
  ├──> (N) AcademyPlayer
  │     │
  │     └──> (1) Player
  │
  ├──< (N) AcademyCoach
  │
  └──< (N) AcademyProgram
```

---

## 3️⃣ 관계 카디널리티 매트릭스

| 엔티티 A | 관계 | 엔티티 B | 카디널리티 |
|---------|------|---------|-----------|
| User | 가입 | Team | 1:N (한 사용자는 여러 팀 가입) |
| Team | 소속 | Member | 1:N (한 팀은 여러 멤버) |
| Team | 참가 | Match | 1:N (한 팀은 여러 경기) |
| Match | 참가 | Team | 2:1 (한 경기는 2개 팀) |
| Match | 포함 | Player | N:M (여러 선수, 여러 경기) |
| Team | 참가 | Tournament | N:M (여러 팀, 여러 대회) |
| Tournament | 포함 | Match | 1:N (한 대회는 여러 경기) |
| Player | 소속 | Academy | N:1 (여러 선수, 한 아카데미) |
| Team | 보유 | ChatRoom | 1:1 (한 팀은 하나의 채팅방) |
| Team | 생성 | Event | 1:N (한 팀은 여러 이벤트) |

---

## 4️⃣ 주요 관계 상세

### 4-1. User ↔ Team 관계

```
User (1) ──< TeamMember (N) >── Team (1)

- 한 사용자는 여러 팀에 가입 가능
- 한 팀은 여러 멤버 보유
- TeamMember는 중간 테이블 역할
- role: "owner" | "admin" | "member"
```

### 4-2. Team ↔ Match 관계

```
Team (1) ──< Match (N)

- 한 팀은 여러 경기 참가
- 한 경기는 2개 팀 참가 (homeTeam, awayTeam)
- Match.homeTeamId, Match.awayTeamId로 연결
```

### 4-3. Team ↔ Tournament 관계

```
Team (N) >──< Tournament (N)

- 다대다 관계
- TournamentTeam 중간 컬렉션으로 관리
- 한 팀은 여러 대회 참가
- 한 대회는 여러 팀 포함
```

### 4-4. Player ↔ Match 관계

```
Player (N) >──< Match (N)

- 다대다 관계
- MatchLineup 중간 컬렉션으로 관리
- 한 선수는 여러 경기 참가
- 한 경기는 여러 선수 포함
```

### 4-5. Player ↔ Stats 관계

```
Player (1) ──< PlayerStats (N)

- 한 선수는 여러 통계 기록
- 각 통계는 하나의 경기와 연결
- PlayerStats.matchId로 연결
```

---

## 5️⃣ 데이터 흐름 다이어그램

### 5-1. 팀 생성 흐름

```
User
  │
  ├─> createTeam()
  │
  ├─> teams/{teamId} 생성
  │
  ├─> teams/{teamId}/members/{userId} 생성 (owner)
  │
  └─> activities/{activityId} 생성 (team_created)
```

### 5-2. 경기 생성 흐름

```
Team (home)
  │
  ├─> createMatch()
  │
  ├─> matches/{matchId} 생성
  │
  ├─> matches/{matchId}/lineups 생성
  │
  └─> activities/{activityId} 생성 (match_scheduled)
```

### 5-3. 경기 완료 흐름

```
Match
  │
  ├─> updateMatchScore()
  │
  ├─> matches/{matchId} 업데이트 (status: "completed")
  │
  ├─> players/{playerId}/stats 업데이트
  │
  ├─> tournaments/{tournamentId}/standings 업데이트
  │
  └─> activities/{activityId} 생성 (match_result)
```

### 5-4. 이벤트 생성 흐름

```
Team
  │
  ├─> createEvent()
  │
  ├─> teams/{teamId}/events/{eventId} 생성
  │
  ├─> chatRooms/team_{teamId}/messages 생성 (event card)
  │
  └─> activities/{activityId} 생성 (team_event)
```

---

## 6️⃣ 집계 데이터 구조

### 6-1. Team Stats 집계

```
teams/{teamId}
  stats: {
    totalMatches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  }
```

**집계 소스**: `matches` 컬렉션 쿼리

### 6-2. Player Stats 집계

```
players/{playerId}
  stats: {
    totalGoals: number;
    totalAssists: number;
    totalMatches: number;
    totalMinutes: number;
  }
```

**집계 소스**: `players/{playerId}/stats` 서브컬렉션

### 6-3. Tournament Standings 집계

```
tournaments/{tournamentId}/standings/{teamId}
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  rank: number;
```

**집계 소스**: `matches` 컬렉션 쿼리

---

## 7️⃣ 인덱스 전략

### 7-1. 주요 복합 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "teams",
      "fields": [
        { "fieldPath": "region", "order": "ASCENDING" },
        { "fieldPath": "sportType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "fields": [
        { "fieldPath": "homeTeamId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teamSchedules",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "dateTime", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 8️⃣ 정규화 전략

### 8-1. 정규화된 데이터

- `teams/{teamId}/members` - 멤버 정보
- `matches/{matchId}/lineups` - 라인업 정보
- `players/{playerId}/stats` - 선수 통계

### 8-2. 비정규화된 데이터 (성능 최적화)

- `teams/{teamId}` - `ownerUid`, `owners[]` (중복 저장)
- `matches/{matchId}` - `homeTeamId`, `awayTeamId` (팀 정보 중복)
- `activities/{activityId}` - `teamId`, `authorId` (참조 중복)

---

## ✅ ERD 요약

### 핵심 엔티티 (10개)

1. **User** - 사용자
2. **Team** - 팀
3. **TeamMember** - 팀 멤버
4. **Match** - 경기
5. **Tournament** - 대회
6. **Player** - 선수
7. **Event** - 이벤트
8. **Academy** - 유소년 아카데미
9. **Stats** - 통계
10. **ChatRoom** - 채팅방

### 주요 관계 (15개)

1. User ↔ Team (N:M through TeamMember)
2. Team ↔ Match (1:N)
3. Match ↔ Team (2:1)
4. Team ↔ Tournament (N:M)
5. Player ↔ Match (N:M through MatchLineup)
6. Player ↔ Team (N:1)
7. Player ↔ Academy (N:1)
8. Team ↔ Event (1:N)
9. Team ↔ ChatRoom (1:1)
10. Player ↔ Stats (1:N)
11. Tournament ↔ Match (1:N)
12. Tournament ↔ Standings (1:1)
13. Academy ↔ Player (1:N)
14. Academy ↔ Coach (1:N)
15. Academy ↔ Program (1:N)

---

**작성일**: 2024년  
**상태**: ✅ ERD 설계 완료
