# YAGO Platform - Database ERD (완전판)

## 🎯 목표

**실제 서비스 수준의 데이터 모델 다이어그램 - Multi-Tenant + Player Identity + League System**

---

## 📊 전체 데이터 구조

```
YAGO Database
│
├─ Organizations (Multi-Tenant Root)
│   ├─ Seasons
│   │   └─ Leagues
│   │       ├─ League Teams
│   │       ├─ Matches
│   │       └─ Standings
│   │
│   ├─ Teams
│   │   └─ Team Members (Player Memberships)
│   │
│   ├─ Players (Global Identity)
│   │   └─ Player Memberships
│   │
│   ├─ Announcements
│   │
│   └─ Activities (Feed)
```

---

## 🗂️ Core Collections

### 1. Organizations (조직)

**Collection**: `organizations`

**Purpose**: Multi-Tenant 루트, 모든 데이터의 기준점

```typescript
interface Organization {
  id: string;                    // organizationId
  slug: string;                   // URL slug (nowon-fa)
  name: string;                   // 노원구 축구협회
  type: "federation" | "academy" | "club";
  sport: string;                  // football, basketball, etc.
  
  // UI Assets
  logoUrl?: string;
  heroImageUrl?: string;
  description?: string;
  
  // Template
  templateId: string;            // 사용된 템플릿 ID
  
  // Metadata
  ownerId: string;                // 생성자 UID
  status: "active" | "inactive" | "archived";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `slug` (unique)
- `ownerId`
- `type`
- `sport`

---

### 2. Seasons (시즌)

**Collection**: `seasons`

**Purpose**: 리그의 시간 단위

```typescript
interface Season {
  id: string;
  organizationId: string;
  
  name: string;                   // 2026 시즌
  year: number;                   // 2026
  startDate: Timestamp;
  endDate: Timestamp;
  
  status: "draft" | "active" | "completed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId`
- `organizationId + year` (composite)
- `status`

---

### 3. Leagues (리그)

**Collection**: `leagues`

**Purpose**: 리그 정보

```typescript
interface League {
  id: string;
  organizationId: string;
  seasonId: string;
  
  name: string;                   // K7 리그
  slug: string;                   // k7-league
  sport: string;
  description?: string;
  
  format: "round_robin" | "tournament" | "hybrid";
  status: "draft" | "registration" | "active" | "completed";
  
  // Dates
  startDate: Timestamp;
  endDate: Timestamp;
  
  // Stats (denormalized)
  teamCount: number;
  matchCount: number;
  completedMatchCount: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId`
- `seasonId`
- `organizationId + slug` (composite, unique)
- `status`

---

### 4. Teams (팀)

**Collection**: `teams`

**Purpose**: 팀 정보 (Organization 단위)

```typescript
interface Team {
  id: string;
  organizationId: string;
  
  name: string;                   // 노원FC
  slug: string;                   // nowon-fc
  logoUrl?: string;
  description?: string;
  
  // Manager
  managerId?: string;             // 팀장 UID
  
  // Stats (denormalized)
  memberCount: number;
  
  status: "active" | "inactive";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId`
- `organizationId + slug` (composite, unique)
- `managerId`

---

### 5. League Teams (리그 참가 팀)

**Collection**: `league_teams`

**Purpose**: 리그와 팀의 다대다 관계

```typescript
interface LeagueTeam {
  id: string;
  leagueId: string;
  teamId: string;
  organizationId: string;
  
  // Team Info (denormalized)
  teamName: string;
  teamLogoUrl?: string;
  
  // Registration
  registeredAt: Timestamp;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  
  createdAt: Timestamp;
}
```

**Indexes**:
- `leagueId`
- `teamId`
- `leagueId + teamId` (composite, unique)
- `organizationId`

---

### 6. Players (선수 - Global Identity)

**Collection**: `players`

**Purpose**: 플랫폼 전체 선수 신원 (Multi-Tenant 아님)

```typescript
interface Player {
  id: string;                     // Global Player ID
  userId?: string;                // User UID (선택적 연결)
  
  // Identity
  name: string;
  birthYear?: number;
  position?: string;              // FW, MF, DF, GK
  profileImageUrl?: string;
  
  // Stats (aggregated across all organizations)
  totalMatches?: number;
  totalGoals?: number;
  totalAssists?: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `userId` (unique, sparse)
- `name`
- `position`

**Note**: Player는 Multi-Tenant가 아님. 플랫폼 전체에서 하나의 신원.

---

### 7. Player Memberships (선수 소속)

**Collection**: `player_memberships`

**Purpose**: 선수가 어느 조직/팀에 속하는지 관리

```typescript
interface PlayerMembership {
  id: string;
  playerId: string;               // Global Player ID
  organizationId: string;
  teamId?: string;                 // 팀 소속 (선택적)
  leagueId?: string;              // 리그 참가 (선택적)
  
