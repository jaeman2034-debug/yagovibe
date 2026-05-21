# YAGO Platform - 최종 아키텍처 (한 장 구조)

## 🎯 플랫폼 비전

**AI Sports Organization Platform** - 협회, 아카데미, 클럽을 위한 통합 플랫폼

---

## 📊 전체 시스템 아키텍처

```
                         YAGO PLATFORM
                               │
                               ▼
                    ┌───────────────────────┐
                    │  AI Organization      │
                    │      Builder          │
                    │ (협회 / 아카데미 / 클럽) │
                    │  Wizard + Template    │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Template Engine     │
                    │ 조직 구조 자동 생성    │
                    │ 사이트 + 시스템 생성   │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Multi-Tenant System │
                    │ organization_id 기반   │
                    │ 데이터 완전 격리      │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ League Management     │
                    │ 리그 / 팀 / 경기 운영  │
                    │ 자동 스케줄링         │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Player Identity     │
                    │ 선수 프로필 / 커리어   │
                    │ 플랫폼 레벨 통계      │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Match Center       │
                    │ 경기 데이터 / 타임라인 │
                    │ 선수 통계             │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   AI Match Reports    │
                    │ 경기 기사 자동 생성    │
                    │ MVP 선정 / 하이라이트  │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    AI League Copilot  │
                    │ 관리자 AI 운영 도우미  │
                    │ 대화형 리그 관리       │
                    └───────────────────────┘
```

---

## 🔧 핵심 시스템 6개

### 1️⃣ AI Organization Builder

**3분 조직 생성**

**Wizard (7단계)**:
1. 조직 유형 선택 (협회/아카데미/클럽)
2. 종목 선택
3. 대상 선택
4. 운영 방식 선택
5. 로고 업로드
6. Hero 이미지 선택
7. 템플릿 추천

**출력**: Organization 생성 + 사이트 + 대시보드

---

### 2️⃣ Template Engine

**조직 구조 자동 생성**

**Template Library**:
```
templates/
  ├─ federation/
  │   ├─ football_league
  │   └─ basketball_league
  ├─ academy/
  │   └─ football_training
  └─ club/
      └─ football_club
```

**자동 생성**:
- 메뉴 구조
- 관리자 기능
- 웹사이트
- 초기 데이터

---

### 3️⃣ Multi-Tenant System

**organization_id 기반 데이터 격리**

**모든 컬렉션**:
```typescript
{
  organizationId: string; // 필수
  // ... 기타 필드
}
```

**격리**:
- 데이터 완전 분리
- Storage 격리
- Security Rules 격리

---

### 4️⃣ League Management System

**리그 운영 자동화**

**구조**:
```
Organization
 └─ Seasons
     └─ Leagues
         ├─ Teams
         ├─ Matches
         └─ Standings
```

**기능**:
- 자동 스케줄링 (Round Robin / Tournament)
- 순위 자동 계산
- 통계 자동 집계

---

### 5️⃣ Player Identity System

**플랫폼 레벨 선수 관리**

**구조**:
```
Player (Global)
 ├─ PlayerMemberships (참여 관계)
 ├─ MatchStats (경기 통계)
 └─ CareerHistory (커리어 히스토리)
```

**기능**:
- 선수 프로필 페이지
- 플랫폼 전체 통계
- 커리어 추적

---

### 6️⃣ AI Match Center

**경기 데이터 → 콘텐츠 자동 생성**

**구조**:
```
Match Result
 ├─ MatchEvents (이벤트)
 ├─ PlayerStats (선수 통계)
 └─ AI MatchReport (자동 리포트)
```

**기능**:
- 경기 리포트 자동 생성
- MVP 자동 선정
- 하이라이트 추출

---

## 🎨 Frontend Architecture

### 기술 스택

```
React 19
TypeScript
Tailwind CSS
React Router v7
Firebase SDK
```

### 앱 구조

```
src/
├── apps/
│   ├── organization-builder/    # Wizard UI
│   ├── dashboard/               # Admin Dashboard
│   ├── website/                 # Public Website
│   └── copilot/                 # AI Copilot
│
├── shared/
│   ├── components/              # 공통 컴포넌트
│   ├── hooks/                   # 공통 훅
│   ├── services/                # API 서비스
│   └── types/                   # 타입 정의
│
└── lib/
    ├── firebase/                # Firebase 설정
    ├── templates/               # 템플릿 로직
    ├── ai/                      # AI 통합
    └── utils/                   # 유틸리티
```

---

## 🔧 Backend Architecture

### API Server (Cloud Functions)

```
functions/
├── organization/
│   ├── createOrganization.ts
│   ├── getOrganization.ts
│   └── updateOrganization.ts
│
├── league/
│   ├── createLeague.ts
│   ├── generateSchedule.ts
│   └── updateStandings.ts
│
├── match/
│   ├── createMatch.ts
│   ├── recordResult.ts
│   └── generateReport.ts
│
├── player/
│   ├── registerPlayer.ts
│   └── updateStats.ts
│
└── copilot/
    └── processAction.ts
```

### 자동 트리거

```typescript
// 경기 완료 → 리포트 생성
onMatchCompleted → generateMatchReport()

// 경기 결과 입력 → 순위 업데이트
onMatchResultWrite → updateStandings()

// 팀 등록 → 통계 업데이트
onTeamRegistered → updateOrganizationStats()

// 선수 통계 → 글로벌 통계 업데이트
onPlayerStatsWrite → updateGlobalStats()
```

---

## 🗄️ Database Structure (Firestore)

### 핵심 컬렉션

