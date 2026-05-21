# 🚀 YAGO SPORTS 플랫폼 전체 시스템 아키텍처

> **실제 서비스 런칭 기준 설계 문서**
> 
> 이 문서는 지금까지 설계한 모든 기능을 실제 운영 가능한 구조로 정리한 것입니다.

---

## 📋 목차

1. [전체 아키텍처 개요](#1-전체-아키텍처-개요)
2. [Frontend 구조](#2-frontend-구조)
3. [Backend 구조](#3-backend-구조)
4. [Database 구조](#4-database-구조)
5. [Cloud Functions](#5-cloud-functions)
6. [인증 및 권한](#6-인증-및-권한)
7. [Aggregation Engine](#7-aggregation-engine)
8. [Search Engine](#8-search-engine)
9. [Media Storage](#9-media-storage)
10. [Notification 시스템](#10-notification-시스템)
11. [Infrastructure](#11-infrastructure)
12. [Scaling 전략](#12-scaling-전략)
13. [보안 전략](#13-보안-전략)
14. [배포 파이프라인](#14-배포-파이프라인)
15. [비용 구조](#15-비용-구조)
16. [확장 로드맵](#16-확장-로드맵)

---

## 1️⃣ 전체 아키텍처 개요

### 시스템 레이어

```
┌─────────────────────────────────────────┐
│         Client Layer                    │
│  (Web / Mobile Browser)                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Frontend Layer                   │
│  React / Next.js App                    │
│  - Public Pages                          │
│  - Admin Console                         │
│  - Directory / Search                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         API Layer                        │
│  - Firebase Auth                         │
│  - Cloud Functions                       │
│  - Firestore SDK                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Database Layer                   │
│  - Firestore (NoSQL)                     │
│  - Cloud Storage                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Aggregation Engine               │
│  - Cloud Functions                       │
│  - Summary Documents                     │
│  - Leaderboards                          │
└─────────────────────────────────────────┘
```

### 기술 스택

| 레이어 | 기술 | 역할 |
|--------|------|------|
| Frontend | React + TypeScript | UI/UX |
| State Management | TanStack Query | 서버 상태 관리 |
| Backend | Firebase Cloud Functions | 서버 로직 |
| Database | Firestore | NoSQL 데이터베이스 |
| Storage | Firebase Storage | 미디어 파일 |
| Auth | Firebase Auth | 인증 |
| Hosting | Vercel / Firebase Hosting | 웹 호스팅 |
| CDN | Cloudflare | 콘텐츠 전송 |

---

## 2️⃣ Frontend 구조

### 폴더 구조

```
src/
├── app/                    # Next.js App Router (또는 React Router)
│   ├── admin/              # Admin 페이지
│   ├── events/             # Event 페이지
│   ├── teams/              # Team 페이지
│   ├── players/            # Player 페이지
│   ├── search/             # Search 페이지
│   └── stats/              # Stats 페이지
│
├── components/             # 재사용 컴포넌트
│   ├── ui/                 # 기본 UI 컴포넌트
│   ├── admin/              # Admin 전용 컴포넌트
│   ├── events/             # Event 관련 컴포넌트
│   ├── teams/              # Team 관련 컴포넌트
│   └── players/            # Player 관련 컴포넌트
│
├── services/               # API 서비스 레이어
│   ├── eventService.ts
│   ├── teamService.ts
│   ├── playerService.ts
│   ├── leaderboardService.ts
│   └── searchService.ts
│
├── hooks/                  # 커스텀 훅
│   ├── useEvents.ts
│   ├── useTeams.ts
│   └── usePlayers.ts
│
├── types/                  # TypeScript 타입
│   ├── event.ts
│   ├── team.ts
│   └── player.ts
│
└── lib/                    # 유틸리티
    ├── firebase.ts
    └── utils.ts
```

### 페이지 구조

#### Public Pages

```
/                           # 홈
/events                     # Event 목록
/events/:eventId            # Event 상세
  ├── Overview
  ├── Teams
  ├── Bracket
  ├── Matches
  ├── Results
  └── Stats

/teams                      # Teams Directory
/teams/:teamId              # Team 상세
  ├── Overview
  ├── Matches
  ├── Players
  ├── Records
  └── Awards

/players                    # Players Directory
/players/:playerId          # Player 상세
  ├── Overview
  ├── Match Log
  ├── Events
  └── Awards

/search?q=                  # Global Search
```

#### Admin Pages

```
/admin                      # Admin Dashboard
/admin/organizations        # Organization 목록
/admin/organizations/:orgId # Organization 상세
  ├── Overview
  ├── Events
  ├── Teams
  ├── Players
  ├── Members
  └── Settings

/admin/organizations/:orgId/events/:eventId
  ├── Overview
  ├── Matches
  ├── Bracket
  ├── Teams
  ├── Players
  ├── Stats
  └── Settings

/admin/organizations/:orgId/events/:eventId/matches/:matchId/stats
  └── Player Stats Input
```

### 상태 관리

**TanStack Query (React Query)** 사용

```typescript
// 예시: Event 데이터 조회
const { data, isLoading } = useQuery({
  queryKey: ["event", eventId],
  queryFn: () => getEvent(eventId),
  staleTime: 5 * 60 * 1000, // 5분
});
```

**장점:**
- Firestore 쿼리 캐싱
- 자동 refetch
- 서버 상태 관리
- Optimistic updates

---

## 3️⃣ Backend 구조

### Cloud Functions 구조

```
functions/src/
├── events/                 # Event 관련 Functions
│   ├── onEventMatchCompleted.ts
│   ├── onEventEntryApproved.ts
│   └── helpers/
│       └── championHelpers.ts
│
├── players/                # Player 관련 Functions
│   ├── onPlayerGameWrite.ts
│   ├── aggregatePlayerEventSummary.ts
│   ├── aggregatePlayerSeasonSummary.ts
│   ├── aggregatePlayerSummary.ts
│   └── createPlayerMatchHistory.ts
│
├── teams/                  # Team 관련 Functions
│   ├── onMatchResultWrite.ts
│   ├── aggregateTeamEventSummary.ts
│   ├── aggregateTeamSummary.ts
│   └── createTeamMatchHistory.ts
│
├── leaderboards/           # Leaderboard Functions
│   └── updateLeaderboards.ts
│
├── awards/                 # Award Functions
│   └── onEventAwardCreate.ts
│
├── search/                 # Search Index Functions
│   ├── onTeamWrite.ts
│   ├── onPlayerWrite.ts
│   └── onEventWrite.ts
│
└── utils/                  # 공통 유틸리티
    └── searchUtils.ts
```

### 주요 트리거

| 트리거 | 이벤트 | 역할 |
|--------|--------|------|
| `onPlayerGameWrite` | `player_games` onWrite | Player 집계 |
| `onMatchResultWrite` | `event_matches` onUpdate | Team 집계 |
| `onEventAwardCreate` | `event_awards` onCreate | Award 처리 |
| `onTeamWrite` | `teams` onWrite | Search Index 업데이트 |
| `onPlayerWrite` | `users` onWrite | Search Index 업데이트 |
| `onEventWrite` | `events` onWrite | Search Index 업데이트 |

---

## 4️⃣ Database 구조

### 핵심 컬렉션

#### Organization & Event

```
organizations/{orgId}
  - name, type, regionCode, sportType
  - status, createdAt, updatedAt

events/{eventId}
  - name, type, organizationId
  - startDate, endDate, status
  - champion, runnerUp

event_matches/{matchId}
  - eventId, divisionId, seasonId
  - homeTeamId, awayTeamId
  - homeScore, awayScore, status
  - roundCode, roundName, scheduledAt
```

#### Team & Player

```
teams/{teamId}
  - name, region, logoUrl
  - organizationId, isActive

players/{playerId} (users 컬렉션)
  - displayName, email, photoURL
  - position, currentTeamId
  - organizationRoles

team_players/{teamId_playerId}
  - teamId, playerId
  - role, status
```

#### Stats & Summary

```
player_games/{playerGameId}
  - matchId, eventId, playerId, teamId
  - goals, assists, yellowCards, redCards
  - appearance, starter, minutesPlayed

player_event_summaries/{playerId_eventId}
  - playerId, eventId, teamId
  - appearances, goals, assists

player_season_summaries/{playerId_seasonId}
  - playerId, seasonId, teamId
  - appearances, goals, assists

player_summary/{playerId}
  - appearances, goals, assists
  - mvpAwards, topScorerAwards

team_event_summaries/{teamId_eventId}
  - teamId, eventId
  - matches, wins, draws, losses
  - goalsFor, goalsAgainst

team_summary/{teamId}
  - matches, wins, draws, losses
  - championships, runnerUps
```

#### History & Leaderboards

```
player_match_history/{playerId_matchId}
  - playerId, matchId, eventId
  - goals, assists, yellowCards, redCards
  - result, matchDate

team_match_history/{teamId_matchId}
  - teamId, matchId, eventId
  - scored, conceded, result
  - matchDate

leaderboards/{eventId_category}
  - eventId, category (goals, assists, etc.)
  - leaderboard: [{rank, playerId, value}]

search_index/{entityType_entityId}
  - entityType, entityId
  - title, subtitle, url
  - searchKeywords
```

#### Admin & Permissions

```
users/{userId}
  - email, displayName
  - role (globalRole)
  - organizationRoles: {orgId: role}

organization_members/{orgId_userId}
  - organizationId, userId
  - role, status

organization_invites/{inviteId}
  - organizationId, email
  - role, status, expiresAt

admin_logs/{logId}
  - action, userId
  - entityType, entityId
  - before, after
```

#### Awards

```
event_awards/{awardId}
  - eventId, awardType
  - targetType (team/player)
  - targetId, targetName

player_awards/{awardId}
  - playerId, eventId
  - awardType, title

team_awards/{awardId}
  - teamId, eventId
  - awardType, title
```

---

## 5️⃣ Cloud Functions

### Aggregation Pipeline

#### Player Aggregation

```
player_games 생성/수정
    ↓
onPlayerGameWrite
    ├→ aggregatePlayerEventSummary
    ├→ aggregatePlayerSeasonSummary
    ├→ aggregatePlayerSummary
    ├→ createPlayerMatchHistory
    └→ updateLeaderboards
```

#### Team Aggregation

```
event_matches 완료 (status: "completed")
    ↓
onMatchResultWrite
    ├→ aggregateTeamEventSummary (홈/원정)
    ├→ aggregateTeamSummary (홈/원정)
    └→ createTeamMatchHistory (홈/원정)
```

#### Award Processing

```
event_awards 생성
    ↓
onEventAwardCreate
    ├→ player_awards 생성
    ├→ team_awards 생성
    ├→ player_summary 수상 카운트 업데이트
    └→ team_summary 수상 카운트 업데이트
```

### Search Index Pipeline

```
teams/{teamId} 생성/수정
    ↓
onTeamWrite
    └→ search_index/team_{teamId} 업데이트

users/{playerId} 생성/수정
    ↓
onPlayerWrite
    └→ search_index/player_{playerId} 업데이트

events/{eventId} 생성/수정
    ↓
onEventWrite
    └→ search_index/event_{eventId} 업데이트
```

---

## 6️⃣ 인증 및 권한

### 인증 시스템

**Firebase Auth** 사용

- Email/Password
- Google OAuth
- Apple OAuth

### 권한 구조

#### Global Role (플랫폼 레벨)

```typescript
users/{userId}.role
  - "ADMIN"  // Super Admin
  - "USER"   // 일반 사용자
```

#### Organization Role (조직 레벨)

```typescript
users/{userId}.organizationRoles
  {
    orgId1: "org_admin",
    orgId2: "event_manager",
    orgId3: "stats_manager"
  }
```

### 권한 체계

| Role | 권한 |
|------|------|
| `super_admin` | 전체 시스템 관리 |
| `org_admin` | 조직 전체 관리 |
| `event_manager` | 대회 운영 |
| `stats_manager` | 경기/기록 입력 |
| `viewer` | 조회만 |

### 권한 체크 함수

```typescript
// Organization 관리 권한
canManageOrganization(profile, orgId)

// Event 관리 권한
canManageEvent(profile, orgId)

// Stats 관리 권한
canManageStats(profile, orgId)

// 조회 권한
canView(profile, orgId)
```

---

## 7️⃣ Aggregation Engine

### 핵심 원칙

**Firestore는 JOIN이 약하므로 Summary/History 문서를 미리 생성**

### Player Aggregation Flow

```
player_games (원본)
    ↓
player_event_summaries (행사별 집계)
    ↓
player_season_summaries (시즌별 집계)
    ↓
player_summary (전체 누적)
    ↓
leaderboards (리더보드 캐시)
```

### Team Aggregation Flow

```
event_matches (원본)
    ↓
team_event_summaries (행사별 집계)
    ↓
team_summary (전체 누적)
    ↓
team_match_history (경기 이력)
```

### 성능 최적화

1. **Summary 우선 사용**: Public 페이지는 summary만 조회
2. **History 문서**: 경기 목록은 history 문서 사용
3. **Leaderboard 캐시**: 리더보드는 별도 문서로 캐시
4. **Batch Write**: 여러 문서 동시 업데이트

---

## 8️⃣ Search Engine

### 1차 구현: Firestore Search Index

**컬렉션**: `search_index`

**구조**:
```typescript
search_index/{entityType_entityId}
{
  entityType: "team" | "player" | "event",
  entityId: string,
  title: string,
  subtitle: string,
  url: string,
  searchKeywords: string[],  // prefix 배열
  stats?: object,
  isActive: boolean
}
```

**검색 방식**:
```typescript
where("searchKeywords", "array-contains", normalizedQuery)
```

### 2차 확장: 외부 검색엔진

**추천**: Algolia / Meilisearch

**장점**:
- 오타 허용
- 초성 검색
- 가중치 검색
- 실시간 자동완성

---

## 9️⃣ Media Storage

### Firebase Storage 구조

```
teams/{teamId}/logo.png
players/{playerId}/profile.jpg
events/{eventId}/banner.jpg
matches/{matchId}/photos/{photoId}.jpg
matches/{matchId}/highlights/{videoId}.mp4
```

### 이미지 최적화

**추천**: Cloudflare Images 또는 Firebase Resize Extension

**사이즈**:
- `thumbnail`: 150x150
- `medium`: 500x500
- `original`: 원본

---

## 🔟 Notification 시스템

### Notification 컬렉션

```
notifications/{notificationId}
{
  userId: string,
  type: "match_result" | "event_created" | "award_received",
  entityType: "match" | "event" | "award",
  entityId: string,
  title: string,
  message: string,
  link?: string,
  isRead: boolean,
  createdAt: Timestamp
}
```

### Notification Types

| Type | 트리거 | 대상 |
|------|--------|------|
| `match_result` | 경기 결과 입력 | 팀 멤버 |
| `event_created` | 대회 생성 | 조직 멤버 |
| `award_received` | 수상 확정 | 선수/팀 |
| `stats_updated` | 기록 업데이트 | 선수 |

### 구현 방식

1. **Cloud Functions**: 트리거 시 notification 생성
2. **Email**: SendGrid / Firebase Extensions
3. **Push**: Firebase Cloud Messaging (FCM)

---

## 1️⃣1️⃣ Infrastructure

### Hosting

**추천**: Vercel (Next.js) 또는 Firebase Hosting

**장점**:
- Edge caching
- CDN 자동
- 자동 배포
- SSL 자동

### CDN

**추천**: Cloudflare

**역할**:
- 이미지 캐싱
- API 보호
- DDoS 보호
- 글로벌 배포

### 모니터링

**추천**: Sentry + Google Cloud Logging

**목적**:
- Error tracking
- Performance monitoring
- User analytics

---

## 1️⃣2️⃣ Scaling 전략

### Firestore 최적화

**전략**:
1. **Summary Documents**: 집계 문서 우선 사용
2. **History Documents**: 경기 이력 별도 저장
3. **Leaderboard Cache**: 리더보드 캐시
4. **Index 최적화**: 복합 인덱스 설정

### 예상 데이터 규모

| 컬렉션 | 예상 규모 |
|--------|-----------|
| Events | 500 |
| Teams | 3,000 |
| Players | 50,000 |
| Matches | 100,000 |
| player_games | 1,000,000+ |

**Firestore 충분히 감당 가능**

### 성능 전략

**Public 페이지**:
- Summary 문서만 조회
- History 문서 사용
- Leaderboard 캐시 활용

**Admin 페이지**:
- Batch write 사용
- Cloud Functions aggregation
- 실시간 구독 최소화

---

## 1️⃣3️⃣ 보안 전략

### Firestore Security Rules

```javascript
// 예시: Event 관리 권한
match /events/{eventId} {
  allow read: if true;  // 공개 읽기
  
  allow write: if 
    isOrgAdmin(resource.data.organizationId) ||
    isEventManager(resource.data.organizationId);
}

// 예시: Player Stats 입력 권한
match /player_games/{playerGameId} {
  allow read: if true;
  
  allow write: if 
    isOrgAdmin(getEventOrgId(resource.data.eventId)) ||
    isStatsManager(getEventOrgId(resource.data.eventId));
}
```

### Admin 권한 체크

**프론트 + 백엔드 이중 체크**

1. **프론트**: `OrganizationAdminRoute` 컴포넌트
2. **백엔드**: Firestore Security Rules

### Rate Limiting

**Cloudflare** 또는 **Cloud Functions**에서 구현

---

## 1️⃣4️⃣ 배포 파이프라인

### CI/CD 구조

```
GitHub Repository
    ↓
GitHub Actions
    ├→ Frontend Build
    │   └→ Vercel Deploy
    │
    └→ Cloud Functions Build
        └→ Firebase Deploy
```

### 환경 분리

| 환경 | Firebase 프로젝트 | 목적 |
|------|------------------|------|
| Development | `sports-dev` | 개발 테스트 |
| Staging | `sports-staging` | QA 테스트 |
| Production | `sports-prod` | 실제 서비스 |

### 배포 절차

1. **개발**: `dev` 브랜치 → `sports-dev`
2. **스테이징**: `staging` 브랜치 → `sports-staging`
3. **프로덕션**: `main` 브랜치 → `sports-prod`

---

## 1️⃣5️⃣ 비용 구조

### 초기 비용 (Free Tier)

| 서비스 | Free Tier |
|--------|-----------|
| Firestore | 50K reads/day |
| Cloud Functions | 2M invocations/month |
| Storage | 5GB |
| Hosting | 무제한 |

**초기 서비스는 Free Tier로 충분**

### 성장 후 예상 비용

| 서비스 | 예상 비용 |
|--------|-----------|
| Firestore | $25-50/month |
| Cloud Functions | $20-40/month |
| Storage | $10-20/month |
| CDN | $10-30/month |

**총 예상: $65-140/month**

**대회 플랫폼 기준으로 매우 저렴**

---

## 1️⃣6️⃣ 확장 로드맵

### Phase 1: 핵심 기능 (완료)

✅ Organization System
✅ Event Management
✅ Tournament Engine
✅ Bracket Generator
✅ Match Results
✅ Player Stats Engine
✅ Aggregation Engine
✅ Leaderboards
✅ Team/Player Pages
✅ Directory/Search
✅ Admin CMS
✅ RBAC

### Phase 2: UX 개선

- [ ] Mobile Optimization
- [ ] Push Notifications
- [ ] Media Uploads
- [ ] Highlight Videos
- [ ] Social Features

### Phase 3: 고급 기능

- [ ] Mobile App (React Native)
- [ ] Scouting Data
- [ ] Transfer System
- [ ] League Systems
- [ ] Analytics Dashboard

---

## 📊 플랫폼 완성도

### 현재 상태

**기능 완성도**: ~85%

**포함된 기능**:
- ✅ 대회 운영 시스템
- ✅ 토너먼트 엔진
- ✅ 선수 기록 시스템
- ✅ 리더보드
- ✅ 공개 페이지
- ✅ 탐색 시스템
- ✅ Admin CMS
- ✅ 권한 체계

**남은 작업**:
- ⏳ UX/UI 개선
- ⏳ 알림 시스템
- ⏳ 미디어 업로드
- ⏳ 모바일 최적화

### 서비스 가능 수준

**현재 플랫폼은 이미 실제 서비스 가능한 수준입니다.**

다음 단계는 **UX/UI 개선**과 **사용자 테스트**입니다.

---

## 🎯 핵심 원칙

1. **Summary 우선**: Public 페이지는 summary/history만 사용
2. **Cloud Functions 집계**: 모든 집계는 Cloud Functions에서 자동 처리
3. **권한 이중 체크**: 프론트 + Firestore Rules
4. **성능 최적화**: Summary, History, Cache 활용
5. **확장 가능 구조**: 나중에 외부 서비스 연동 쉬운 구조

---

## 📝 참고 문서

- [Firestore Data Structure](./YAGO_FIRESTORE_DATA_STRUCTURE.md)
- [Service Layer Pattern](./.cursor/rules/service-layer-pattern.mdc)
- [Hook Pattern](./.cursor/rules/hook-pattern.mdc)
- [Deployment Guide](./.cursor/rules/deployment-guide.mdc)

---

**마지막 업데이트**: 2024년
