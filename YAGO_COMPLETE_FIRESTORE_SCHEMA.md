# 🗄 YAGO VIBE SPORTS - 완성형 Firestore DB 스키마

> **작성일**: 2024년  
> **목적**: 노원구 축구협회 실전 기준 + 신규 협회 자동 생성 가능 구조

---

## 📋 목차

1. [최상위 구조](#1-최상위-구조)
2. [Federation 루트 문서](#2-federation-루트-문서)
3. [홈페이지용 컬렉션](#3-홈페이지용-컬렉션)
4. [협회 조직/행정 구조](#4-협회-조직행정-구조)
5. [대회/리그 구조](#5-대회리그-구조)
6. [참가 신청 구조](#6-참가-신청-구조)
7. [팀 구조](#7-팀-구조)
8. [선수 구조](#8-선수-구조)
9. [경기 구조](#9-경기-구조)
10. [순위/통계 구조](#10-순위통계-구조)
11. [경기장/심판 구조](#11-경기장심판-구조)
12. [후원사/광고 구조](#12-후원사광고-구조)
13. [권한 구조](#13-권한-구조)
14. [AI 에이전트 구조](#14-ai-에이전트-구조)
15. [시스템 템플릿 구조](#15-시스템-템플릿-구조)

---

## 1️⃣ 최상위 구조

### 최상위 컬렉션

```
users/{userId}
federations/{federationId}
sportsProfiles/{profileId}
systemTemplates/{templateId}
systemAgents/{agentTemplateId}
```

### 핵심 원칙

```
federations/{federationId} 아래에
각 협회의 홈페이지와 운영 데이터가 같이 들어가는 구조
```

---

## 2️⃣ Federation 루트 문서

### 경로: `federations/{federationId}`

### 예시: `federations/nowon-football`

### 스키마

```typescript
interface Federation {
  id: string;
  name: string;                    // "노원구 축구협회"
  slug: string;                    // "nowon-football"
  region: string;                   // "서울 노원구"
  sportType: string;               // "football"
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  // 시각적 요소
  logoUrl?: string;
  heroImageUrl?: string;
  primaryColor: string;            // "#0F172A"
  secondaryColor: string;          // "#16A34A"
  
  // 소개
  description?: string;            // "노원구 지역 축구 리그 및 대회 운영 협회"
  
  // 연락처
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  
  // 기능 활성화
  homepageVisible: boolean;        // true
  adminEnabled: boolean;           // true
  
  // 템플릿
  templateId: string;              // "football-association-v1"
  
  // 관리자
  adminUids: string[];
  superAdminUids: string[];
  
  // 기본 설정
  defaultTournamentType: string;   // "round_robin" | "knockout"
  ageGroups: string[];             // ["유소년", "성인"]
  divisions: string[];             // ["남자부", "여자부", "혼성부"]
  
  // 통계 (자동 계산)
  stats?: {
    activeTournaments: number;
    activeLeagues: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
  };
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## 3️⃣ 홈페이지용 컬렉션

### 3-1. pages

협회 홈페이지 고정 페이지 관리

#### 경로: `federations/{federationId}/pages/{pageId}`

#### 예시 페이지 ID

```
home
about
greeting
history
organization
sponsors
docs
contact
youth
```

#### 스키마

```typescript
interface Page {
  id: string;
  federationId: string;
  
  title: string;                   // "협회장 인사말"
  slug: string;                    // "greeting"
  pageType: "content" | "list" | "form" | "custom";
  
  // 상태
  status: "draft" | "published" | "archived";
  
  // 콘텐츠
  contentHtml?: string;
  contentBlocks?: Array<{
    type: "text" | "image" | "video" | "gallery" | "table";
    data: any;
  }>;
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 3-2. menus

협회 홈페이지 메뉴 자동 생성용

#### 경로: `federations/{federationId}/menus/{menuId}`

#### 스키마

```typescript
interface Menu {
  id: string;
  federationId: string;
  
  label: string;                   // "대회/리그"
  path: string;                    // "/federations/nowon-football/tournaments"
  order: number;                   // 3
  visible: boolean;                // true
  
  menuType: "public" | "admin";
  icon?: string;                    // "Trophy"
  
  // 하위 메뉴
  children?: Array<{
    label: string;
    path: string;
    order: number;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-3. notices

공지사항

#### 경로: `federations/{federationId}/notices/{noticeId}`

#### 스키마

```typescript
interface Notice {
  id: string;
  federationId: string;
  
  title: string;                    // "2025 노원구청장기 대진표 공지"
  category: "tournament" | "schedule" | "general" | "important";
  importance: "low" | "normal" | "high";
  
  // 상태
  status: "draft" | "published" | "archived";
  targetScope: "public" | "teams" | "admins";
  
  // 연결
  leagueId?: string;
  seasonId?: string;
  tournamentId?: string;
  
  // 콘텐츠
  content: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  
  // 메타데이터
  publishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  viewCount: number;
  likeCount: number;
}
```

### 3-4. banners

메인 배너, 팝업, 스폰서 배너

#### 경로: `federations/{federationId}/banners/{bannerId}`

#### 스키마

```typescript
interface Banner {
  id: string;
  federationId: string;
  
  title: string;
  type: "main" | "popup" | "sponsor" | "event";
  position: "top" | "middle" | "bottom" | "sidebar";
  
  imageUrl: string;
  linkUrl?: string;
  
  // 표시 설정
  visible: boolean;
  startDate?: Timestamp;
  endDate?: Timestamp;
  
  // 순서
  order: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-5. faqs

FAQ

#### 경로: `federations/{federationId}/faqs/{faqId}`

#### 스키마

```typescript
interface FAQ {
  id: string;
  federationId: string;
  
  question: string;
  answer: string;
  category: "tournament" | "registration" | "rules" | "general";
  
  order: number;
  visible: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-6. inquiries

문의

#### 경로: `federations/{federationId}/inquiries/{inquiryId}`

#### 스키마

```typescript
interface Inquiry {
  id: string;
  federationId: string;
  
  name: string;                    // "홍길동"
  phone?: string;
  email?: string;
  
  type: "registration" | "tournament" | "rules" | "general" | "sponsor";
  title: string;                   // "유소년 참가 문의"
  message: string;
  
  // 처리 상태
  status: "received" | "in-progress" | "resolved" | "closed";
  assignedTo?: string;             // adminId
  response?: string;
  respondedAt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 4️⃣ 협회 조직/행정 구조

### 4-1. staff

고문단, 임원단, 회장단, 감독단 등 인물 관리

#### 경로: `federations/{federationId}/staff/{staffId}`

#### 스키마

```typescript
interface Staff {
  id: string;
  federationId: string;
  
  name: string;                    // "홍길동"
  role: string;                    // "회장"
  group: "advisors" | "executives" | "presidents" | "directors" | "coaches" | "consultants" | "referees";
  
  photoUrl?: string;
  phone?: string;
  email?: string;
  bio?: string;
  
  visible: boolean;
  order: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4-2. committees

위원회/조직도 구조

#### 경로: `federations/{federationId}/committees/{committeeId}`

#### 스키마

```typescript
interface Committee {
  id: string;
  federationId: string;
  
  name: string;                    // "경기위원회"
  description?: string;
  leadStaffId?: string;
  memberStaffIds: string[];
  
  order: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4-3. documents

공문, 요강, 규정, 신청서

#### 경로: `federations/{federationId}/documents/{documentId}`

#### 스키마

```typescript
interface Document {
  id: string;
  federationId: string;
  
  title: string;                   // "2025 노원구청장기 대회요강"
  type: "rulebook" | "form" | "official-letter" | "guide" | "brochure" | "discipline-rule" | "player-registration-rule";
  category: "tournament" | "registration" | "rules" | "general";
  
  fileUrl: string;
  version: string;                  // "1.0"
  
  // 연결
  relatedTournamentId?: string;
  relatedLeagueId?: string;
  
  // 상태
  status: "draft" | "published" | "archived";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## 5️⃣ 대회/리그 구조

### 5-1. tournaments

단기 대회, 컵대회, 구청장기 등

#### 경로: `federations/{federationId}/tournaments/{tournamentId}`

#### 스키마

```typescript
interface Tournament {
  id: string;
  federationId: string;
  
  name: string;                    // "2025 노원구청장기 축구대회"
  slug: string;                    // "2025-mayor-cup"
  
  format: "knockout" | "round-robin" | "group-stage";
  ageGroup: "youth" | "adult" | "all";
  gender: "men" | "women" | "mixed";
  
  // 기간
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStart?: Timestamp;
  registrationEnd?: Timestamp;
  
  // 경기장
  venueIds: string[];
  
  // 콘텐츠
  description?: string;
  coverImageUrl?: string;
  
  // 상태
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  registrationOpen: boolean;
  published: boolean;
  
  // 통계
  teamCount?: number;
  matchCount?: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### 하위 컬렉션

```
tournaments/{tournamentId}
  ├─ teams/{teamId}              // 참가팀
  ├─ matches/{matchId}           // 경기
  ├─ brackets/{bracketId}       // 대진표
  └─ notices/{noticeId}         // 대회 공지
```

### 5-2. leagues

상시 리그

#### 경로: `federations/{federationId}/leagues/{leagueId}`

#### 스키마

```typescript
interface League {
  id: string;
  federationId: string;
  
  name: string;                   // "노원구 K7 리그"
  slug: string;                   // "nowon-k7-league"
  
  category: "youth" | "adult";
  competitionType: "league" | "tournament";
  sportType: string;              // "football"
  gender: "men" | "women" | "mixed";
  ageGroup: "youth" | "adult";
  
  description?: string;
  
  // 상태
  status: "active" | "inactive";
  visible: boolean;
  
  // 현재 시즌
  currentSeasonId?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 5-3. seasons

리그의 실제 운영 단위

#### 경로: `federations/{federationId}/seasons/{seasonId}`

#### 스키마

```typescript
interface Season {
  id: string;
  federationId: string;
  leagueId: string;
  
  name: string;                   // "2026 전반기"
  status: "draft" | "active" | "completed" | "cancelled";
  
  // 기간
  startDate: Timestamp;
  endDate: Timestamp;
  
  // 참가 설정
  teamLimit: number;              // 16
  pointsWin: number;              // 3
  pointsDraw: number;             // 1
  pointsLoss: number;             // 0
  
  // 순위 결정 규칙
  tieBreakerRules: Array<"points" | "goalDifference" | "goalsFor" | "headToHead">;
  
  // 형식
  roundType: "round-robin" | "knockout" | "group-stage";
  
  published: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### 하위 컬렉션

```
seasons/{seasonId}
  ├─ teams/{teamId}              // 시즌 참가팀
  ├─ matches/{matchId}           // 시즌 경기
  ├─ standings/{teamId}          // 시즌 순위
  ├─ stats/{statId}             // 시즌 통계
  └─ notices/{noticeId}         // 시즌 공지
```

---

## 6️⃣ 참가 신청 구조

### registrations

팀 참가 신청/승인

#### 경로: `federations/{federationId}/registrations/{registrationId}`

#### 스키마

```typescript
interface Registration {
  id: string;
  federationId: string;
  
  targetType: "league" | "tournament";
  targetId: string;               // leagueId or tournamentId
  seasonId?: string;
  
  // 팀 정보
  teamName: string;               // "상계FC"
  managerName: string;            // "김대표"
  phone?: string;
  email?: string;
  
  // 제출 서류
  submittedDocuments: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  
  // 선수 수
  playerCount: number;            // 22
  
  // 상태
  status: "pending" | "reviewing" | "needs-update" | "approved" | "rejected";
  reviewMemo?: string;
  
  // 처리
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 7️⃣ 팀 구조

### 7-1. teams

협회 소속 팀 마스터

#### 경로: `federations/{federationId}/teams/{teamId}`

#### 스키마

```typescript
interface Team {
  id: string;
  federationId: string;
  
  name: string;                   // "노원FC"
  slug: string;                   // "nowon-fc"
  
  teamType: "club" | "academy" | "youth";
  ageGroup: "youth" | "adult";
  homeRegion: string;             // "노원구"
  
  foundedYear?: number;           // 2018
  managerName?: string;
  coachName?: string;
  phone?: string;
  logoUrl?: string;
  description?: string;
  
  status: "pending" | "active" | "inactive";
  visible: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### 하위 컬렉션

```
teams/{teamId}
  ├─ roster/{playerId}           // 팀 로스터
  ├─ events/{eventId}             // 팀 이벤트
  ├─ notices/{noticeId}          // 팀 공지
  └─ media/{mediaId}              // 팀 미디어
```

### 7-2. seasons/{seasonId}/teams/{teamId}

시즌 참가 상태용

#### 스키마

```typescript
interface SeasonTeam {
  id: string;                     // teamId
  seasonId: string;
  federationId: string;
  
  teamId: string;                  // "nowon-fc"
  registrationStatus: "pending" | "approved" | "rejected";
  groupName?: string;              // "A조"
  seed?: number;                   // 1
  
  participationStatus: "active" | "withdrawn" | "disqualified";
  note?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 8️⃣ 선수 구조

### 8-1. players

협회 전체 선수 마스터

#### 경로: `federations/{federationId}/players/{playerId}`

#### 스키마

```typescript
interface Player {
  id: string;
  federationId: string;
  
  name: string;                    // "이선수"
  birthDate?: Timestamp;           // "2002-03-04"
  gender: "male" | "female";
  position: string;                // "FW"
  
  primaryTeamId?: string;          // "nowon-fc"
  jerseyNumber?: number;          // 10
  
  phone?: string;
  photoUrl?: string;
  
  status: "pending" | "active" | "inactive";
  registrationVerified: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  registeredBy: string;
}
```

#### 하위 컬렉션

```
players/{playerId}
  ├─ seasonStats/{seasonId}      // 시즌별 통계
  ├─ discipline/{recordId}        // 징계 기록
  └─ documents/{documentId}       // 선수 문서
```

### 8-2. teams/{teamId}/roster/{playerId}

팀별 엔트리

#### 스키마

```typescript
interface TeamRoster {
  id: string;                     // playerId
  teamId: string;
  federationId: string;
  
  playerId: string;                // "player-001"
  name: string;                    // "이선수"
  position: string;                // "FW"
  jerseyNumber: number;            // 10
  
  registrationStatus: "pending" | "approved" | "rejected";
  eligible: boolean;
  
  // 징계
  yellowCards: number;             // 1
  redCards: number;                // 0
  suspensionCount: number;         // 0
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 9️⃣ 경기 구조

### matches

협회 전체 경기 마스터

#### 경로: `federations/{federationId}/matches/{matchId}`

#### 스키마

```typescript
interface Match {
  id: string;
  federationId: string;
  
  // 대회/리그 연결
  competitionType: "tournament" | "season";
  competitionId: string;           // tournamentId or seasonId
  leagueId?: string;
  seasonId?: string;
  tournamentId?: string;
  
  roundName?: string;              // "3R"
  matchDate: Timestamp;
  venueId?: string;                // "madeul-stadium"
  
  // 팀
  homeTeamId: string;              // "nowon-fc"
  awayTeamId: string;              // "sanggye-fc"
  homeTeamName: string;
  awayTeamName: string;
  
  // 점수
  homeScore?: number;              // 2
  awayScore?: number;              // 1
  
  // 상태
  status: "scheduled" | "live" | "completed" | "postponed" | "cancelled";
  resultStatus: "pending" | "final" | "provisional";
  
  // 심판
  refereeIds: string[];
  
  published: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### 하위 컬렉션

```
matches/{matchId}
  ├─ events/{eventId}             // 경기 이벤트
  ├─ lineups/{playerId}           // 라인업
  ├─ stats/{statId}               // 경기 통계
  └─ reports/{reportId}           // 경기 리포트
```

### 9-1. events

득점, 카드, 교체

#### 경로: `matches/{matchId}/events/{eventId}`

#### 스키마

```typescript
interface MatchEvent {
  id: string;
  matchId: string;
  
  minute: number;                  // 63
  type: "goal" | "own-goal" | "yellow-card" | "red-card" | "substitution" | "penalty-goal" | "missed-penalty" | "injury" | "other";
  
  teamId: string;                  // "nowon-fc"
  playerId?: string;               // "player-001"
  assistPlayerId?: string;         // "player-009"
  
  note?: string;
  
  createdAt: Timestamp;
}
```

### 9-2. lineups

라인업

#### 경로: `matches/{matchId}/lineups/{playerId}`

#### 스키마

```typescript
interface MatchLineup {
  id: string;                      // playerId
  matchId: string;
  
  playerId: string;                // "player-001"
  teamId: string;                  // "nowon-fc"
  
  isStarter: boolean;              // true
  position: string;                // "FW"
  jerseyNumber: number;            // 10
  captain: boolean;                // true
  
  enteredMinute: number;           // 0
  leftMinute?: number;             // 88
  
  createdAt: Timestamp;
}
```

---

## 🔟 순위/통계 구조

### 10-1. standings

시즌 순위

#### 경로: `federations/{federationId}/seasons/{seasonId}/standings/{teamId}`

#### 스키마

```typescript
interface Standing {
  id: string;                      // teamId
  seasonId: string;
  federationId: string;
  
  teamId: string;                  // "nowon-fc"
  
  // 경기 기록
  played: number;                   // 6
  won: number;                      // 4
  drawn: number;                   // 1
  lost: number;                     // 1
  
  // 득실
  goalsFor: number;                 // 12
  goalsAgainst: number;            // 6
  goalDifference: number;          // 6
  
  // 승점
  points: number;                   // 13
  
  // 순위
  rank: number;                     // 1
  
  // 징계
  disciplinePoints: number;        // 0
  forfeitLosses: number;           // 0
  
  updatedAt: Timestamp;
}
```

### 10-2. stats

랭킹/기록

#### 경로: `federations/{federationId}/seasons/{seasonId}/stats/{statId}`

#### 스키마

```typescript
interface Stat {
  id: string;
  seasonId: string;
  federationId: string;
  
  entityType: "player" | "team";
  entityId: string;                // playerId or teamId
  
  category: "goals" | "assists" | "appearances" | "yellowCards" | "redCards" | "cleanSheets";
  value: number;                    // 7
  rank: number;                     // 1
  
  updatedAt: Timestamp;
}
```

---

## 1️⃣1️⃣ 경기장/심판 구조

### 11-1. venues

경기장

#### 경로: `federations/{federationId}/venues/{venueId}`

#### 스키마

```typescript
interface Venue {
  id: string;
  federationId: string;
  
  name: string;                     // "마들 스타디움"
  address?: string;
  region: string;                   // "노원구"
  
  surfaceType: "natural" | "artificial";
  capacity?: number;                // 500
  available: boolean;               // true
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 11-2. referees

심판

#### 경로: `federations/{federationId}/referees/{refereeId}`

#### 스키마

```typescript
interface Referee {
  id: string;
  federationId: string;
  
  name: string;                     // "홍심판"
  grade: string;                    // "A"
  phone?: string;
  
  status: "active" | "inactive";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 1️⃣2️⃣ 후원사/광고 구조

### sponsors

후원사

#### 경로: `federations/{federationId}/sponsors/{sponsorId}`

#### 스키마

```typescript
interface Sponsor {
  id: string;
  federationId: string;
  
  name: string;                     // "방병원"
  category: "hospital" | "equipment" | "restaurant" | "local" | "other";
  tier: "official" | "gold" | "silver" | "bronze";
  
  logoUrl?: string;
  linkUrl?: string;
  description?: string;
  
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  status: "active" | "inactive";
  visible: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 하위 컬렉션

```
sponsors/{sponsorId}
  ├─ ads/{adId}                   // 광고
  └─ contracts/{contractId}       // 계약
```

---

## 1️⃣3️⃣ 권한 구조

### 13-1. admins

협회 관리자 계정

#### 경로: `federations/{federationId}/admins/{adminId}`

#### 스키마

```typescript
interface Admin {
  id: string;                      // userId
  federationId: string;
  
  userId: string;                  // "user-001"
  name: string;                    // "협회사무국"
  role: "super-admin" | "federation-admin" | "league-manager" | "match-operator" | "team-manager" | "viewer";
  
  permissions: Array<
    "manage-leagues" | "manage-seasons" | "approve-registrations" |
    "manage-matches" | "manage-results" | "manage-notices" |
    "manage-teams" | "manage-players" | "manage-documents" |
    "manage-sponsors" | "manage-staff" | "view-analytics"
  >;
  
  status: "active" | "inactive";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 13-2. permissions

역할 템플릿

#### 경로: `federations/{federationId}/permissions/{permissionId}`

#### 스키마

```typescript
interface Permission {
  id: string;
  federationId: string;
  
  role: "super-admin" | "federation-admin" | "league-manager" | "match-operator" | "team-manager" | "viewer";
  
  permissions: string[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 1️⃣4️⃣ AI 에이전트 구조

### aiAgents

AI 에이전트

#### 경로: `federations/{federationId}/aiAgents/{agentId}`

#### 스키마

```typescript
interface AIAgent {
  id: string;
  federationId: string;
  
  name: string;                    // "대회 안내 AI"
  agentType: "general-assistant" | "tournament-guide" | "match-ops" | 
             "team-registration" | "player-registration" | "rules-docs" | 
             "admin-ops" | "sponsor-support" | "federation-builder";
  
  enabled: boolean;                // true
  scope: "public" | "admin" | "both";
  
  promptTemplateId?: string;       // "football-tournament-guide-v1"
  
  knowledgeSources: Array<"notices" | "documents" | "tournaments" | "matches" | "teams" | "players">;
  
  uiPlacement: "homepage-chat" | "admin-panel" | "both";
  
  // 설정
  config?: {
    model?: string;                // "gpt-4"
    temperature?: number;          // 0.7
    maxTokens?: number;            // 500
    systemPrompt?: string;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 1️⃣5️⃣ 시스템 템플릿 구조

### systemTemplates

신규 협회 자동 생성용 템플릿

#### 경로: `systemTemplates/{templateId}`

#### 스키마

```typescript
interface SystemTemplate {
  id: string;
  
  name: string;                    // "Football Association Default"
  sportType: string;               // "football"
  version: string;                 // "v1"
  
  // 기본 메뉴
  defaultMenus: Array<{
    label: string;
    path: string;
    order: number;
    icon?: string;
  }>;
  
  // 기본 AI 에이전트
  defaultAgents: Array<{
    name: string;
    agentType: string;
    enabled: boolean;
    scope: string;
  }>;
  
  // 기본 페이지
  defaultPages: Array<{
    title: string;
    slug: string;
    pageType: string;
    contentTemplate?: string;
  }>;
  
  // 기본 규정 문서
  defaultDocuments: Array<{
    title: string;
    type: string;
    category: string;
    contentTemplate?: string;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 1️⃣6️⃣ 협회 자동 생성 로직

### 생성 순서

```
1. federations/{federationId} 생성
2. 기본 pages 생성 (home, about, greeting, history, organization, sponsors, docs, contact, youth)
3. 기본 menus 생성 (홈, 협회소개, 공지, 대회/리그, 경기일정, 결과/순위, 참가팀/클럽, 규정/자료실, 후원사, 유소년, 문의하기)
4. 초기 공지 3개 생성
5. 초기 규정/문서 생성 (대회요강, 대회규정, 선수등록 규정)
6. 관리자 계정 연결 (admins/{adminId})
7. 기본 AI agents 생성 (7개)
8. sportType 기준 템플릿 적용
9. 홈페이지 publish (homepageVisible: true)
10. admin workspace 생성 (adminEnabled: true)
```

### Cloud Function 구현

```typescript
// functions/src/federation/createFederation.ts
// YAGO_FEDERATION_AUTO_GENERATE_COMPLETE.md 참고
```

---

## 1️⃣7️⃣ 인덱스 설정

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
        { "fieldPath": "matchDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "matchDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standings",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "seasonId", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "registrations",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## ✅ 핵심 원칙

### 1. 협회 단위로 데이터 격리
- 모든 문서에 `federationId` 포함
- 협회별 독립적인 데이터 구조

### 2. 시즌/대회별 하위 집계 구조 유지
- 시즌별 teams, matches, standings 분리
- 대회별 teams, matches, brackets 분리

### 3. 팀/선수 마스터와 참가 엔트리 분리
- `teams/{teamId}` - 팀 마스터
- `seasons/{seasonId}/teams/{teamId}` - 시즌 참가 상태

### 4. 홈페이지용 콘텐츠와 운영 데이터 분리
- `pages`, `menus`, `banners` - 홈페이지 콘텐츠
- `tournaments`, `matches`, `standings` - 운영 데이터

### 5. AI 에이전트도 협회별 독립 구성
- `aiAgents/{agentId}` - 협회별 AI 에이전트
- 협회별 독립적인 설정 및 지식 소스

### 6. 신규 협회 생성을 템플릿화
- `systemTemplates/{templateId}` - 종목별 템플릿
- 자동 생성 시 템플릿 적용

---

**작성일**: 2024년  
**상태**: ✅ YAGO 완성형 Firestore DB 스키마 완료
