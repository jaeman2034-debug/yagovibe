# 🗄 YAGO VIBE SPORTS - 노원구 축구협회 Firestore DB 구조

> **작성일**: 2024년  
> **목적**: 실제 개발 가능한 수준의 Firestore 컬렉션 구조

---

## 📋 목차

1. [전체 컬렉션 구조](#1-전체-컬렉션-구조)
2. [Federations 컬렉션](#2-federations-컬렉션)
3. [Notices 컬렉션](#3-notices-컬렉션)
4. [Tournaments 컬렉션](#4-tournaments-컬렉션)
5. [Leagues 컬렉션](#5-leagues-컬렉션)
6. [Teams 컬렉션](#6-teams-컬렉션)
7. [Players 컬렉션](#7-players-컬렉션)
8. [Matches 컬렉션](#8-matches-컬렉션)
9. [Standings 컬렉션](#9-standings-컬렉션)
10. [Regulations 컬렉션](#10-regulations-컬렉션)
11. [Sponsors 컬렉션](#11-sponsors-컬렉션)
12. [AI Agents 컬렉션](#12-ai-agents-컬렉션)

---

## 1️⃣ 전체 컬렉션 구조

```
federations/{federationId}
  ├─ notices/{noticeId}
  ├─ tournaments/{tournamentId}
  │   ├─ teams/{teamId}
  │   ├─ matches/{matchId}
  │   └─ standings/{standingId}
  ├─ leagues/{leagueId}
  │   ├─ seasons/{seasonId}
  │   │   ├─ teams/{teamId}
  │   │   ├─ matches/{matchId}
  │   │   └─ standings/{standingId}
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

## 2️⃣ Federations 컬렉션

### 경로: `federations/{federationId}`

### 스키마

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
  
  // 소개
  description?: string;
  
  // 관리자
  adminUids: string[];
  superAdminUids: string[];
  
  // 기본 설정
  defaultTournamentType: string;   // "round_robin" | "knockout"
  ageGroups: string[];             // ["유소년", "성인"]
  divisions: string[];              // ["남자부", "여자부", "혼성부"]
  
  // 연락처
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // 조직 정보
  organization?: {
    president?: string;
    vicePresident?: string;
    secretary?: string;
  };
  
  // 상태
  status: "active" | "inactive";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 인덱스

```json
{
  "indexes": [
    {
      "collectionGroup": "federations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "federations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "slug", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 3️⃣ Notices 컬렉션

### 경로: `federations/{federationId}/notices/{noticeId}`

### 스키마

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
  }>;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  viewCount: number;
}
```

### 인덱스

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
      "collectionGroup": "notices",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 4️⃣ Tournaments 컬렉션

### 경로: `federations/{federationId}/tournaments/{tournamentId}`

### 스키마

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
  };
  
  // 참가비
  entryFee?: number;
  
  // 상태
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 하위 컬렉션

```
tournaments/{tournamentId}
  ├─ teams/{teamId}              // 참가팀
  ├─ matches/{matchId}           // 경기
  └─ standings/{standingId}     // 순위
```

---

## 5️⃣ Leagues 컬렉션

### 경로: `federations/{federationId}/leagues/{leagueId}`

### 스키마

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

### 하위 컬렉션

```
leagues/{leagueId}
  └─ seasons/{seasonId}
      ├─ teams/{teamId}
      ├─ matches/{matchId}
      └─ standings/{standingId}
```

### Season 스키마

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

## 6️⃣ Teams 컬렉션

### 경로: `federations/{federationId}/teams/{teamId}`

### 스키마

```typescript
interface Team {
  id: string;
  federationId: string;
  
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

### 하위 컬렉션

```
teams/{teamId}
  ├─ members/{memberId}          // 팀 멤버 (관리자, 코치 등)
  └─ players/{playerId}          // 선수
```

---

## 7️⃣ Players 컬렉션

### 경로: `federations/{federationId}/players/{playerId}`

### 스키마

```typescript
interface Player {
  id: string;
  federationId: string;
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

## 8️⃣ Matches 컬렉션

### 경로: `federations/{federationId}/matches/{matchId}`

### 스키마

```typescript
interface Match {
  id: string;
  federationId: string;
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

### 하위 컬렉션

```
matches/{matchId}
  ├─ events/{eventId}             // 경기 이벤트 (득점, 경고 등)
  └─ lineups/{lineupId}           // 라인업
```

### MatchEvent 스키마

```typescript
interface MatchEvent {
  id: string;
  matchId: string;
  
  type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution" | "penalty" | "own_goal";
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

---

## 9️⃣ Standings 컬렉션

### 경로: `federations/{federationId}/standings/{standingId}`

### 스키마

```typescript
interface Standing {
  id: string;
  federationId: string;
  tournamentId?: string;
  leagueId?: string;
  seasonId?: string;
  
  teamId: string;
  teamName: string;
  
  // 경기 기록
  played: number;
  wins: number;
  draws: number;
  losses: number;
  
  // 득실
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  
  // 승점
  points: number;
  
  // 순위
  rank: number;
  
  // 최근 5경기 폼
  form?: Array<"W" | "D" | "L">;
  
  // 메타데이터
  updatedAt: Timestamp;
}
```

---

## 🔟 Regulations 컬렉션

### 경로: `federations/{federationId}/regulations/{regulationId}`

### 스키마

```typescript
interface Regulation {
  id: string;
  federationId: string;
  
  title: string;
  content: string;
  category: "tournament_guideline" | "tournament_regulation" | "player_registration" | "discipline";
  
  // 첨부파일
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## 1️⃣1️⃣ Sponsors 컬렉션

### 경로: `federations/{federationId}/sponsors/{sponsorId}`

### 스키마

```typescript
interface Sponsor {
  id: string;
  federationId: string;
  
  name: string;
  type: "official" | "hospital" | "equipment" | "restaurant" | "local";
  
  // 시각적 요소
  logoUrl?: string;
  bannerUrl?: string;
  
  // 정보
  description?: string;
  website?: string;
  
  // 연락처
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  
  // 광고 정보
  advertisement?: {
    package: string;
    startDate: Timestamp;
    endDate: Timestamp;
    amount: number;
  };
  
  // 상태
  status: "active" | "inactive";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## 1️⃣2️⃣ AI Agents 컬렉션

### 경로: `federations/{federationId}/aiAgents/{agentId}`

### 스키마

```typescript
interface AIAgent {
  id: string;
  federationId: string;
  
  name: string;                   // "대표 AI 비서"
  type: "main" | "tournament" | "match" | "registration" | "regulation" | "administration" | "sponsor";
  
  description: string;
  
  // 설정
  config: {
    model?: string;              // "gpt-4" | "gpt-3.5-turbo"
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  
  // 상태
  status: "active" | "inactive";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## ✅ 보안 규칙 예시

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Federations
    match /federations/{federationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid in resource.data.adminUids || 
         request.auth.uid in resource.data.superAdminUids);
      
      // Notices
      match /notices/{noticeId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
        allow update, delete: if request.auth != null && 
          request.resource.data.createdBy == request.auth.uid;
      }
      
      // Tournaments
      match /tournaments/{tournamentId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
      }
      
      // Teams
      match /teams/{teamId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update: if request.auth != null && 
          (request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids ||
           request.auth.uid == resource.data.createdBy);
      }
      
      // Matches
      match /matches/{matchId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
      }
    }
  }
}
```

---

**작성일**: 2024년  
**상태**: ✅ 노원구 축구협회 Firestore DB 구조 완료