  // Role
  role?: "player" | "captain" | "manager";
  
  // Season
  seasonId?: string;
  
  // Dates
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  
  status: "active" | "inactive" | "transferred";
  createdAt: Timestamp;
}
```

**Indexes**:
- `playerId`
- `organizationId`
- `teamId`
- `leagueId`
- `playerId + organizationId + teamId` (composite)
- `organizationId + teamId`

---

### 8. Matches (경기)

**Collection**: `matches`

**Purpose**: 경기 정보

```typescript
interface Match {
  id: string;
  organizationId: string;
  leagueId: string;
  
  // Teams
  homeTeamId: string;
  awayTeamId: string;
  
  // Team Names (denormalized)
  homeTeamName: string;
  awayTeamName: string;
  
  // Schedule
  scheduledAt: Timestamp;
  facilityName?: string;
  facilityAddress?: string;
  
  // Result
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  playedAt?: Timestamp;
  
  // AI Report
  matchReportId?: string;         // AI 생성 리포트 ID
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId`
- `leagueId`
- `homeTeamId`
- `awayTeamId`
- `scheduledAt`
- `status`
- `leagueId + scheduledAt` (composite)

---

### 9. Match Events (경기 이벤트)

**Collection**: `match_events`

**Purpose**: 경기 중 이벤트 (득점, 어시스트, 경고 등)

```typescript
interface MatchEvent {
  id: string;
  matchId: string;
  organizationId: string;
  
  // Event Info
  minute: number;                 // 경기 시간 (분)
  eventType: "goal" | "assist" | "yellow_card" | "red_card" | "substitution";
  
  // Team & Player
  teamId: string;
  playerId?: string;              // 이벤트 주체
  playerName?: string;            // denormalized
  
  // Additional Data
  assistPlayerId?: string;        // 어시스트 선수 (goal일 때)
  notes?: string;                 // 추가 정보
  
  createdAt: Timestamp;
}
```

**Indexes**:
- `matchId`
- `matchId + minute` (composite)
- `playerId`
- `teamId`

---

### 10. Match Player Stats (경기 선수 통계)

**Collection**: `match_player_stats`

**Purpose**: 경기별 선수 통계

```typescript
interface MatchPlayerStat {
  id: string;
  matchId: string;
  playerId: string;
  teamId: string;
  organizationId: string;
  
  // Stats
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed?: number;
  
  createdAt: Timestamp;
}
```

**Indexes**:
- `matchId`
- `playerId`
- `matchId + playerId` (composite, unique)
- `teamId`

---

### 11. Standings (순위표)

**Collection**: `standings`

**Purpose**: 리그 순위 (자동 계산)

```typescript
interface Standing {
  id: string;
  leagueId: string;
  teamId: string;
  organizationId: string;
  
  // Team Info (denormalized)
  teamName: string;
  teamLogoUrl?: string;
  
  // Stats
  games: number;                 // 경기 수
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;        // goalsFor - goalsAgainst
  points: number;                // 승점
  
