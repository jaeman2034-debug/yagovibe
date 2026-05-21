# 🏗️ YAGO 플랫폼 핵심 데이터 구조 (실서비스 수준)

## 🎯 핵심 원칙

**계층 구조 (Hierarchy)**가 플랫폼 전체를 지탱합니다.

```
Federation (협회)
   ↓
Season (시즌)
   ↓
League (리그)
   ↓
Team (팀)
   ↓
Player (선수)
   ↓
Match (경기)
   ↓
Standing (순위)
```

이 구조 하나가 **플랫폼 전체를 지탱합니다.**

---

## 📊 전체 계층 구조

```
Federation (협회)
 ├─ Seasons (시즌 목록)
 │   ├─ Leagues (리그 목록)
 │   │   ├─ League Teams (참가 팀)
 │   │   ├─ League Matches (경기)
 │   │   └─ League Standings (순위)
 │   │
 │   └─ Season Settings (시즌 설정)
 │
 ├─ Federation Teams (소속 팀)
 │   └─ Players (선수)
 │
 ├─ Announcements (공지)
 └─ Settings (설정)
```

---

## 🗄️ Firestore 컬렉션 구조

### 1. `federations/{federationId}` - 협회

```typescript
interface Federation {
  // 기본 정보
  id: string;
  name: string;                    // "노원구 축구협회"
  slug: string;                     // "no-won-football"
  sport: string;                    // "soccer" | "basketball" | "baseball"
  region: string;                   // "서울시 노원구"
  description?: string;
  logoUrl?: string;
  
  // 운영 정보
  operationType: "league" | "tournament" | "mixed";
  participationUnit: "team" | "individual" | "both";
  baseType: "region" | "school" | "company" | "online";
  
  // 관리자
  ownerId: string;
  adminIds: string[];
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  // 통계 (집계)
  seasonCount: number;              // 총 시즌 수
  leagueCount: number;              // 운영 중인 리그 수
  teamCount: number;                // 소속 팀 수
  playerCount: number;              // 등록 선수 수
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```json
{
  "id": "fed-nowon-football",
  "name": "노원구 축구협회",
  "slug": "no-won-football",
  "sport": "soccer",
  "region": "서울시 노원구",
  "operationType": "league",
  "participationUnit": "team",
  "baseType": "region",
  "ownerId": "user-123",
  "adminIds": ["user-123"],
  "status": "active",
  "seasonCount": 3,
  "leagueCount": 6,
  "teamCount": 24,
  "playerCount": 360,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

### 2. `seasons/{seasonId}` - 시즌

```typescript
interface Season {
  // 기본 정보
  id: string;
  federationId: string;
  name: string;                     // "2026 시즌"
  year: number;                     // 2026
  period: "spring" | "summer" | "fall" | "winter" | "full";
  
  // 일정
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStartDate: Timestamp;
  registrationEndDate: Timestamp;
  
  // 상태
  status: "draft" | "upcoming" | "active" | "completed" | "cancelled";
  
  // 통계 (집계)
  leagueCount: number;              // 시즌 내 리그 수
  teamCount: number;                // 참가 팀 수
  matchCount: number;               // 총 경기 수
  completedMatchCount: number;       // 완료된 경기 수
  
  // 설정
  defaultPointsForWin?: number;     // 기본 승점 (기본 3)
  defaultPointsForDraw?: number;    // 기본 무승부 점수 (기본 1)
  
  // 생성자
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```json
{
  "id": "season-2026",
  "federationId": "fed-nowon-football",
  "name": "2026 시즌",
  "year": 2026,
  "period": "full",
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": "2026-11-30T23:59:59Z",
  "registrationStartDate": "2026-01-01T00:00:00Z",
  "registrationEndDate": "2026-02-28T23:59:59Z",
  "status": "active",
  "leagueCount": 3,
  "teamCount": 24,
  "matchCount": 94,
  "completedMatchCount": 24,
  "defaultPointsForWin": 3,
  "defaultPointsForDraw": 1,
  "createdBy": "user-123",
  "createdAt": "2025-12-01T00:00:00Z"
}
```

---

### 3. `leagues/{leagueId}` - 리그

```typescript
interface League {
  // 기본 정보
  id: string;
  seasonId: string;                 // 소속 시즌
  federationId: string;             // 소속 협회
  name: string;                      // "노원구 K7 리그"
  slug: string;                      // "k7-league-2026"
  
  // 리그 정보
  sport: string;                     // "soccer"
  region: string;                    // "서울시 노원구"
  leagueType: "round_robin" | "tournament" | "hybrid";
  format: "single" | "double" | "group_stage"; // 단일/복수/조별
  
  // 일정
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStartDate: Timestamp;
  registrationEndDate: Timestamp;
  
  // 상태
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  
  // 참가 제한
  maxTeams?: number;                 // 최대 참가 팀 수
  minTeams?: number;                 // 최소 참가 팀 수
  
  // 통계 (집계)
  teamCount: number;                 // 참가 팀 수
  matchCount: number;                // 총 경기 수
  completedMatchCount: number;       // 완료된 경기 수
  
  // 설정
  pointsForWin?: number;             // 승점 (기본 3)
  pointsForDraw?: number;            // 무승부 점수 (기본 1)
  matchesPerDay?: number;             // 하루 최대 경기 수
  
  // 생성자
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```json
{
  "id": "league-k7-2026",
  "seasonId": "season-2026",
  "federationId": "fed-nowon-football",
  "name": "노원구 K7 리그",
  "slug": "k7-league-2026",
  "sport": "soccer",
  "region": "서울시 노원구",
  "leagueType": "round_robin",
  "format": "single",
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": "2026-11-30T23:59:59Z",
  "registrationStartDate": "2026-01-01T00:00:00Z",
  "registrationEndDate": "2026-02-28T23:59:59Z",
  "status": "active",
  "maxTeams": 16,
  "minTeams": 8,
  "teamCount": 12,
  "matchCount": 66,
  "completedMatchCount": 24,
  "pointsForWin": 3,
  "pointsForDraw": 1,
  "matchesPerDay": 4,
  "createdBy": "user-123",
  "createdAt": "2025-12-01T00:00:00Z"
}
```

---

### 4. `league_teams/{leagueTeamId}` - 리그 참가 팀

```typescript
interface LeagueTeam {
  // 기본 정보
  id: string;
  leagueId: string;
  seasonId: string;                  // 시즌 ID (쿼리 최적화)
  teamId: string;                    // teams/{teamId} 참조
  teamName: string;                  // Denormalized
  
  // 참가 정보
  joinedAt: Timestamp;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  
  // 승인 정보
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedReason?: string;
  
  // 통계 (집계)
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank?: number;
}
```

---

### 5. `league_matches/{matchId}` - 리그 경기

```typescript
interface LeagueMatch {
  // 기본 정보
  id: string;
  leagueId: string;
  seasonId: string;                  // 시즌 ID (쿼리 최적화)
  round: number;                     // 라운드 번호
  groupId?: string;                  // 조별 리그인 경우
  
  // 팀 정보 (Denormalized)
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  
  // 일정
  scheduledAt: Timestamp;
  facilityId?: string;
  facilityName?: string;
  
  // 결과
  status: "scheduled" | "live" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  playedAt?: Timestamp;
  
  // 연결
  teamGameId?: string;               // team_games/{teamGameId} 참조
  
  // 메타
  recordedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 6. `league_standings/{leagueId}_{teamId}` - 리그 순위

```typescript
interface LeagueStanding {
  // 기본 정보
  id: string;                        // "{leagueId}_{teamId}"
  leagueId: string;
  seasonId: string;                  // 시즌 ID (쿼리 최적화)
  teamId: string;
  teamName: string;                  // Denormalized
  
  // 경기 통계
  games: number;
  wins: number;
  draws: number;
  losses: number;
  
  // 득실점
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  
  // 승점
  points: number;
  
  // 순위
  rank: number;
  previousRank?: number;
  rankChange?: number;
  
  // 업데이트
  lastUpdatedAt: Timestamp;
}
```

---

### 7. `teams/{teamId}` - 팀

```typescript
interface Team {
  // 기본 정보
  id: string;
  name: string;                      // "노원 FC"
  sportType: string;                 // "soccer"
  region: string;                    // "서울시 노원구"
  logoUrl?: string;
  
  // 소속
  federationId?: string;             // 협회 소속 (선택)
  
  // 관리자
  ownerUid: string;
  
  // 상태
  status: "active" | "inactive";
  
  // 통계 (집계)
  memberCount: number;               // 팀원 수
  leagueCount: number;               // 참가 중인 리그 수
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 8. `federation_players/{playerId}` - 협회 등록 선수

```typescript
interface FederationPlayer {
  // 기본 정보
  id: string;
  federationId: string;
  userId: string;                    // users/{userId} 참조
  playerName: string;                // Denormalized
  
  // 팀 정보
  teamId: string;
  teamName: string;                  // Denormalized
  
  // 선수 정보
  position?: string;
  jerseyNumber?: number;
  birthDate?: Timestamp;
  
  // 등록 정보
  registeredAt: Timestamp;
  status: "active" | "inactive" | "suspended";
  
  // 통계 (집계)
  leagueCount: number;
  totalMatches: number;
  totalGoals?: number;
  totalAssists?: number;
}
```

---

## 🔗 관계 및 참조 구조

### 계층 관계

```
Federation (1)
 └─ Season (N)
     └─ League (N)
         ├─ League Team (N)
         ├─ League Match (N)
         └─ League Standing (N)
```

### 참조 규칙

1. **Federation → Season**: `season.federationId`
2. **Season → League**: `league.seasonId`
3. **League → Team**: `league_teams.teamId` → `teams/{teamId}`
4. **League → Match**: `league_matches.leagueId`
5. **Match → Team**: `league_matches.homeTeamId`, `awayTeamId` → `teams/{teamId}`
6. **Standing → League**: `league_standings.leagueId`
7. **Standing → Team**: `league_standings.teamId` → `teams/{teamId}`

### Denormalization 전략

**성능 최적화를 위한 Denormalization**:

1. **Team Name**: `league_teams.teamName`, `league_matches.homeTeamName`, `league_standings.teamName`
2. **Facility Name**: `league_matches.facilityName`
3. **Player Name**: `federation_players.playerName`
4. **Season ID**: `league_teams.seasonId`, `league_matches.seasonId`, `league_standings.seasonId` (쿼리 최적화)

---

## 📍 Firestore 인덱스 설계

### 필수 복합 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "seasons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "leagues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "seasonId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "league_teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "points", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "league_matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "league_standings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "points", "order": "DESCENDING" },
        { "fieldPath": "goalDifference", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 🌐 URL 구조

### 협회 홈페이지

```
/federations/{federationSlug}
  → 협회 홈 (Overview)

/federations/{federationSlug}/seasons
  → 시즌 목록

/federations/{federationSlug}/seasons/{seasonSlug}
  → 시즌 상세 (리그 목록)

/federations/{federationSlug}/seasons/{seasonSlug}/leagues/{leagueSlug}
  → 리그 상세 (Overview, Teams, Matches, Standings)

/federations/{federationSlug}/teams
  → 소속 팀 목록

/federations/{federationSlug}/players
  → 등록 선수 목록
```

### 관리자 대시보드

```
/admin/federations/{federationSlug}
  → 협회 관리 대시보드

/admin/federations/{federationSlug}/seasons/create
  → 시즌 생성

/admin/federations/{federationSlug}/seasons/{seasonSlug}/leagues/create
  → 리그 생성

/admin/federations/{federationSlug}/seasons/{seasonSlug}/leagues/{leagueSlug}
  → 리그 관리 (팀 승인, 일정 생성, 결과 입력)
```

---

## 🔐 권한 구조

### Federation 권한

```typescript
interface FederationPermission {
  // 플랫폼 권한
  platformRole: "ADMIN" | "USER";
  
  // 협회 권한
  federationRole: "owner" | "admin" | "manager" | "viewer";
  
  // 시즌 권한 (시즌별)
  seasonRoles: {
    [seasonId: string]: "admin" | "manager" | "viewer";
  };
  
  // 리그 권한 (리그별)
  leagueRoles: {
    [leagueId: string]: "admin" | "manager" | "viewer";
  };
}
```

### 권한 체크 함수

```typescript
// 협회 소유자/관리자 체크
function isFederationAdmin(
  userId: string,
  federation: Federation
): boolean {
  return federation.ownerId === userId || 
         federation.adminIds.includes(userId);
}

// 시즌 관리자 체크
function isSeasonAdmin(
  userId: string,
  season: Season,
  federation: Federation
): boolean {
  return isFederationAdmin(userId, federation) ||
         season.adminIds?.includes(userId);
}

// 리그 관리자 체크
function isLeagueAdmin(
  userId: string,
  league: League,
  season: Season,
  federation: Federation
): boolean {
  return isFederationAdmin(userId, federation) ||
         isSeasonAdmin(userId, season, federation) ||
         league.adminIds?.includes(userId);
}
```

---

## 📊 실제 예시 데이터

### 노원구 축구협회

```
Federation: "노원구 축구협회"
  ├─ Season: "2026 시즌"
  │   ├─ League: "노원구 K7 리그"
  │   │   ├─ League Teams: 12팀
  │   │   ├─ League Matches: 66경기
  │   │   └─ League Standings: 12팀 순위
  │   │
  │   ├─ League: "노원구 K5 리그"
  │   │   ├─ League Teams: 8팀
  │   │   ├─ League Matches: 28경기
  │   │   └─ League Standings: 8팀 순위
  │   │
  │   └─ League: "노원구 컵 대회"
  │       ├─ League Teams: 16팀
  │       ├─ League Matches: 15경기 (토너먼트)
  │       └─ League Standings: 16팀 순위
  │
  └─ Season: "2027 시즌" (예정)
```

---

## 🎯 핵심 가치

### 1. 확장성

**Federation → Season → League** 구조로:
- 하나의 협회가 여러 시즌 운영 가능
- 하나의 시즌에 여러 리그 운영 가능
- 시즌별 독립적인 운영

### 2. 시즌 관리

- 시즌 단위로 리그 그룹화
- 시즌별 통계 집계
- 과거 시즌 데이터 보존

### 3. 유연성

- 리그별 독립적인 운영
- 다양한 리그 타입 지원 (Round Robin, Tournament, Hybrid)
- 시즌별 커스터마이징 가능

---

다음 문서: **리그 일정 자동 생성 알고리즘** (Round Robin / Tournament)
