# 🏗️ YAGO 협회 시스템 아키텍처 설계 (실서비스 수준)

## 🎯 핵심 원칙

**Federation (협회) = 리그 운영 시스템**

```
Federation (협회)
 └─ Multiple Leagues (여러 리그 운영)
     ├─ League 1 (K7 리그)
     ├─ League 2 (K5 리그)
     └─ League 3 (컵 대회)
```

**확장성**: 하나의 협회가 여러 리그를 운영할 수 있어 플랫폼 확장성이 10배 향상됩니다.

---

## 📊 전체 데이터 구조

```
Federation (협회)
 ├─ Leagues (리그 목록)
 │   ├─ League Teams (참가 팀)
 │   ├─ League Games (경기)
 │   └─ League Standings (순위)
 ├─ Teams (소속 팀)
 │   └─ Players (선수)
 ├─ Seasons (시즌)
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
  slug: string;                     // "no-won-football" (URL용)
  sport: string;                    // "soccer" | "basketball" | "baseball"
  region: string;                   // "서울시 노원구"
  description?: string;
  logoUrl?: string;
  
  // 운영 정보
  operationType: "league" | "tournament" | "mixed";  // 운영 방식
  participationUnit: "team" | "individual" | "both"; // 참가 단위
  baseType: "region" | "school" | "company" | "online"; // 지역/학교/기업/온라인
  
  // 관리자
  ownerId: string;                 // 협회 대표
  adminIds: string[];               // 협회 관리자 목록
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  // 통계 (집계)
  leagueCount: number;              // 운영 중인 리그 수
  teamCount: number;                // 소속 팀 수
  playerCount: number;              // 등록 선수 수
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시 데이터**:
```json
{
  "id": "fed-nowon-football",
  "name": "노원구 축구협회",
  "slug": "no-won-football",
  "sport": "soccer",
  "region": "서울시 노원구",
  "description": "노원구 지역 생활체육 축구협회",
  "operationType": "league",
  "participationUnit": "team",
  "baseType": "region",
  "ownerId": "user-123",
  "adminIds": ["user-123", "user-456"],
  "status": "active",
  "leagueCount": 3,
  "teamCount": 24,
  "playerCount": 360,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

### 2. `leagues/{leagueId}` - 리그

```typescript
interface League {
  // 기본 정보
  id: string;
  name: string;                     // "노원구 K7 리그"
  slug: string;                     // "k7-league-2026"
  federationId: string;              // 소속 협회 ID
  season: string;                    // "2026" 또는 "2026-spring"
  
  // 리그 정보
  sport: string;                    // "soccer"
  region: string;                    // "서울시 노원구"
  format: "round_robin" | "knockout" | "group_stage" | "mixed";
  
  // 일정
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStartDate: Timestamp;
  registrationEndDate: Timestamp;
  
  // 상태
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  
  // 통계 (집계)
  teamCount: number;                // 참가 팀 수
  matchCount: number;               // 총 경기 수
  completedMatchCount: number;      // 완료된 경기 수
  
  // 설정
  maxTeams?: number;                // 최대 참가 팀 수
  minTeams?: number;                // 최소 참가 팀 수
  pointsForWin?: number;            // 승점 (기본 3)
  pointsForDraw?: number;           // 무승부 점수 (기본 1)
  
  // 생성자
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시 데이터**:
```json
{
  "id": "league-k7-2026",
  "name": "노원구 K7 리그",
  "slug": "k7-league-2026",
  "federationId": "fed-nowon-football",
  "season": "2026",
  "sport": "soccer",
  "region": "서울시 노원구",
  "format": "round_robin",
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": "2026-11-30T23:59:59Z",
  "registrationStartDate": "2026-01-01T00:00:00Z",
  "registrationEndDate": "2026-02-28T23:59:59Z",
  "status": "active",
  "teamCount": 12,
  "matchCount": 66,
  "completedMatchCount": 24,
  "maxTeams": 16,
  "minTeams": 8,
  "pointsForWin": 3,
  "pointsForDraw": 1,
  "createdBy": "user-123",
  "createdAt": "2025-12-01T00:00:00Z"
}
```

---

### 3. `league_teams/{leagueTeamId}` - 리그 참가 팀

```typescript
interface LeagueTeam {
  // 기본 정보
  id: string;
  leagueId: string;
  teamId: string;                   // teams/{teamId} 참조
  teamName: string;                 // Denormalized (성능)
  
  // 참가 정보
  joinedAt: Timestamp;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  
  // 승인 정보
  approvedBy?: string;              // 승인한 관리자 ID
  approvedAt?: Timestamp;
  rejectedReason?: string;          // 거절 사유
  
  // 통계 (집계)
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  rank?: number;                    // 현재 순위
}
```

**예시 데이터**:
```json
{
  "id": "lt-k7-2026-team-001",
  "leagueId": "league-k7-2026",
  "teamId": "team-001",
  "teamName": "노원 FC",
  "joinedAt": "2026-01-15T10:00:00Z",
  "status": "approved",
  "approvedBy": "user-123",
  "approvedAt": "2026-01-16T14:30:00Z",
  "matchesPlayed": 8,
  "wins": 5,
  "draws": 2,
  "losses": 1,
  "points": 17,
  "rank": 2
}
```

---

### 4. `league_games/{gameId}` - 리그 경기

```typescript
interface LeagueGame {
  // 기본 정보
  id: string;
  leagueId: string;
  round: number;                    // 라운드 번호
  groupId?: string;                 // 조별 리그인 경우
  
  // 팀 정보 (Denormalized)
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  
  // 일정
  scheduledAt: Timestamp;
  facilityId?: string;             // 구장 ID
  facilityName?: string;            // 구장 이름
  
  // 결과
  status: "scheduled" | "live" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  playedAt?: Timestamp;
  
  // 연결
  teamGameId?: string;              // team_games/{teamGameId} 참조
  
  // 메타
  recordedBy?: string;              // 결과 입력한 사용자
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시 데이터**:
```json
{
  "id": "game-k7-2026-r1-g1",
  "leagueId": "league-k7-2026",
  "round": 1,
  "homeTeamId": "team-001",
  "homeTeamName": "노원 FC",
  "awayTeamId": "team-002",
  "awayTeamName": "노원 유나이티드",
  "scheduledAt": "2026-03-10T14:00:00Z",
  "facilityId": "facility-001",
  "facilityName": "마들스타디움",
  "status": "completed",
  "homeScore": 2,
  "awayScore": 1,
  "playedAt": "2026-03-10T14:30:00Z",
  "teamGameId": "tg-001",
  "recordedBy": "user-123",
  "createdAt": "2026-02-15T10:00:00Z"
}
```

---

### 5. `league_standings/{leagueId}_{teamId}` - 리그 순위

```typescript
interface LeagueStanding {
  // 기본 정보
  id: string;                       // "{leagueId}_{teamId}"
  leagueId: string;
  teamId: string;
  teamName: string;                 // Denormalized
  
  // 경기 통계
  games: number;                    // 경기 수
  wins: number;
  draws: number;
  losses: number;
  
  // 득실점
  goalsFor: number;                 // 득점
  goalsAgainst: number;             // 실점
  goalDifference: number;          // 골득실차
  
  // 승점
  points: number;                   // 승점 (wins * 3 + draws * 1)
  
  // 순위
  rank: number;                     // 현재 순위
  previousRank?: number;            // 이전 순위
  rankChange?: number;              // 순위 변동 (+1, -1, 0)
  
  // 업데이트
  lastUpdatedAt: Timestamp;
}
```

**예시 데이터**:
```json
{
  "id": "league-k7-2026_team-001",
  "leagueId": "league-k7-2026",
  "teamId": "team-001",
  "teamName": "노원 FC",
  "games": 8,
  "wins": 5,
  "draws": 2,
  "losses": 1,
  "goalsFor": 18,
  "goalsAgainst": 8,
  "goalDifference": 10,
  "points": 17,
  "rank": 2,
  "previousRank": 3,
  "rankChange": 1,
  "lastUpdatedAt": "2026-03-10T15:00:00Z"
}
```

---

### 6. `federation_teams/{federationTeamId}` - 협회 소속 팀

```typescript
interface FederationTeam {
  // 기본 정보
  id: string;
  federationId: string;
  teamId: string;                   // teams/{teamId} 참조
  teamName: string;                 // Denormalized
  
  // 소속 정보
  joinedAt: Timestamp;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  
  // 승인 정보
  approvedBy?: string;
  approvedAt?: Timestamp;
  
  // 통계 (집계)
  leagueCount: number;              // 참가 중인 리그 수
  totalMatches: number;             // 총 경기 수
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
}
```

---

### 7. `federation_players/{playerId}` - 협회 등록 선수

```typescript
interface FederationPlayer {
  // 기본 정보
  id: string;
  federationId: string;
  userId: string;                   // users/{userId} 참조
  playerName: string;                // Denormalized
  
  // 팀 정보
  teamId: string;                   // teams/{teamId} 참조
  teamName: string;                 // Denormalized
  
  // 선수 정보
  position?: string;                 // 포지션
  jerseyNumber?: number;            // 등번호
  birthDate?: Timestamp;            // 생년월일
  
  // 등록 정보
  registeredAt: Timestamp;
  status: "active" | "inactive" | "suspended";
  
  // 통계 (집계)
  leagueCount: number;              // 참가 중인 리그 수
  totalMatches: number;             // 총 경기 수
  totalGoals?: number;              // 총 득점 (축구)
  totalAssists?: number;            // 총 어시스트 (축구)
}
```

---

### 8. `seasons/{seasonId}` - 시즌

```typescript
interface Season {
  // 기본 정보
  id: string;
  federationId: string;
  name: string;                     // "2026 전반기"
  year: number;                     // 2026
  period: "spring" | "summer" | "fall" | "winter" | "full";
  
  // 일정
  startDate: Timestamp;
  endDate: Timestamp;
  
  // 상태
  status: "upcoming" | "active" | "completed";
  
  // 통계
  leagueCount: number;
  teamCount: number;
  matchCount: number;
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 9. `federation_announcements/{announcementId}` - 협회 공지

```typescript
interface FederationAnnouncement {
  // 기본 정보
  id: string;
  federationId: string;
  title: string;
  content: string;
  
  // 분류
  category: "general" | "league" | "registration" | "event" | "facility";
  priority: "normal" | "important" | "urgent";
  
  // 연결
  leagueId?: string;               // 특정 리그 공지인 경우
  
  // 작성자
  authorId: string;
  authorName: string;
  
  // 상태
  isPublished: boolean;
  publishedAt?: Timestamp;
  
  // 조회수
  viewCount: number;
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 🔗 관계 및 참조 구조

### 계층 구조

```
Federation (1)
 ├─ Leagues (N)
 │   ├─ League Teams (N)
 │   ├─ League Games (N)
 │   └─ League Standings (N)
 ├─ Federation Teams (N)
 ├─ Federation Players (N)
 ├─ Seasons (N)
 └─ Announcements (N)
```

### 참조 규칙

1. **Federation → League**: `league.federationId` (직접 참조)
2. **League → Team**: `league_teams.teamId` → `teams/{teamId}` (간접 참조)
3. **League → Game**: `league_games.leagueId` (직접 참조)
4. **Game → Team**: `league_games.homeTeamId`, `awayTeamId` → `teams/{teamId}` (간접 참조)
5. **Standing → League**: `league_standings.leagueId` (직접 참조)
6. **Standing → Team**: `league_standings.teamId` → `teams/{teamId}` (간접 참조)

### Denormalization 전략

**성능 최적화를 위한 Denormalization**:

1. **Team Name**: `league_teams.teamName`, `league_games.homeTeamName`, `league_standings.teamName`
   - 이유: 팀 이름 조회 빈도가 높고, 변경 빈도가 낮음

2. **Facility Name**: `league_games.facilityName`
   - 이유: 구장 이름 조회 빈도가 높음

3. **Player Name**: `federation_players.playerName`
   - 이유: 선수 이름 조회 빈도가 높음

---

## 📍 Firestore 인덱스 설계

### 필수 복합 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "leagues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
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
      "collectionGroup": "league_games",
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
    },
    {
      "collectionGroup": "federation_teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "joinedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## ⚙️ Cloud Functions 트리거

### 자동 집계 트리거

#### 1. `onLeagueGameWrite` - 리그 경기 결과 입력 시

```typescript
// 트리거: league_games/{gameId} 쓰기
// 역할: league_standings 자동 업데이트

export const onLeagueGameWrite = functions.firestore
  .document("league_games/{gameId}")
  .onWrite(async (change, context) => {
    const game = change.after.data() as LeagueGame;
    
    if (game.status === "completed" && game.homeScore !== undefined) {
      // 홈팀 순위 업데이트
      await updateStanding(game.leagueId, game.homeTeamId, {
        goalsFor: game.homeScore,
        goalsAgainst: game.awayScore,
        result: game.homeScore > game.awayScore ? "win" : 
                game.homeScore < game.awayScore ? "loss" : "draw"
      });
      
      // 어웨이팀 순위 업데이트
      await updateStanding(game.leagueId, game.awayTeamId, {
        goalsFor: game.awayScore,
        goalsAgainst: game.homeScore,
        result: game.homeScore < game.awayScore ? "win" : 
                game.homeScore > game.awayScore ? "loss" : "draw"
      });
    }
  });
```

#### 2. `onLeagueTeamWrite` - 리그 참가 팀 변경 시

```typescript
// 트리거: league_teams/{leagueTeamId} 쓰기
// 역할: leagues.teamCount 자동 업데이트

export const onLeagueTeamWrite = functions.firestore
  .document("league_teams/{leagueTeamId}")
  .onWrite(async (change, context) => {
    const leagueTeam = change.after.data() as LeagueTeam;
    const leagueRef = admin.firestore().doc(`leagues/${leagueTeam.leagueId}`);
    
    // teamCount 집계
    const teamsSnapshot = await admin.firestore()
      .collection("league_teams")
      .where("leagueId", "==", leagueTeam.leagueId)
      .where("status", "==", "approved")
      .get();
    
    await leagueRef.update({
      teamCount: teamsSnapshot.size,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
```

#### 3. `onLeagueWrite` - 리그 생성/수정 시

```typescript
// 트리거: leagues/{leagueId} 쓰기
// 역할: federations.leagueCount 자동 업데이트

export const onLeagueWrite = functions.firestore
  .document("leagues/{leagueId}")
  .onWrite(async (change, context) => {
    const league = change.after.data() as League;
    const federationRef = admin.firestore().doc(`federations/${league.federationId}`);
    
    // leagueCount 집계
    const leaguesSnapshot = await admin.firestore()
      .collection("leagues")
      .where("federationId", "==", league.federationId)
      .where("status", "in", ["registration", "active"])
      .get();
    
    await federationRef.update({
      leagueCount: leaguesSnapshot.size,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
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

// 리그 관리자 체크
function isLeagueAdmin(
  userId: string,
  league: League,
  federation: Federation
): boolean {
  return isFederationAdmin(userId, federation) ||
         league.adminIds?.includes(userId);
}
```

---

## 🌐 URL 구조

### 협회 홈페이지

```
/federations/{federationSlug}
  → 협회 홈 (Overview)
  
/federations/{federationSlug}/leagues
  → 리그 목록
  
/federations/{federationSlug}/leagues/{leagueSlug}
  → 리그 상세 (Overview, Teams, Matches, Standings)
  
/federations/{federationSlug}/teams
  → 소속 팀 목록
  
/federations/{federationSlug}/players
  → 등록 선수 목록
  
/federations/{federationSlug}/announcements
  → 공지사항
```

### 관리자 대시보드

```
/admin/federations/{federationSlug}
  → 협회 관리 대시보드
  
/admin/federations/{federationSlug}/leagues/create
  → 리그 생성
  
/admin/federations/{federationSlug}/leagues/{leagueSlug}
  → 리그 관리 (팀 승인, 경기 일정, 결과 입력)
  
/admin/federations/{federationSlug}/teams
  → 팀 승인 관리
  
/admin/federations/{federationSlug}/settings
  → 협회 설정
```

---

## 🚀 협회 생성 플로우 (3분 생성)

### Step 1: AI 질문 수집

```typescript
interface AIConversationData {
  sport: "soccer" | "basketball" | "baseball" | "volleyball" | "badminton" | "other";
  targetAudience: "youth" | "teen" | "adult" | "mixed";
  operationType: "league" | "tournament" | "mixed" | "event";
  participationUnit: "team" | "individual" | "both";
  baseType: "region" | "school" | "company" | "online" | "other";
}
```

### Step 2: AI 분석 및 템플릿 추천

```typescript
interface FederationTemplate {
  id: string;
  name: string;
  description: string;
  features: string[];
  defaultLeagues: string[];        // 기본 생성될 리그 목록
  defaultMenus: string[];           // 기본 메뉴 구조
  defaultSettings: FederationSettings;
}

// 예시: 지역 생활체육 축구협회 템플릿
const template: FederationTemplate = {
  id: "region-adult-soccer-league",
  name: "지역 생활체육 축구협회",
  description: "지역 기반 성인 축구 리그 운영 템플릿",
  features: [
    "리그 운영",
    "팀 관리",
    "선수 등록",
    "경기 일정",
    "결과 입력",
    "순위 자동 계산"
  ],
  defaultLeagues: [
    "K7 리그",
    "K5 리그"
  ],
  defaultMenus: [
    "홈",
    "리그",
    "경기",
    "팀",
    "순위",
    "공지",
    "문의"
  ],
  defaultSettings: {
    pointsForWin: 3,
    pointsForDraw: 1,
    maxTeamsPerLeague: 16,
    minTeamsPerLeague: 8
  }
};
```

### Step 3: 생성 미리보기

```typescript
interface FederationPreview {
  federation: {
    name: string;
    sport: string;
    region: string;
    operationType: string;
    participationUnit: string;
    baseType: string;
  };
  leagues: Array<{
    name: string;
    format: string;
    season: string;
  }>;
  menus: string[];
  adminFeatures: string[];
  defaultData: {
    season: string;
    leagues: string[];
    announcements: number;
  };
}
```

### Step 4: 실제 생성 (Cloud Function)

```typescript
// Cloud Function: createFederationFromTemplate

export const createFederationFromTemplate = functions.https
  .onCall(async (data, context) => {
    const {
      name,
      sport,
      region,
      operationType,
      participationUnit,
      baseType,
      templateId,
      ownerId
    } = data;
    
    // 1. Federation 생성
    const federationRef = admin.firestore().collection("federations").doc();
    const slug = generateSlug(name);
    
    await federationRef.set({
      id: federationRef.id,
      name,
      slug,
      sport,
      region,
      operationType,
      participationUnit,
      baseType,
      ownerId,
      adminIds: [ownerId],
      status: "active",
      leagueCount: 0,
      teamCount: 0,
      playerCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 2. 기본 리그 생성 (템플릿 기반)
    const template = await getTemplate(templateId);
    const currentYear = new Date().getFullYear();
    
    for (const leagueName of template.defaultLeagues) {
      await createLeague({
        name: `${name} ${leagueName}`,
        slug: generateSlug(`${name} ${leagueName}`),
        federationId: federationRef.id,
        season: String(currentYear),
        sport,
        region,
        format: "round_robin",
        startDate: getSeasonStartDate(currentYear),
        endDate: getSeasonEndDate(currentYear),
        status: "draft",
        createdBy: ownerId
      });
    }
    
    // 3. 기본 시즌 생성
    await createSeason({
      federationId: federationRef.id,
      name: `${currentYear} 시즌`,
      year: currentYear,
      period: "full",
      startDate: getSeasonStartDate(currentYear),
      endDate: getSeasonEndDate(currentYear),
      status: "upcoming"
    });
    
    // 4. 기본 공지 생성
    await createAnnouncement({
      federationId: federationRef.id,
      title: `${name}에 오신 것을 환영합니다`,
      content: "협회가 생성되었습니다. 리그 참가 신청을 받고 있습니다.",
      category: "general",
      priority: "normal",
      authorId: ownerId,
      isPublished: true
    });
    
    return {
      success: true,
      federationId: federationRef.id,
      slug
    };
  });
```

---

## 📊 생성되는 실제 구조 예시

### 노원구 축구협회 생성 시

```
Federation: "노원구 축구협회"
  ├─ League: "노원구 K7 리그"
  │   ├─ League Teams: 12팀
  │   ├─ League Games: 66경기
  │   └─ League Standings: 12팀 순위
  │
  ├─ League: "노원구 K5 리그"
  │   ├─ League Teams: 8팀
  │   ├─ League Games: 28경기
  │   └─ League Standings: 8팀 순위
  │
  ├─ Season: "2026 시즌"
  ├─ Announcements: 1개 (환영 공지)
  └─ Settings: 기본 설정
```

### URL 구조

```
협회 홈: yago.io/federations/no-won-football
리그 목록: yago.io/federations/no-won-football/leagues
K7 리그: yago.io/federations/no-won-football/leagues/k7-league-2026
관리자: yago.io/admin/federations/no-won-football
```

---

## 🎯 핵심 가치

### 1. 확장성

**Federation → Multiple Leagues** 구조로:
- 하나의 협회가 여러 리그 운영 가능
- 리그별 독립적인 운영 (팀, 경기, 순위)
- 시즌별 리그 관리 용이

### 2. 자동화

- 경기 결과 입력 시 순위 자동 계산
- 리그/협회 통계 자동 집계
- Cloud Functions 기반 실시간 업데이트

### 3. 유연성

- 템플릿 기반 빠른 생성 (3분)
- 리그별 커스터마이징 가능
- 다양한 운영 방식 지원 (리그/토너먼트/혼합)

---

## 📋 구현 체크리스트

### Phase 1: 기본 구조
- [ ] Federation 타입 정의
- [ ] League 타입 정의
- [ ] Firestore 컬렉션 생성
- [ ] 기본 인덱스 설정

### Phase 2: 생성 플로우
- [ ] AI 질문 Wizard 구현
- [ ] 템플릿 추천 시스템
- [ ] 생성 미리보기 화면
- [ ] Cloud Function: createFederationFromTemplate

### Phase 3: 리그 운영
- [ ] 리그 생성/수정/조회
- [ ] 팀 참가 신청/승인
- [ ] 경기 일정 생성
- [ ] 경기 결과 입력
- [ ] 순위 자동 계산

### Phase 4: 관리자 기능
- [ ] 협회 관리 대시보드
- [ ] 리그 관리 화면
- [ ] 팀 승인 관리
- [ ] 공지 관리

### Phase 5: Cloud Functions
- [ ] onLeagueGameWrite (순위 자동 업데이트)
- [ ] onLeagueTeamWrite (통계 집계)
- [ ] onLeagueWrite (리그 수 집계)

---

## 🔥 다음 단계

이 아키텍처를 기반으로:

1. **타입 정의 파일 생성** (`src/types/federation.ts` 업데이트)
2. **서비스 레이어 구현** (`src/services/federationService.ts`)
3. **AI 생성 플로우 구현** (5단계 Wizard)
4. **Cloud Functions 구현** (자동 집계)

원하시면 다음 단계로 바로 진행하겠습니다! 🚀