  // Rank
  rank: number;
  previousRank?: number;          // 이전 순위
  rankChange?: number;            // 순위 변동 (+1, -2, etc.)
  
  // Last Updated
  lastUpdatedAt: Timestamp;
  createdAt: Timestamp;
}
```

**Indexes**:
- `leagueId`
- `leagueId + rank` (composite)
- `leagueId + points` (composite, descending)
- `teamId`

**Note**: Cloud Function에서 경기 결과 입력 시 자동 계산/업데이트

---

### 12. Announcements (공지)

**Collection**: `announcements`

**Purpose**: 조직 공지사항

```typescript
interface Announcement {
  id: string;
  organizationId: string;
  
  title: string;
  content: string;
  summary?: string;
  thumbnailUrl?: string;
  
  authorId: string;
  authorName?: string;            // denormalized
  
  // Visibility
  visibility: "public" | "team" | "private";
  targetTeamIds?: string[];       // 특정 팀만 볼 수 있음
  
  // Status
  status: "draft" | "published" | "archived";
  publishedAt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId`
- `organizationId + status` (composite)
- `organizationId + publishedAt` (composite, descending)
- `authorId`

---

### 13. Activities (피드)

**Collection**: `activities`

**Purpose**: Community Feed (단일 소스)

```typescript
interface Activity {
  id: string;
  organizationId?: string;        // 조직별 피드 (선택적)
  
  type: "team_created" | "team_notice" | "team_event" | 
        "market_created" | "recruit_created" | "match_created" | 
        "equipment_created" | "league_created" | "match_result";
  
  refType: "teams" | "notices" | "events" | "market" | 
           "recruit" | "match" | "equipment" | "leagues";
  refId: string;
  
  authorId: string;
  teamId?: string;
  
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  
  visibility: "public" | "team" | "private";
  
  // Engagement
  likeCount: number;
  commentCount: number;
  
  createdAt: Timestamp;
}
```

**Indexes**:
- `organizationId + visibility + createdAt` (composite, descending)
- `visibility + createdAt` (composite, descending) - Global feed
- `authorId + createdAt` (composite, descending)
- `teamId + createdAt` (composite, descending)
- `refType + refId` (composite)

---

### 14. Users (사용자)

**Collection**: `users`

**Purpose**: 플랫폼 사용자

```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  
  // Profile
  displayName?: string;
  email: string;
  photoURL?: string;
  
  // Platform Role
  role: "ADMIN" | "USER";         // 플랫폼 권한
  
