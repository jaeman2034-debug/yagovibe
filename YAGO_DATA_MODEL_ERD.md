# 📊 YAGO VIBE SPORTS - 전체 데이터 모델 ERD

> **작성일**: 2024년  
> **목적**: YAGO 플랫폼의 완전한 데이터 모델 및 관계도

---

## 📋 목차

1. [전체 ERD 개요](#1-전체-erd-개요)
2. [핵심 엔티티](#2-핵심-엔티티)
3. [관계 다이어그램](#3-관계-다이어그램)
4. [상세 스키마](#4-상세-스키마)

---

## 1️⃣ 전체 ERD 개요

### 엔티티 계층 구조

```
Platform Level
  ├─ users
  └─ federations
      ├─ pages
      ├─ menus
      ├─ notices
      ├─ documents
      ├─ sponsors
      ├─ staff
      ├─ admins
      ├─ aiAgents
      │
      ├─ tournaments
      │   ├─ teams
      │   ├─ matches
      │   └─ brackets
      │
      ├─ leagues
      │   └─ seasons
      │       ├─ teams
      │       ├─ matches
      │       ├─ standings
      │       └─ stats
      │
      ├─ teams
      │   └─ roster
      │
      └─ players
```

---

## 2️⃣ 핵심 엔티티

### 1. users (플랫폼 사용자)

```typescript
{
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "ADMIN" | "USER";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**관계**:
- `federations/{federationId}/admins/{userId}` (1:N)
- `federations/{federationId}/teams/{teamId}/roster/{playerId}` (1:N)

---

### 2. federations (협회)

```typescript
{
  id: string;
  name: string;
  slug: string;
  region: string;
  sportType: "football" | "basketball" | "baseball" | ...;
  status: "active" | "inactive" | "suspended";
  logoUrl?: string;
  heroImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  homepageVisible: boolean;
  adminEnabled: boolean;
  templateId: string;
  adminUids: string[];
  superAdminUids: string[];
  defaultTournamentType: "round_robin" | "knockout" | "hybrid";
  ageGroups: string[];
  divisions: string[];
  stats: {
    activeTournaments: number;
    activeLeagues: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**관계**:
- `pages` (1:N)
- `menus` (1:N)
- `notices` (1:N)
- `tournaments` (1:N)
- `leagues` (1:N)
- `teams` (1:N)
- `players` (1:N)
- `admins` (1:N)
- `aiAgents` (1:N)

---

### 3. tournaments (대회)

```typescript
{
  id: string;
  federationId: string;
  name: string;
  slug: string;
  category: "adult" | "youth" | "mixed";
  competitionType: "knockout" | "round_robin" | "hybrid";
  sportType: string;
  gender: "men" | "women" | "mixed";
  ageGroup: string;
  description?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  maxTeams: number;
  minTeams: number;
  entryFee?: number;
  prizePool?: number;
  status: "draft" | "registration" | "ongoing" | "completed" | "cancelled";
  visible: boolean;
  bracketType?: "single" | "double" | "round_robin";
  bracketData?: any;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**관계**:
- `federations/{federationId}` (N:1)
- `teams` (N:M)
- `matches` (1:N)
- `brackets` (1:N)

---

### 4. leagues (리그)

```typescript
{
  id: string;
  federationId: string;
  name: string;
  slug: string;
  category: "adult" | "youth" | "mixed";
  sportType: string;
  gender: "men" | "women" | "mixed";
  ageGroup: string;
  description?: string;
  status: "draft" | "active" | "completed" | "cancelled";
  visible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**관계**:
- `federations/{federationId}` (N:1)
- `seasons` (1:N)

---

### 5. seasons (시즌)

```typescript
{
  id: string;
  federationId: string;
  leagueId: string;
  name: string;
  slug: string;
  year: number;
  seasonNumber: number;
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  maxTeams: number;
  minTeams: number;
  scheduleType: "round_robin" | "custom";
  roundsPerTeam: number;
  status: "draft" | "registration" | "ongoing" | "completed" | "cancelled";
  visible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**관계**:
- `leagues/{leagueId}` (N:1)
- `teams` (N:M)
- `matches` (1:N)
- `standings` (1:N)
- `stats` (1:N)

---

### 6. teams (팀)

```typescript
{
  id: string;
  federationId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  foundedYear?: number;
  homeStadium?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  description?: string;
  status: "pending" | "active" | "inactive" | "suspended";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**관계**:
- `federations/{federationId}` (N:1)
- `roster` (1:N)
- `tournaments/{tournamentId}/teams` (N:M)
- `seasons/{seasonId}/teams` (N:M)

---

### 7. players (선수)

```typescript
{
  id: string;
  federationId: string;
  userId?: string;
  name: string;
  photoUrl?: string;
  dateOfBirth?: Timestamp;
  position?: string[];
  jerseyNumber?: number;
  height?: number;
  weight?: number;
  nationality?: string;
  status: "active" | "inactive" | "suspended";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**관계**:
- `federations/{federationId}` (N:1)
- `teams/{teamId}/roster` (N:M)
- `matches/{matchId}/lineups` (N:M)
- `matches/{matchId}/events` (N:1)

---

### 8. matches (경기)

```typescript
{
  id: string;
  federationId: string;
  tournamentId?: string;
  seasonId?: string;
  matchNumber: number;
  round?: number;
  group?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: Timestamp;
  matchTime: string;
  venue: string;
  status: "scheduled" | "live" | "completed" | "cancelled" | "postponed";
  homeScore?: number;
  awayScore?: number;
  homeScoreDetail?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    ot?: number;
  };
  awayScoreDetail?: {
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    ot?: number;
  };
  referee?: string;
  attendance?: number;
  weather?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**관계**:
- `federations/{federationId}` (N:1)
- `tournaments/{tournamentId}` (N:1, optional)
- `seasons/{seasonId}` (N:1, optional)
- `teams/{homeTeamId}` (N:1)
- `teams/{awayTeamId}` (N:1)
- `events` (1:N)
- `lineups` (1:N)

---

### 9. standings (순위)

```typescript
{
  id: string;
  federationId: string;
  seasonId: string;
  teamId: string;
  teamName: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[]; // ["W", "W", "L", "D", "W"]
  lastUpdated: Timestamp;
}
```

**관계**:
- `seasons/{seasonId}` (N:1)
- `teams/{teamId}` (N:1)

---

### 10. aiAgents (AI 에이전트)

```typescript
{
  id: string;
  federationId: string;
  name: string;
  agentType: "general-assistant" | "tournament-guide" | "match-ops" | 
             "team-registration" | "player-registration" | "rules-docs" | 
             "admin-ops" | "sponsor-assistant";
  enabled: boolean;
  scope: "public" | "admin";
  knowledgeSources: string[];
  uiPlacement: "homepage-chat" | "admin-panel" | "tournament-page";
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**관계**:
- `federations/{federationId}` (N:1)

---

## 3️⃣ 관계 다이어그램

### 주요 관계

```
users
  ├─→ federations/admins (관리자)
  └─→ teams/roster (선수)

federations
  ├─→ pages (1:N)
  ├─→ menus (1:N)
  ├─→ notices (1:N)
  ├─→ tournaments (1:N)
  ├─→ leagues (1:N)
  ├─→ teams (1:N)
  ├─→ players (1:N)
  ├─→ admins (1:N)
  └─→ aiAgents (1:N)

tournaments
  ├─→ teams (N:M)
  ├─→ matches (1:N)
  └─→ brackets (1:N)

leagues
  └─→ seasons (1:N)

seasons
  ├─→ teams (N:M)
  ├─→ matches (1:N)
  ├─→ standings (1:N)
  └─→ stats (1:N)

teams
  ├─→ roster (1:N)
  ├─→ tournaments/teams (N:M)
  └─→ seasons/teams (N:M)

matches
  ├─→ teams (2:1, home/away)
  ├─→ events (1:N)
  └─→ lineups (1:N)

players
  ├─→ teams/roster (N:M)
  ├─→ matches/lineups (N:M)
  └─→ matches/events (N:1)
```

---

## 4️⃣ 상세 스키마

### 4.1 Sub-collections

#### federations/{federationId}/pages/{pageId}

```typescript
{
  id: string;
  federationId: string;
  title: string;
  slug: string;
  pageType: "content" | "list" | "form";
  status: "draft" | "published";
  contentHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### federations/{federationId}/notices/{noticeId}

```typescript
{
  id: string;
  federationId: string;
  title: string;
  content: string;
  category: "general" | "tournament" | "registration" | "result";
  isPinned: boolean;
  attachments?: string[];
  viewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### federations/{federationId}/matches/{matchId}/events/{eventId}

```typescript
{
  id: string;
  matchId: string;
  eventType: "goal" | "assist" | "yellow_card" | "red_card" | 
             "substitution" | "penalty" | "own_goal";
  minute: number;
  playerId?: string;
  playerName?: string;
  teamId: string;
  teamName: string;
  description?: string;
  createdAt: Timestamp;
}
```

#### federations/{federationId}/matches/{matchId}/lineups/{playerId}

```typescript
{
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  jerseyNumber: number;
  isStarting: boolean;
  substitutionMinute?: number;
  createdAt: Timestamp;
}
```

---

### 4.2 인덱스 전략

#### 복합 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "notices",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "isPinned", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "matchDate", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standings",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "seasonId", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "teams",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## ✅ 데이터 모델 요약

### 핵심 원칙

1. **멀티 테넌트**: `federationId` 기반 완전 분리
2. **확장성**: Sub-collection 기반 계층 구조
3. **성능**: 복합 인덱스 최적화
4. **일관성**: 타임스탬프 및 생성자 추적

### 데이터 흐름

```
사용자 생성
  ↓
협회 생성 (Federation Builder)
  ↓
리그/대회 생성
  ↓
팀 등록
  ↓
선수 등록
  ↓
경기 생성 (자동 대진표)
  ↓
경기 결과 입력
  ↓
순위 자동 업데이트
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO 전체 데이터 모델 ERD 완료
