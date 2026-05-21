# 🗄 YAGO VIBE SPORTS - 전체 Firestore DB 구조 (완성형)

> **작성일**: 2024년  
> **목적**: 플랫폼 전체 데이터베이스 구조 설계

---

## 📋 목차

1. [전체 컬렉션 구조](#1-전체-컬렉션-구조)
2. [Federations 도메인](#2-federations-도메인)
3. [Sports Activity 도메인](#3-sports-activity-도메인)
4. [Teams 도메인](#4-teams-도메인)
5. [Matches 도메인](#5-matches-도메인)
6. [Players 도메인](#6-players-도메인)
7. [Social 도메인](#7-social-도메인)
8. [Admin 도메인](#8-admin-도메인)
9. [AI 도메인](#9-ai-도메인)
10. [인덱스 설정](#10-인덱스-설정)

---

## 1️⃣ 전체 컬렉션 구조

### 최상위 컬렉션

```
users/{uid}
federations/{federationId}
sports/{sportId}
teams/{teamId}
players/{playerId}
matches/{matchId}
activities/{activityId}
notifications/{notificationId}
media/{mediaId}
comments/{commentId}
likes/{likeId}
follows/{followId}
inquiries/{inquiryId}
```

### Federation 하위 컬렉션

```
federations/{federationId}
  ├─ notices/{noticeId}
  ├─ tournaments/{tournamentId}
  │   ├─ teams/{teamId}
  │   ├─ matches/{matchId}
  │   └─ standings/{standingId}
  ├─ leagues/{leagueId}
  │   └─ seasons/{seasonId}
  │       ├─ teams/{teamId}
  │       ├─ matches/{matchId}
  │       └─ standings/{standingId}
  ├─ teams/{teamId}
  │   ├─ members/{memberId}
  │   └─ players/{playerId}
  ├─ players/{playerId}
  ├─ matches/{matchId}
  │   ├─ events/{eventId}
  │   └─ lineups/{lineupId}
  ├─ standings/{standingId}
  ├─ regulations/{regulationId}
  ├─ documents/{documentId}
  ├─ sponsors/{sponsorId}
  ├─ organization/{memberId}
  ├─ aiAgents/{agentId}
  └─ inquiries/{inquiryId}
```

---

## 2️⃣ Federations 도메인

### federations/{federationId}

```typescript
interface Federation {
  id: string;
  name: string;                    // "노원구 축구협회"
  slug: string;                    // "nowon-football"
  region: string;                  // "서울 노원구"
  sport: string;                   // "football"
  
  // 시각적 요소
  logoUrl?: string;
  primaryColor: string;            // "#0F3D75"
  accentColor: string;             // "#16A34A"
  bannerUrl?: string;
  
  // 소개
  description?: string;
  about?: {
    greeting?: string;             // 협회장 인사말
    history?: string;              // 연혁
    vision?: string;               // 비전
  };
  
  // 관리자
  adminUids: string[];
  superAdminUids: string[];
  
  // 기본 설정
  defaultTournamentType: string;   // "round_robin" | "knockout"
  ageGroups: string[];             // ["유소년", "성인"]
  divisions: string[];             // ["남자부", "여자부", "혼성부"]
  
  // 연락처
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  
  // 조직 정보
  organization?: {
    president?: string;
    vicePresident?: string;
    secretary?: string;
  };
  
  // 통계 (자동 계산)
  stats?: {
    activeTournaments: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
  };
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### federations/{federationId}/notices/{noticeId}

```typescript
interface Notice {
  id: string;
  federationId: string;
  
  title: string;
  content: string;
  category: "announcement" | "tournament" | "schedule" | "general";
  
  isPinned: boolean;
  
  // 첨부파일
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  viewCount: number;
  likeCount: number;
}
```

### federations/{federationId}/tournaments/{tournamentId}

```typescript
interface Tournament {
  id: string;
  federationId: string;
  
  name: string;                    // "2025 노원구청장기 축구대회"
  slug: string;                    // "2025-nowon-cup"
  
  type: "round_robin" | "knockout" | "group_stage";
  format: "single" | "double";
  
  // 기간
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStart: Timestamp;
  registrationEnd: Timestamp;
  
  // 참가
  teamCount: number;
  maxTeams?: number;
  minTeams?: number;
  
  // 부별 구성
  divisions: string[];             // ["남자부", "여자부"]
  ageGroups: string[];            // ["유소년", "성인"]
  
  // 규정
  regulations?: {
    matchDuration?: number;        // 분
    substitutionLimit?: number;
    minPlayers?: number;
    maxPlayers?: number;
    entryFee?: number;
  };
  
  // 상태
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  
  // 통계
  stats?: {
    totalMatches: number;
    completedMatches: number;
    pendingMatches: number;
  };
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### federations/{federationId}/leagues/{leagueId}

```typescript
interface League {
  id: string;
  federationId: string;
  
  name: string;                   // "노원구 K7 리그"
  slug: string;                   // "nowon-k7-league"
  
  type: "round_robin" | "knockout";
  
  // 시즌
  currentSeasonId?: string;
  
  // 상태
  status: "active" | "inactive";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### federations/{federationId}/leagues/{leagueId}/seasons/{seasonId}

```typescript
interface Season {
  id: string;
  leagueId: string;
  federationId: string;
  
  name: string;                   // "2025 전반기"
  year: number;
  period: "first_half" | "second_half" | "full";
  
  startDate: Timestamp;
  endDate: Timestamp;
  
  teamCount: number;
  matchCount: number;
  
  status: "draft" | "active" | "completed";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 3️⃣ Sports Activity 도메인

### activities/{activityId}

```typescript
interface Activity {
  id: string;
  
  type: "team_created" | "team_notice" | "team_event" | "market_created" | 
        "recruit_created" | "match_created" | "equipment_created" |
        "tournament_created" | "match_result" | "player_achievement";
  
  refType: "teams" | "notices" | "events" | "market" | "recruit" | 
           "match" | "equipment" | "tournaments" | "players";
  refId: string;
  
  authorId: string;
  teamId?: string;
  federationId?: string;
  
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  
  visibility: "public" | "team" | "private";
  
  likeCount: number;
  commentCount: number;
  
  createdAt: Timestamp;
}
```

---

## 4️⃣ Teams 도메인

### teams/{teamId}

```typescript
interface Team {
  id: string;
  federationId?: string;
  sport: string;                  // "football"
  
  name: string;                   // "노원FC"
  shortName?: string;              // "노원"
  
  type: "youth" | "adult" | "academy";
  division?: string;               // "남자부" | "여자부"
  
  // 지역
  region: string;                  // "서울 노원구"
  
  // 시각적 요소
  logoUrl?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  
  // 정보
  foundedYear?: number;
  homeStadium?: string;
  trainingSchedule?: string;
  
  // 연락처
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  
  // 대표자/감독
  representative?: string;
  coach?: string;
  
  // 상태
  status: "pending" | "approved" | "rejected" | "inactive";
  membership: "member" | "non-member";
  
  // 통계
  stats?: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### teams/{teamId}/members/{memberId}

```typescript
interface TeamMember {
  id: string;                     // userId
  teamId: string;
  
  userId: string;
  role: "owner" | "admin" | "member";
  
  status: "active" | "inactive";
  joinedAt: Timestamp;
}
```

---

## 5️⃣ Matches 도메인

### matches/{matchId}

```typescript
interface Match {
  id: string;
  federationId?: string;
  tournamentId?: string;
  leagueId?: string;
  seasonId?: string;
  
  // 팀
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  
  // 점수
  homeScore?: number;
  awayScore?: number;
  
  // 일정
  scheduledDate: Timestamp;
  scheduledTime?: string;         // "15:00"
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  
  // 경기장
  venueId?: string;
  venueName: string;
  
  // 라운드
  round?: string;                  // "1R", "2R", "결승"
  group?: string;                 // "A조", "B조"
  
  // 심판
  referees?: Array<{
    name: string;
    role: "main" | "assistant" | "fourth";
  }>;
  
  // 상태
  status: "scheduled" | "live" | "completed" | "postponed" | "cancelled";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### matches/{matchId}/events/{eventId}

```typescript
interface MatchEvent {
  id: string;
  matchId: string;
  
  type: "goal" | "assist" | "yellow_card" | "red_card" | 
        "substitution" | "penalty" | "own_goal";
  minute: number;
  
  teamId: string;
  playerId?: string;
  playerName?: string;
  
  // 교체인 경우
  substitutePlayerId?: string;
  substitutePlayerName?: string;
  
  // 추가 정보
  description?: string;
  
  createdAt: Timestamp;
}
```

### matches/{matchId}/lineups/{lineupId}

```typescript
interface MatchLineup {
  id: string;
  matchId: string;
  teamId: string;
  
  playerId: string;
  playerName: string;
  position: string;
  jerseyNumber?: number;
  
  isStarter: boolean;
  substitutionMinute?: number;
  
  createdAt: Timestamp;
}
```

---

## 6️⃣ Players 도메인

### players/{playerId}

```typescript
interface Player {
  id: string;
  federationId?: string;
  teamId?: string;
  
  // 기본 정보
  name: string;
  birthDate?: Timestamp;
  age?: number;
  
  // 포지션
  position: string;                // "GK" | "DF" | "MF" | "FW"
  preferredPositions?: string[];
  
  // 등번호
  jerseyNumber?: number;
  
  // 신체 정보
  height?: number;                // cm
  weight?: number;                // kg
  
  // 연락처
  contact?: {
    phone?: string;
    email?: string;
  };
  
  // 상태
  status: "pending" | "approved" | "rejected" | "inactive";
  
  // 통계
  stats?: {
    matches: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  registeredBy: string;
}
```

---

## 7️⃣ Social 도메인

### comments/{commentId}

```typescript
interface Comment {
  id: string;
  
  entityType: "match" | "team" | "player" | "media" | "notice";
  entityId: string;
  
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  
  text: string;
  
  likeCount: number;
  replyCount: number;
  parentCommentId?: string;       // 답글인 경우
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### likes/{likeId}

```typescript
interface Like {
  id: string;                     // `${userId}_${entityType}_${entityId}`
  
  entityType: "match" | "team" | "player" | "media" | "comment";
  entityId: string;
  
  userId: string;
  
  createdAt: Timestamp;
}
```

### follows/{followId}

```typescript
interface Follow {
  id: string;                     // `${followerId}_${targetType}_${targetId}`
  
  followerId: string;
  targetType: "team" | "player";
  targetId: string;
  
  createdAt: Timestamp;
}
```

---

## 8️⃣ Admin 도메인

### users/{uid}

```typescript
interface User {
  uid: string;
  
  displayName?: string;
  email?: string;
  photoURL?: string;
  
  role: "ADMIN" | "USER";
  
  organizationRoles?: {
    [federationId: string]: "super_admin" | "org_admin" | 
                            "event_manager" | "stats_manager" | "viewer";
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### notifications/{notificationId}

```typescript
interface Notification {
  id: string;
  userId: string;
  
  type: "match_reminder" | "team_invitation" | "match_result" | 
        "tournament_update" | "notice" | "comment" | "like";
  
  title: string;
  message: string;
  link?: string;
  
  isRead: boolean;
  
  createdAt: Timestamp;
}
```

---

## 9️⃣ AI 도메인

### federations/{federationId}/aiAgents/{agentId}

```typescript
interface AIAgent {
  id: string;
  federationId: string;
  
  name: string;                   // "대표 AI 비서"
  type: "main" | "tournament" | "match" | "registration" | 
        "regulation" | "administration" | "sponsor";
  
  description: string;
  
  // 설정
  config: {
    model?: string;              // "gpt-4" | "gpt-3.5-turbo"
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    federationId: string;
    federationName?: string;
  };
  
  // 통계
  stats?: {
    totalQueries: number;
    successfulQueries: number;
    averageResponseTime: number;
  };
  
  // 상태
  status: "active" | "inactive";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### aiConversations/{conversationId}

```typescript
interface AIConversation {
  id: string;
  federationId: string;
  agentId: string;
  userId: string;
  
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Timestamp;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🔟 인덱스 설정

### 필수 복합 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "notices",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "isPinned", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "tournaments",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standings",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "tournamentId", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standings",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "seasonId", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## ✅ 보안 규칙 요약

### 기본 원칙

1. **읽기**: 인증된 사용자만
2. **쓰기**: 작성자 또는 관리자만
3. **삭제**: 작성자 또는 관리자만
4. **Federation 데이터**: Federation 관리자만

### 주요 규칙

```javascript
// Federations
match /federations/{federationId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    (request.auth.uid in resource.data.adminUids || 
     request.auth.uid in resource.data.superAdminUids);
}

// Notices
match /federations/{federationId}/notices/{noticeId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
  allow update, delete: if request.auth != null && 
    request.resource.data.createdBy == request.auth.uid;
}

// Matches
match /federations/{federationId}/matches/{matchId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
}
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO 전체 DB 구조 완료