  // Organization Roles
  organizationRoles?: {
    [organizationId: string]: "super_admin" | "org_admin" | 
                             "event_manager" | "stats_manager" | "viewer";
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `email` (unique)
- `role`

---

## 🔗 관계도 (Relationships)

### 1. Organization Hierarchy

```
Organization (1)
  └─ Season (N)
      └─ League (N)
          ├─ LeagueTeam (N)
          ├─ Match (N)
          └─ Standing (N)
```

### 2. Team Structure

```
Organization (1)
  └─ Team (N)
      └─ PlayerMembership (N)
          └─ Player (1)
```

### 3. Match Structure

```
League (1)
  └─ Match (N)
      ├─ MatchEvent (N)
      └─ MatchPlayerStat (N)
          └─ Player (1)
```

### 4. Player Identity

```
Player (1) - Global Identity
  └─ PlayerMembership (N)
      ├─ Organization (1)
      ├─ Team (1, optional)
      └─ League (1, optional)
```

---

## 📊 데이터 흐름

### 1. Organization 생성

```
Organization Builder
  ↓
organizations/{id} 생성
  ↓
Template 기반 초기 데이터 생성
  ↓
seasons/{id} 생성 (기본 시즌)
```

### 2. League 생성

```
Admin Dashboard
  ↓
leagues/{id} 생성
  ↓
league_teams/{id} 생성 (팀 등록)
  ↓
matches/{id} 생성 (일정 생성)
```

### 3. 경기 결과 입력

```
Admin Match Manager
  ↓
matches/{id} 업데이트 (점수)
  ↓
match_events/{id} 생성 (이벤트)
  ↓
match_player_stats/{id} 생성 (선수 통계)
  ↓
standings/{id} 자동 계산 (Cloud Function)
  ↓
activities/{id} 생성 (경기 결과 피드)
```

### 4. Player 등록

```
Admin Player Manager
  ↓
players/{id} 생성/조회 (Global)
  ↓
player_memberships/{id} 생성 (소속)
```

---

## 🔐 Security Rules 패턴

### Organizations

```javascript
match /organizations/{orgId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == resource.data.ownerId 
               || isAdmin(request.auth.uid);
}
```

### Leagues

```javascript
match /organizations/{orgId}/leagues/{leagueId} {
  allow read: if request.auth != null;
  allow write: if isOrgAdmin(request.auth.uid, orgId);
}
```

### Teams

```javascript
match /organizations/{orgId}/teams/{teamId} {
  allow read: if request.auth != null;
  allow write: if isOrgAdmin(request.auth.uid, orgId);
}
```

### Players (Global)

```javascript
match /players/{playerId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == resource.data.userId 
               || isAdmin(request.auth.uid);
}
```

---

## ⚡ Cloud Functions 트리거

### 1. Standings 자동 계산

```typescript
// onMatchResultWrite
export const onMatchResultWrite = functions.firestore
  .document("matches/{matchId}")
  .onUpdate(async (snap, context) => {
    const match = snap.after.data();
    
    if (match.status === "completed") {
      // Standings 업데이트
      await updateStandings(match.leagueId);
    }
  });
```

### 2. Activity 자동 생성

```typescript
// onMatchCreated
export const onMatchCreated = functions.firestore
  .document("matches/{matchId}")
  .onCreate(async (snap, context) => {
    const match = snap.data();
    
    // Activity 생성
    await createActivity({
      type: "match_created",
      refType: "matches",
      refId: match.id,
      organizationId: match.organizationId,
      // ...
    });
  });
```

### 3. Player Stats 집계

```typescript
// onMatchPlayerStatWrite
export const onMatchPlayerStatWrite = functions.firestore
  .document("match_player_stats/{statId}")
  .onWrite(async (snap, context) => {
    // Player 통계 업데이트
    await updatePlayerStats(snap.data().playerId);
  });
```

---

## 📈 성능 최적화

### 1. Denormalization

- **Team Names in Matches**: `homeTeamName`, `awayTeamName`
- **Team Info in Standings**: `teamName`, `teamLogoUrl`
- **Player Names in Events**: `playerName`
- **Author Names in Announcements**: `authorName`

### 2. Aggregated Stats

- **League Stats**: `teamCount`, `matchCount`, `completedMatchCount`
- **Team Stats**: `memberCount`
- **Player Stats**: `totalMatches`, `totalGoals`, `totalAssists`

### 3. Indexes

모든 쿼리 패턴에 맞는 복합 인덱스 설정:
- `organizationId + createdAt` (descending)
- `leagueId + scheduledAt` (descending)
- `leagueId + points` (descending)

---

## ✅ 구현 체크리스트

### Phase 1: Core Collections
- [ ] organizations
- [ ] seasons
- [ ] leagues
- [ ] teams
- [ ] league_teams

### Phase 2: Match System
- [ ] matches
- [ ] match_events
- [ ] match_player_stats
- [ ] standings

### Phase 3: Player System
- [ ] players
- [ ] player_memberships

### Phase 4: Content
- [ ] announcements
- [ ] activities

### Phase 5: Cloud Functions
- [ ] Standings 자동 계산
- [ ] Activity 자동 생성
- [ ] Player Stats 집계

---

이 ERD로 **YAGO 플랫폼의 전체 데이터 구조를 완벽하게 이해**할 수 있습니다! 🚀
