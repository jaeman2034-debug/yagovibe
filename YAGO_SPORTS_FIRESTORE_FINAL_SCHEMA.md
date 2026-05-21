# 🗄️ YAGO SPORTS Firestore 최종 스키마

> **작성일**: 2024년  
> **목적**: YAGO SPORTS 플랫폼의 완전한 Firestore 데이터베이스 스키마 정의

---

## 📋 컬렉션 목록

### 핵심 컬렉션 (10개)

1. `users` - 사용자 프로필
2. `teams` - 팀 정보
3. `teamSchedules` - 팀 일정
4. `matches` - 경기 정보
5. `tournaments` - 대회 정보
6. `players` - 선수 정보
7. `academies` - 유소년 아카데미
8. `chatRooms` - 채팅방
9. `activities` - 활동 피드
10. `notifications` - 알림

### 서브컬렉션

- `teams/{teamId}/members` - 팀 멤버
- `teams/{teamId}/events` - 팀 이벤트
- `teams/{teamId}/notices` - 팀 공지
- `teams/{teamId}/blog_posts` - 팀 블로그
- `teams/{teamId}/activities` - 팀 활동
- `matches/{matchId}/events` - 경기 이벤트
- `matches/{matchId}/lineups` - 경기 라인업
- `tournaments/{tournamentId}/teams` - 대회 참가 팀
- `tournaments/{tournamentId}/standings` - 대회 순위
- `players/{playerId}/stats` - 선수 통계
- `academies/{academyId}/players` - 아카데미 선수
- `academies/{academyId}/coaches` - 아카데미 코치
- `academies/{academyId}/programs` - 아카데미 프로그램
- `chatRooms/{roomId}/messages` - 채팅 메시지

---

## 📊 상세 스키마

### 1. users/{userId}

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

**인덱스**:
- `region` (ASC) + `createdAt` (DESC)

---

### 2. teams/{teamId}

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

**인덱스**:
- `region` (ASC) + `sportType` (ASC) + `createdAt` (DESC)
- `visibility` (ASC) + `status` (ASC) + `createdAt` (DESC)

---

### 3. teams/{teamId}/members/{memberId}

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

**인덱스**:
- `teamId` (ASC) + `status` (ASC) + `joinedAt` (DESC)

---

### 4. teams/{teamId}/events/{eventId}

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

**인덱스**:
- `teamId` (ASC) + `date` (ASC)

---

### 5. teams/{teamId}/notices/{noticeId}

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

**인덱스**:
- `teamId` (ASC) + `isPinned` (DESC) + `createdAt` (DESC)

---

### 6. teamSchedules/{scheduleId}

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

**인덱스**:
- `teamId` (ASC) + `dateTime` (ASC)
- `dateTime` (ASC) + `type` (ASC)

---

### 7. matches/{matchId}

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

**인덱스**:
- `homeTeamId` (ASC) + `date` (DESC)
- `awayTeamId` (ASC) + `date` (DESC)
- `tournamentId` (ASC) + `date` (ASC)
- `status` (ASC) + `date` (ASC)

---

### 8. matches/{matchId}/events/{eventId}

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

**인덱스**:
- `matchId` (ASC) + `minute` (ASC)

---

### 9. matches/{matchId}/lineups/{lineupId}

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

**인덱스**:
- `matchId` (ASC) + `teamId` (ASC) + `isStarter` (DESC)

---

### 10. tournaments/{tournamentId}

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

**인덱스**:
- `sportType` (ASC) + `status` (ASC) + `startDate` (DESC)
- `region` (ASC) + `status` (ASC) + `startDate` (DESC)

---

### 11. tournaments/{tournamentId}/teams/{teamId}

```typescript
{
  teamId: string;
  tournamentId: string;
  registeredAt: Timestamp;
  status: "registered" | "confirmed" | "withdrawn";
}
```

**인덱스**:
- `tournamentId` (ASC) + `registeredAt` (ASC)

---

### 12. tournaments/{tournamentId}/standings/{standingId}

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

**인덱스**:
- `tournamentId` (ASC) + `points` (DESC) + `goalsFor` (DESC)

---

### 13. players/{playerId}

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

**인덱스**:
- `teamId` (ASC) + `status` (ASC)
- `academyId` (ASC) + `status` (ASC)

---

### 14. players/{playerId}/stats/{statId}

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

**인덱스**:
- `playerId` (ASC) + `createdAt` (DESC)
- `tournamentId` (ASC) + `goals` (DESC)

---

### 15. academies/{academyId}

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

**인덱스**:
- `region` (ASC) + `sportType` (ASC) + `createdAt` (DESC)

---

### 16. academies/{academyId}/players/{playerId}

```typescript
{
  playerId: string;
  academyId: string;
  enrolledAt: Timestamp;
  status: "active" | "graduated" | "withdrawn";
}
```

**인덱스**:
- `academyId` (ASC) + `status` (ASC) + `enrolledAt` (DESC)

---

### 17. academies/{academyId}/coaches/{coachId}

```typescript
{
  coachId: string;
  academyId: string;
  role: "head_coach" | "assistant_coach" | "trainer";
  joinedAt: Timestamp;
  status: "active" | "inactive";
}
```

**인덱스**:
- `academyId` (ASC) + `status` (ASC)

---

### 18. academies/{academyId}/programs/{programId}

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

**인덱스**:
- `academyId` (ASC) + `status` (ASC) + `createdAt` (DESC)

---

### 19. chatRooms/{roomId}

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

**인덱스**:
- `type` (ASC) + `teamId` (ASC) + `updatedAt` (DESC)
- `participants` (ARRAY_CONTAINS) + `updatedAt` (DESC)

---

### 20. chatRooms/{roomId}/messages/{messageId}

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

**인덱스**:
- `roomId` (ASC) + `createdAt` (DESC)

---

### 21. activities/{activityId}

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

**인덱스**:
- `visibility` (ASC) + `createdAt` (DESC)
- `teamId` (ASC) + `createdAt` (DESC)
- `authorId` (ASC) + `createdAt` (DESC)

---

### 22. notifications/{notificationId}

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

**인덱스**:
- `userId` (ASC) + `isRead` (ASC) + `createdAt` (DESC)

---

## 🔐 보안 규칙 요약

### 팀 보안 규칙

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

### 팀 이벤트 보안 규칙

```javascript
match /teams/{teamId}/events/{eventId} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  allow create: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  allow update: if request.auth != null && 
    (request.auth.uid == resource.data.createdBy ||
     exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
}
```

---

## 📊 데이터 관계 요약

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
```

---

**작성일**: 2024년  
**상태**: ✅ Firestore 최종 스키마 완료