```
organizations/{organizationId}
  ├─ type, name, slug, sport
  ├─ logoUrl, heroImageUrl
  └─ templateId, ownerId

seasons/{seasonId}
  ├─ federationId, name, year
  └─ startDate, endDate

leagues/{leagueId}
  ├─ organizationId, seasonId
  ├─ name, format, status
  └─ teamCount, matchCount

teams/{teamId}
  ├─ organizationId, name
  └─ logoUrl, ownerUid

players/{playerId}
  ├─ userId, playerName
  └─ globalStats

player_memberships/{membershipId}
  ├─ playerId, organizationId
  ├─ teamId, leagueId
  └─ status, stats

league_matches/{matchId}
  ├─ organizationId, leagueId
  ├─ homeTeamId, awayTeamId
  └─ homeScore, awayScore

match_events/{eventId}
  ├─ matchId, minute
  ├─ playerId, eventType
  └─ description

match_reports/{reportId}
  ├─ matchId, organizationId
  ├─ title, summary, fullReport
  └─ mvpPlayerId, highlights

copilot_actions/{actionId}
  ├─ organizationId, userId
  ├─ intent, parameters
  └─ executed, result
```

---

## 📦 Media Storage (Firebase Storage)

```
organizations/
  ├─ {organizationId}/
  │   ├─ logo/
  │   ├─ hero/
  │   ├─ teams/
  │   └─ players/
  │
  └─ hero_library/
      ├─ football/
      ├─ academy/
      └─ generic/
```

---

## 🔄 사용자 흐름

```
1. AI Organization Builder
   └─ Wizard (7단계)
       └─ Organization 생성
           │
           ▼
2. Organization Dashboard
   └─ Hero Section
   └─ Quick Actions
   └─ Stats Overview
       │
       ▼
3. League Management
   └─ 리그 생성
   └─ 팀 등록
   └─ 경기 일정
       │
       ▼
4. Match Center
   └─ 경기 결과 입력
   └─ AI 리포트 생성
   └─ 자동 게시
       │
       ▼
5. AI League Copilot
   └─ 대화형 관리
   └─ 작업 자동화
```

---

## 🎯 YAGO 포지셔닝

### 기존 시스템

```
리그 관리 툴
```

### YAGO

```
AI Sports Organization Platform
```

---

## 🔥 핵심 차별화 기능

### 1. AI Organization Builder
- 3분 조직 생성
- Hero 이미지 + 로고 선택
- 템플릿 기반 자동 생성

### 2. AI Match Center
- 경기 리포트 자동 생성
- MVP 자동 선정
- 하이라이트 추출

### 3. AI League Copilot
- 대화형 리그 관리
- 자연어로 작업 수행
- 학습 및 개선

---

## 📈 플랫폼 확장성

### 현재 지원

```
✅ Federations (협회)
✅ Academies (아카데미)
✅ Clubs (클럽)
✅ Leagues (리그)
✅ Tournaments (토너먼트)
✅ Teams (팀)
✅ Players (선수)
✅ AI Match Reports
✅ AI League Copilot
```

### 향후 확장 가능

```
🔜 선수 스카우팅
🔜 AI 경기 분석
🔜 영상 하이라이트
🔜 팬 커뮤니티
🔜 결제 시스템
🔜 모바일 앱
```

---

## 🏗️ 아키텍처 레이어

```
┌─────────────────────────────────────┐
│  Builder Layer                      │
│  AI Organization Builder            │
│  Template Engine                    │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Platform Layer                     │
│  Multi-Tenant Architecture          │
│  Organization Context               │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Operation Layer                    │
│  League Management                  │
│  Player Identity                    │
│  Match Center                       │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  AI Layer                            │
│  Match Reports                       │
│  League Copilot                      │
└─────────────────────────────────────┘
```

---

## 🎯 성공 결정 요소

### 1. Organization Builder (온보딩)
- 첫 경험이 플랫폼의 50% 결정
- AI Wizard UX가 핵심
- Hero 이미지 선택으로 브랜딩

### 2. Organization Dashboard (운영)
- 관리자가 가장 많이 보는 화면
- Quick Actions가 핵심
- Stats Overview로 상태 파악

**이 두 화면 UX가 플랫폼의 80% 경험을 결정합니다.**

---

## 🚀 기술 스택 요약

### Frontend
- React 19 + TypeScript
- Tailwind CSS
- React Router v7
- Firebase SDK

### Backend
- Firebase Functions
- Firestore
- Firebase Storage
- AI API (OpenAI / Claude)

### Infrastructure
- Firebase Hosting
- Cloud Functions
- Firestore Database
- Cloud Storage

---

## 📊 데이터 흐름

```
User Input
    │
    ▼
Frontend (React)
    │
    ▼
API (Cloud Functions)
    │
    ▼
Database (Firestore)
    │
    ▼
AI Processing (선택)
    │
    ▼
Response
    │
    ▼
UI Update
```

---

## ✅ 핵심 원칙

1. **Multi-Tenant First**: 모든 데이터에 organizationId
2. **AI-First UX**: Builder, Reports, Copilot 모두 AI 기반
3. **Player-Centric**: 선수 중심 플랫폼
4. **Template-Driven**: 템플릿 기반 자동 생성
5. **Real-Time**: 실시간 통계 및 업데이트

---

## 🎯 YAGO 최종 구조

```
AI Builder
    ↓
Sports Organization Platform
    ↓
League Management
    ↓
Sports Media + AI
```

---

이 아키텍처로 **YAGO는 진짜 AI Sports Organization Platform이 됩니다!** 🚀
