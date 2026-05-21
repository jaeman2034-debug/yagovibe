# 🏗️ YAGO SPORTS 완전한 시스템 아키텍처

> **작성일**: 2024년  
> **목적**: YAGO SPORTS 플랫폼의 전체 시스템 구조, Firestore 스키마, ERD 설계

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [도메인 아키텍처](#2-도메인-아키텍처)
3. [Firestore 데이터베이스 구조](#3-firestore-데이터베이스-구조)
4. [ERD (Entity Relationship Diagram)](#4-erd-entity-relationship-diagram)
5. [라우터 구조](#5-라우터-구조)
6. [컴포넌트 구조](#6-컴포넌트-구조)
7. [서비스 레이어](#7-서비스-레이어)

---

## 1️⃣ 시스템 개요

### 플랫폼 철학

**YAGO SPORTS = Sports Operating System**

```
사용자 중심
  ↓
팀 중심
  ↓
경기 중심
  ↓
협회 중심
```

### 핵심 도메인

```
1. User (사용자)
2. Team (팀)
3. Member (멤버)
4. Match (경기)
5. Tournament (대회)
6. Player (선수)
7. Event (이벤트)
8. Academy (유소년 아카데미)
9. Stats (통계)
10. Chat (채팅)
```

---

## 2️⃣ 도메인 아키텍처

### 2-1. 도메인 계층 구조

```
YAGO SPORTS Platform
│
├─ User Domain (사용자)
│   ├─ Profile
│   ├─ Authentication
│   └─ Preferences
│
├─ Team Domain (팀)
│   ├─ Team Management
│   ├─ Team Members
│   ├─ Team Workspace
│   │   ├─ Chat
│   │   ├─ Notices
│   │   ├─ Events
│   │   ├─ Matches
│   │   └─ Blog
│   └─ Team Stats
│
├─ Match Domain (경기)
│   ├─ Match Schedule
│   ├─ Match Results
│   ├─ Match Stats
│   └─ Player Stats
│
├─ Tournament Domain (대회)
│   ├─ League Management
│   ├─ Bracket Tournament
│   ├─ Team Registration
│   ├─ Match Scheduling
│   └─ Standings
│
├─ Player Domain (선수)
│   ├─ Player Profile
│   ├─ Player Stats
│   ├─ Player History
│   └─ Player Awards
│
├─ Event Domain (이벤트)
│   ├─ Team Events
│   ├─ Event Management
│   ├─ Attendance
│   └─ Reminders
│
├─ Academy Domain (유소년 아카데미)
│   ├─ Academy Management
│   ├─ Training Programs
│   ├─ Coaches
│   └─ Youth Teams
│
├─ Stats Domain (통계)
│   ├─ Team Statistics
│   ├─ Player Statistics
│   ├─ Match Statistics
│   └─ Rankings
│
└─ Chat Domain (채팅)
    ├─ Team Chat
    ├─ Direct Messages
    ├─ Group Chat
    └─ Event Chat
```

### 2-2. 도메인 간 관계

```
User
  ├─→ Team (Member)
  ├─→ Player (Profile)
  └─→ Chat (Participant)

Team
  ├─→ Member (1:N)
  ├─→ Match (1:N)
  ├─→ Event (1:N)
  ├─→ Tournament (N:M)
  ├─→ Chat (1:1)
  └─→ Stats (1:1)

Match
  ├─→ Team (2:1) [Home/Away]
  ├─→ Player (N:M) [Players]
  ├─→ Tournament (N:1)
  └─→ Stats (1:1)

Tournament
  ├─→ Team (N:M)
  ├─→ Match (1:N)
  └─→ Standings (1:1)

Player
  ├─→ Team (N:1)
  ├─→ Match (N:M)
  ├─→ Stats (1:1)
  └─→ Academy (N:1)

Event
  ├─→ Team (N:1)
  └─→ User (N:M) [Attendees]

Academy
  ├─→ Player (1:N)
  ├─→ Coach (1:N)
  └─→ Program (1:N)
```

---

## 3️⃣ Firestore 데이터베이스 구조

### 3-1. 컬렉션 계층 구조

```
Firestore Root
│
├─ users/{userId}
│   └─ profile, preferences, settings
│
├─ teams/{teamId}
│   ├─ members/{memberId}
│   ├─ notices/{noticeId}
│   ├─ events/{eventId}
│   ├─ blog_posts/{postId}
│   └─ activities/{activityId}
│
├─ teamSchedules/{scheduleId}
│   └─ teamId, type, dateTime, location
│
├─ matches/{matchId}
│   ├─ events/{eventId}
│   ├─ lineups/{lineupId}
│   └─ stats/{statId}
│
├─ tournaments/{tournamentId}
│   ├─ teams/{teamId}
│   ├─ matches/{matchId}
│   ├─ standings/{standingId}
│   └─ brackets/{bracketId}
│
├─ players/{playerId}
│   ├─ stats/{statId}
│   ├─ matches/{matchId}
│   └─ awards/{awardId}
│
├─ academies/{academyId}
│   ├─ players/{playerId}
│   ├─ coaches/{coachId}
│   └─ programs/{programId}
│
├─ chatRooms/{roomId}
│   └─ messages/{messageId}
│
├─ activities/{activityId}
│   └─ type, refId, authorId, teamId
│
└─ notifications/{notificationId}
    └─ userId, type, message, read
```

### 3-2. 상세 스키마 정의

#### users/{userId}

```typescript
{
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: "ADMIN" | "USER";
  region?: string;
  sportTypes?: string[];
  preferences: {
    notifications: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### teams/{teamId}

```typescript
{
  id: string;
  name: string;
  sportType: string;
  region: string;
  level?: string;
  description?: string;
  logoUrl?: string;
  ownerUid: string;
  owners: string[];
  plan: "free" | "pro";
  visibility: "public" | "private";
  status: "active" | "inactive";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### teams/{teamId}/members/{memberId}

```typescript
{
  uid: string;
  userId: string;
  teamId: string;
  role: "owner" | "admin" | "member";
  accessLevel: "OWNER" | "ADMIN" | "STAFF" | "MEMBER";
  status: "active" | "inactive" | "pending";
  position?: string;
  jerseyNumber?: number;
  joinedAt: Timestamp;
  isDeleted: boolean;
}
```

#### teams/{teamId}/events/{eventId}

```typescript
{
  id: string;
  teamId: string;
  title: string;
  description?: string;
  date: Timestamp;
  location?: string;
  createdBy: string;
  attendees: string[];
  declined: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### teams/{teamId}/notices/{noticeId}

```typescript
{
  id: string;
  teamId: string;
  title: string;
  content: string;
  authorId: string;
  isPinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### teamSchedules/{scheduleId}

```typescript
{
  id: string;
  teamId: string;
  type: "match" | "training" | "event";
  title: string;
  dateTime: Timestamp;
  place: string;
  placeCoordinates?: {
    lat: number;
    lng: number;
  };
  opponent?: string;
  isPublic: boolean;
  needsSubstitute: boolean;
  description?: string;
  creatorUid: string;
  createdAt: Timestamp;
}
```

#### matches/{matchId}

```typescript
{
  id: string;
  tournamentId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  date: Timestamp;
  location?: string;
  venue?: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
  referee?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### matches/{matchId}/events/{eventId}

```typescript
{
  id: string;
  matchId: string;
  minute: number;
  type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution";
  playerId?: string;
  teamId: string;
  description?: string;
  createdAt: Timestamp;
}
```

#### matches/{matchId}/lineups/{lineupId}

```typescript
{
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  isStarter: boolean;
  position?: string;
  jerseyNumber?: number;
  createdAt: Timestamp;
}
```

#### tournaments/{tournamentId}

```typescript
{
  id: string;
  name: string;
  type: "league" | "bracket" | "group_stage";
  sportType: string;
  region?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "draft" | "registration" | "active" | "completed";
  maxTeams?: number;
  format?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### tournaments/{tournamentId}/teams/{teamId}

```typescript
{
  teamId: string;
  tournamentId: string;
  registeredAt: Timestamp;
  status: "registered" | "confirmed" | "withdrawn";
}
```

#### tournaments/{tournamentId}/standings/{standingId}

```typescript
{
  teamId: string;
  tournamentId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  rank: number;
  updatedAt: Timestamp;
}
```

#### players/{playerId}

```typescript
{
  id: string;
  name: string;
  teamId?: string;
  academyId?: string;
  position?: string;
  jerseyNumber?: number;
  dateOfBirth?: Timestamp;
  height?: number;
  weight?: number;
  photoURL?: string;
  status: "active" | "inactive";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### players/{playerId}/stats/{statId}

```typescript
{
  playerId: string;
  matchId: string;
  tournamentId?: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  createdAt: Timestamp;
}
```

#### academies/{academyId}

```typescript
{
  id: string;
  name: string;
  sportType: string;
  region: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  status: "active" | "inactive";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### academies/{academyId}/players/{playerId}

```typescript
{
  playerId: string;
  academyId: string;
  enrolledAt: Timestamp;
  status: "active" | "graduated" | "withdrawn";
}
```

#### academies/{academyId}/coaches/{coachId}

```typescript
{
  coachId: string;
  academyId: string;
  role: "head_coach" | "assistant_coach" | "trainer";
  joinedAt: Timestamp;
  status: "active" | "inactive";
}
```

#### academies/{academyId}/programs/{programId}

```typescript
{
  id: string;
  academyId: string;
  name: string;
  description?: string;
  ageGroup: string;
  schedule: string;
  duration: number;
  price?: number;
  status: "active" | "inactive";
  createdAt: Timestamp;
}
```

#### chatRooms/{roomId}

```typescript
{
  id: string;
  type: "team" | "direct" | "group" | "event";
  teamId?: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### chatRooms/{roomId}/messages/{messageId}

```typescript
{
  id: string;
  roomId: string;
  senderId: string;
  type: "text" | "image" | "video" | "notice" | "event";
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  noticeId?: string;
  eventId?: string;
  readBy: string[];
  createdAt: Timestamp;
}
```

#### activities/{activityId}

```typescript
{
  id: string;
  type: "team_created" | "team_notice" | "team_event" | "match_result" | "player_achievement";
  refType: "teams" | "notices" | "events" | "matches" | "players";
  refId: string;
  authorId: string;
  teamId?: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  visibility: "public" | "team" | "private";
  likeCount: number;
  commentCount: number;
  createdAt: Timestamp;
}
```

#### notifications/{notificationId}

```typescript
{
  id: string;
  userId: string;
  type: "team_invite" | "match_reminder" | "event_reminder" | "message" | "achievement";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Timestamp;
}
```

---

## 4️⃣ ERD (Entity Relationship Diagram)

### 4-1. 핵심 엔티티 관계

```
┌─────────┐
│  User   │
└────┬────┘
     │
     ├─────────────────┐
     │                 │
     ▼                 ▼
┌─────────┐      ┌──────────┐
│  Team   │      │  Player  │
└────┬────┘      └────┬─────┘
     │                │
     ├────────┬───────┤
     │        │       │
     ▼        ▼       ▼
┌─────────┐ ┌──────┐ ┌──────────┐
│ Member  │ │Match │ │  Stats   │
└─────────┘ └───┬──┘ └──────────┘
                │
                ▼
         ┌──────────────┐
         │ Tournament   │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  Standings   │
         └──────────────┘
```

### 4-2. 상세 ERD

```
User (1) ──< (N) TeamMember (N) >── (1) Team
  │                                      │
  │                                      ├──< (N) TeamEvent
  │                                      ├──< (N) TeamNotice
  │                                      ├──< (N) TeamSchedule
  │                                      ├──< (1) ChatRoom
  │                                      └──< (N) Match
  │
  └──< (1) Player

Team (N) >──< (N) Tournament
  │              │
  │              └──< (N) Match
  │
  └──< (N) Match

Match (1) ──< (N) MatchEvent
  │
  ├──< (N) MatchLineup
  │
  └──< (1) MatchStats

Player (1) ──< (N) PlayerStats
  │
  ├──< (N) Match (through MatchLineup)
  │
  └──< (1) Academy (optional)

Academy (1) ──< (N) AcademyPlayer
  │
  ├──< (N) AcademyCoach
  │
  └──< (N) AcademyProgram

Tournament (1) ──< (N) TournamentTeam
  │
  ├──< (N) Match
  │
  └──< (1) Standings
```

### 4-3. 관계 카디널리티

| 관계 | 카디널리티 | 설명 |
|------|-----------|------|
| User → TeamMember | 1:N | 한 사용자는 여러 팀에 가입 가능 |
| Team → TeamMember | 1:N | 한 팀은 여러 멤버 보유 |
| Team → Match | 1:N | 한 팀은 여러 경기 참가 |
| Match → Team | 2:1 | 한 경기는 2개 팀 참가 (홈/원정) |
| Match → Player | N:M | 한 경기는 여러 선수, 한 선수는 여러 경기 |
| Team → Tournament | N:M | 한 팀은 여러 대회 참가, 한 대회는 여러 팀 |
| Tournament → Match | 1:N | 한 대회는 여러 경기 포함 |
| Player → Academy | N:1 | 한 선수는 하나의 아카데미 소속 (선택) |
| Academy → Player | 1:N | 한 아카데미는 여러 선수 보유 |
| Team → ChatRoom | 1:1 | 한 팀은 하나의 채팅방 보유 |
| Team → Event | 1:N | 한 팀은 여러 이벤트 생성 |

---

## 5️⃣ 라우터 구조

### 5-1. 메인 라우터 구조

```
/
├─ /home (Dashboard)
├─ /sports (Sports Hub)
│
├─ /teams (Teams Entry)
│   ├─ /teams/search
│   ├─ /team/create
│   ├─ /teams/:teamId
│   └─ /team/:teamId/manage
│
├─ /sports/:type/team/* (Team Workspace)
│   ├─ /schedule
│   ├─ /members
│   ├─ /records
│   └─ /notices
│
├─ /matches (Matches)
│   ├─ /matches
│   ├─ /matches/create
│   └─ /matches/:matchId
│
├─ /tournaments (Tournaments)
│   ├─ /tournaments
│   ├─ /tournaments/:tournamentId
│   ├─ /tournaments/:tournamentId/standings
│   └─ /tournaments/:tournamentId/matches
│
├─ /players (Players)
│   ├─ /players
│   ├─ /players/:playerId
│   └─ /players/:playerId/stats
│
├─ /stats (Statistics)
│   ├─ /stats/team
│   ├─ /stats/player
│   └─ /stats/rank
│
├─ /academy (Academy)
│   ├─ /academy
│   ├─ /academy/programs
│   ├─ /academy/coaches
│   └─ /academy/teams
│
└─ /chat (Chat)
    ├─ /chat
    └─ /chat/:roomId
```

### 5-2. 팀 워크스페이스 라우터

```
/sports/:type/team/*
│
├─ /schedule (일정)
│   ├─ /schedule (목록)
│   ├─ /schedule/create (생성)
│   └─ /schedule/:id (상세)
│
├─ /members (멤버)
│   ├─ /members (목록)
│   └─ /members/:id (상세)
│
├─ /records (기록)
│   └─ /records (경기 기록)
│
└─ /notices (공지)
    ├─ /notices (목록)
    ├─ /notices/create (생성)
    └─ /notices/:id (상세)
```

---

## 6️⃣ 컴포넌트 구조

### 6-1. 도메인별 컴포넌트

```
src/components/
│
├─ sports/
│   └─ SportsModuleCard.tsx
│
├─ team/
│   ├─ TeamCard.tsx
│   ├─ TeamHeader.tsx
│   ├─ TeamMembersTab.tsx
│   ├─ TeamRecordsTab.tsx
│   ├─ TeamNoticesTab.tsx
│   ├─ schedule/
│   │   ├─ ScheduleTab.tsx
│   │   ├─ ScheduleList.tsx
│   │   ├─ ScheduleDetail.tsx
│   │   └─ ScheduleCreateForm.tsx
│   └─ persona/
│       ├─ TeamPersonaP0NewUser.tsx
│       ├─ TeamPersonaP1Individual.tsx
│       ├─ TeamPersonaP2TeamMember.tsx
│       ├─ TeamPersonaP3TeamCaptain.tsx
│       └─ TeamPersonaP4AssociationAdmin.tsx
│
├─ match/
│   ├─ MatchCard.tsx
│   ├─ MatchHeader.tsx
│   ├─ MatchTimeline.tsx
│   ├─ MatchStats.tsx
│   └─ MatchLineup.tsx
│
├─ tournament/
│   ├─ TournamentCard.tsx
│   ├─ TournamentHeader.tsx
│   ├─ TournamentStandings.tsx
│   └─ TournamentBracket.tsx
│
├─ player/
│   ├─ PlayerCard.tsx
│   ├─ PlayerHeader.tsx
│   └─ PlayerStats.tsx
│
├─ academy/
│   ├─ AcademyCard.tsx
│   ├─ AcademyHeader.tsx
│   └─ ProgramCard.tsx
│
└─ chat/
    ├─ ChatRoom.tsx
    ├─ MessageList.tsx
    ├─ MessageInput.tsx
    ├─ NoticeMessageCard.tsx
    └─ EventMessageCard.tsx
```

---

## 7️⃣ 서비스 레이어

### 7-1. 서비스 파일 구조

```
src/services/
│
├─ team/
│   ├─ teamService.ts
│   ├─ teamMemberService.ts
│   ├─ teamEventService.ts
│   └─ teamNoticeService.ts
│
├─ match/
│   ├─ matchService.ts
│   ├─ matchEventService.ts
│   └─ matchStatsService.ts
│
├─ tournament/
│   ├─ tournamentService.ts
│   └─ standingsService.ts
│
├─ player/
│   ├─ playerService.ts
│   └─ playerStatsService.ts
│
├─ academy/
│   ├─ academyService.ts
│   └─ programService.ts
│
├─ schedule/
│   └─ scheduleService.ts
│
└─ chat/
    └─ chatService.ts
```

### 7-2. 주요 서비스 함수

#### Team Service

```typescript
// teamService.ts
export async function createTeam(params: CreateTeamParams): Promise<string>
export async function getTeam(teamId: string): Promise<Team | null>
export async function updateTeam(teamId: string, data: Partial<Team>): Promise<void>
export async function deleteTeam(teamId: string): Promise<void>
export async function getTeamsByRegion(region: string): Promise<Team[]>
```

#### Match Service

```typescript
// matchService.ts
export async function createMatch(params: CreateMatchParams): Promise<string>
export async function getMatch(matchId: string): Promise<Match | null>
export async function updateMatchScore(matchId: string, score: MatchScore): Promise<void>
export async function getTeamMatches(teamId: string): Promise<Match[]>
```

#### Tournament Service

```typescript
// tournamentService.ts
export async function createTournament(params: CreateTournamentParams): Promise<string>
export async function registerTeam(tournamentId: string, teamId: string): Promise<void>
export async function getTournamentStandings(tournamentId: string): Promise<Standing[]>
export async function scheduleTournamentMatches(tournamentId: string): Promise<void>
```

---

## 8️⃣ Cloud Functions 구조

### 8-1. 주요 트리거

```
functions/src/
│
├─ team/
│   ├─ onTeamCreated.ts
│   ├─ onTeamUpdated.ts
│   ├─ onEventCreated.ts
│   ├─ onNoticeCreated.ts
│   └─ eventReminder.ts
│
├─ match/
│   ├─ onMatchCreated.ts
│   ├─ onMatchCompleted.ts
│   └─ onMatchEventCreated.ts
│
├─ tournament/
│   ├─ onTournamentCreated.ts
│   ├─ onTeamRegistered.ts
│   └─ updateStandings.ts
│
└─ player/
    ├─ onPlayerStatsUpdated.ts
    └─ updatePlayerRankings.ts
```

---

## 9️⃣ 인덱스 전략

### 9-1. Firestore 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "region", "order": "ASCENDING" },
        { "fieldPath": "sportType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "homeTeamId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teamSchedules",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "dateTime", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 🔟 보안 규칙 전략

### 10-1. 팀 보안 규칙

```javascript
match /teams/{teamId} {
  allow read: if request.auth != null && 
    (resource.data.visibility == "public" || 
     request.auth.uid in resource.data.owners ||
     exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)));
  
  allow create: if false; // Functions only
  allow update: if request.auth != null && 
    (request.auth.uid in resource.data.owners ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
}
```

---

## ✅ 최종 플랫폼 구조 요약

### 핵심 도메인 (10개)

1. ✅ **User** - 사용자 관리
2. ✅ **Team** - 팀 시스템 (40+ 페이지)
3. ✅ **Member** - 멤버 관리
4. ✅ **Match** - 경기 시스템
5. ✅ **Tournament** - 대회 시스템
6. ✅ **Player** - 선수 시스템
7. ✅ **Event** - 이벤트 시스템 (완료)
8. ✅ **Academy** - 유소년 아카데미
9. ✅ **Stats** - 통계 시스템
10. ✅ **Chat** - 채팅 시스템 (완료)

### 완성도

- **팀 시스템**: 85% ✅
- **이벤트 시스템**: 100% ✅
- **채팅 시스템**: 90% ✅
- **경기 시스템**: 60% ⚠️
- **대회 시스템**: 50% ⚠️
- **선수 시스템**: 40% ⚠️
- **통계 시스템**: 30% ⚠️
- **아카데미 시스템**: 20% ⚠️

---

**작성일**: 2024년  
**상태**: ✅ 완전한 시스템 아키텍처 설계 완료
