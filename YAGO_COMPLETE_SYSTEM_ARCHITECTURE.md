# 🏛️ YAGO VIBE SPORTS - 전체 시스템 아키텍처

> **작성일**: 2024년  
> **목적**: 실제 서비스 구조 완성 - Frontend, Backend, Firestore, AI Agents, Automation

---

## 📋 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [Frontend 아키텍처](#2-frontend-아키텍처)
3. [Backend 아키텍처](#3-backend-아키텍처)
4. [Firestore 아키텍처](#4-firestore-아키텍처)
5. [AI Agents 아키텍처](#5-ai-agents-아키텍처)
6. [Automation 아키텍처](#6-automation-아키텍처)
7. [데이터 흐름](#7-데이터-흐름)
8. [보안 아키텍처](#8-보안-아키텍처)

---

## 1️⃣ 시스템 아키텍처 개요

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  React App (Web) + React Native (Mobile)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  API Gateway Layer                      │
│  Firebase Auth + Cloud Functions                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Business Logic Layer                    │
│  Cloud Functions (Federation, Tournament, Match, AI)    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                              │
│  Firestore + Firebase Storage + Redis Cache             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  External Services                       │
│  OpenAI API + Email Service + Push Notifications        │
└─────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Frontend 아키텍처

### 기술 스택

```
React 18
TypeScript
React Router v6
Tailwind CSS
shadcn/ui
Lucide Icons
Firebase SDK
```

### 폴더 구조

```
src/
├── app/                    # 앱 설정
│   ├── App.tsx
│   └── providers/
│       ├── AuthProvider.tsx
│       └── ThemeProvider.tsx
│
├── pages/                  # 페이지 컴포넌트
│   ├── federations/
│   │   ├── FederationListPage.tsx
│   │   ├── FederationHomePage.tsx
│   │   ├── FederationAboutPage.tsx
│   │   ├── FederationNoticesPage.tsx
│   │   ├── FederationTournamentsPage.tsx
│   │   ├── TournamentDetailPage.tsx
│   │   ├── FederationMatchesPage.tsx
│   │   ├── FederationClubsPage.tsx
│   │   ├── FederationDocsPage.tsx
│   │   ├── FederationSponsorsPage.tsx
│   │   └── FederationAdminDashboard.tsx
│   │
│   ├── sports/             # 개인 스포츠 활동
│   └── admin/              # 플랫폼 관리
│       └── CreateFederationPage.tsx
│
├── components/             # 재사용 컴포넌트
│   ├── federation/
│   │   ├── FederationHeader.tsx
│   │   ├── FederationTabs.tsx
│   │   ├── FederationHero.tsx
│   │   ├── ActiveTournaments.tsx
│   │   ├── TodayMatches.tsx
│   │   ├── CurrentStandings.tsx
│   │   ├── FeaturedClubs.tsx
│   │   ├── SponsorsBanner.tsx
│   │   └── AIChatbot.tsx
│   │
│   ├── tournament/
│   │   ├── TournamentCard.tsx
│   │   ├── TournamentBracket.tsx
│   │   └── TournamentStandings.tsx
│   │
│   ├── match/
│   │   ├── MatchCard.tsx
│   │   ├── MatchTimeline.tsx
│   │   └── MatchLineup.tsx
│   │
│   └── ui/                 # 공통 UI 컴포넌트
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       └── LoadingSpinner.tsx
│
├── hooks/                  # 커스텀 훅
│   ├── useFederation.ts
│   ├── useTournaments.ts
│   ├── useMatches.ts
│   ├── useStandings.ts
│   ├── useClubs.ts
│   ├── useSponsors.ts
│   ├── useAIChat.ts
│   └── useIsFederationAdmin.ts
│
├── services/               # Firestore 서비스
│   ├── federationService.ts
│   ├── tournamentService.ts
│   ├── matchService.ts
│   ├── teamService.ts
│   └── aiService.ts
│
├── types/                  # TypeScript 타입
│   ├── federation.ts
│   ├── tournament.ts
│   ├── match.ts
│   ├── team.ts
│   └── player.ts
│
├── lib/                    # 유틸리티
│   ├── firebase.ts
│   ├── utils.ts
│   └── constants.ts
│
└── layout/                 # 레이아웃 컴포넌트
    ├── Header.tsx
    └── Footer.tsx
```

### 상태 관리

```
Context API (Auth, Theme)
React Hooks (로컬 상태)
Firestore onSnapshot (실시간 데이터)
```

---

## 3️⃣ Backend 아키텍처

### Cloud Functions 구조

```
functions/
├── src/
│   ├── federation/
│   │   ├── createFederation.ts        # 협회 생성
│   │   ├── updateFederation.ts         # 협회 수정
│   │   └── deleteFederation.ts         # 협회 삭제
│   │
│   ├── tournament/
│   │   ├── createTournament.ts         # 대회 생성
│   │   ├── generateBracket.ts          # 대진표 생성
│   │   └── updateStandings.ts          # 순위 업데이트
│   │
│   ├── league/
│   │   ├── createLeague.ts              # 리그 생성
│   │   ├── createSeason.ts              # 시즌 생성
│   │   └── generateSchedule.ts         # 일정 생성 (Round Robin)
│   │
│   ├── match/
│   │   ├── createMatch.ts               # 경기 생성
│   │   ├── updateMatchResult.ts        # 결과 입력
│   │   └── updateStats.ts              # 통계 업데이트
│   │
│   ├── team/
│   │   ├── approveTeam.ts              # 팀 승인
│   │   └── registerPlayer.ts           # 선수 등록
│   │
│   ├── ai/
│   │   ├── queryAI.ts                  # AI 쿼리 처리
│   │   ├── mainAssistant.ts            # 대표 AI 비서
│   │   ├── tournamentGuide.ts          # 대회 안내 AI
│   │   ├── matchOps.ts                 # 경기 운영 AI
│   │   └── regulationAssistant.ts      # 규정 AI
│   │
│   ├── automation/
│   │   ├── onMatchCompleted.ts         # 경기 완료 시 자동 처리
│   │   ├── onStandingsUpdated.ts       # 순위 업데이트 시 자동 처리
│   │   └── sendNotifications.ts        # 알림 발송
│   │
│   └── triggers/
│       ├── onFederationCreated.ts      # 협회 생성 트리거
│       ├── onTournamentCreated.ts      # 대회 생성 트리거
│       └── onMatchEventCreated.ts      # 경기 이벤트 트리거
│
├── package.json
└── tsconfig.json
```

### 주요 Cloud Functions

#### 1. createFederation

```typescript
// 협회 생성 (13단계 자동 생성)
export const createFederation = onCall(async (request) => {
  // YAGO_FEDERATION_AUTO_BUILD_LOGIC.md 참고
});
```

#### 2. generateSchedule

```typescript
// Round Robin 일정 생성
export const generateSchedule = onCall(async (request) => {
  const { seasonId, teamIds } = request.data;
  // Round Robin 알고리즘 적용
  // matches 컬렉션에 경기 생성
});
```

#### 3. updateStandings

```typescript
// 순위 자동 업데이트
export const updateStandings = onCall(async (request) => {
  const { seasonId, matchId } = request.data;
  // 경기 결과 기반 순위 재계산
  // standings 컬렉션 업데이트
});
```

#### 4. queryAI

```typescript
// AI 쿼리 처리
export const queryAI = onCall(async (request) => {
  const { federationId, agentType, question } = request.data;
  // 에이전트별 처리 로직
  // OpenAI API 호출
  // 응답 반환
});
```

---

## 4️⃣ Firestore 아키텍처

### 컬렉션 구조

```
federations/{federationId}
  ├─ pages/{pageId}
  ├─ menus/{menuId}
  ├─ notices/{noticeId}
  ├─ tournaments/{tournamentId}
  │   ├─ teams/{teamId}
  │   ├─ matches/{matchId}
  │   └─ brackets/{bracketId}
  ├─ leagues/{leagueId}
  │   └─ seasons/{seasonId}
  │       ├─ teams/{teamId}
  │       ├─ matches/{matchId}
  │       ├─ standings/{teamId}
  │       └─ stats/{statId}
  ├─ teams/{teamId}
  │   └─ roster/{playerId}
  ├─ players/{playerId}
  ├─ matches/{matchId}
  │   ├─ events/{eventId}
  │   └─ lineups/{playerId}
  ├─ documents/{documentId}
  ├─ sponsors/{sponsorId}
  ├─ staff/{staffId}
  ├─ admins/{adminId}
  └─ aiAgents/{agentId}
```

### 인덱스 전략

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
        { "fieldPath": "matchDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standings",
      "fields": [
        { "fieldPath": "federationId", "order": "ASCENDING" },
        { "fieldPath": "seasonId", "order": "ASCENDING" },
        { "fieldPath": "rank", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 5️⃣ AI Agents 아키텍처

### 에이전트 구조

```
AI Agent System
  ├─ General Assistant (대표 AI 비서)
  │   └─ 홈페이지 전체 검색 및 안내
  │
  ├─ Tournament Guide (대회 안내 AI)
  │   └─ 브로슈어 기반 대회 정보 제공
  │
  ├─ Match Operations (경기 운영 AI)
  │   └─ 운영진용 경기 관리 보조
  │
  ├─ Team Registration (팀 등록 AI)
  │   └─ 팀 등록 안내 및 검수
  │
  ├─ Player Registration (선수 등록 AI)
  │   └─ 선수 등록 안내 및 검수
  │
  ├─ Rules & Docs (규정 AI)
  │   └─ 규정 검색 및 해석
  │
  └─ Admin Operations (협회 행정 AI)
      └─ 조직/임원/행사 운영
```

### AI 처리 플로우

```
사용자 질문
  ↓
의도 분석 (키워드 기반)
  ↓
에이전트 라우팅
  ↓
Firestore 데이터 조회
  ↓
컨텍스트 구성
  ↓
OpenAI API 호출
  ↓
응답 생성
  ↓
대화 기록 저장
  ↓
사용자에게 전달
```

---

## 6️⃣ Automation 아키텍처

### 자동화 트리거

#### 1. 경기 완료 시

```typescript
// functions/src/triggers/onMatchCompleted.ts
export const onMatchCompleted = onDocumentUpdated(
  "federations/{federationId}/matches/{matchId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // 경기 상태가 completed로 변경된 경우
    if (before.status !== "completed" && after.status === "completed") {
      // 순위 업데이트
      await updateStandings(after.seasonId, after.id);
      
      // 통계 업데이트
      await updatePlayerStats(after.id);
      await updateTeamStats(after.id);
      
      // Activity Feed 생성
      await createMatchActivity(after);
      
      // 알림 발송
      await sendMatchResultNotifications(after);
    }
  }
);
```

#### 2. 순위 업데이트 시

```typescript
// functions/src/triggers/onStandingsUpdated.ts
export const onStandingsUpdated = onDocumentUpdated(
  "federations/{federationId}/seasons/{seasonId}/standings/{teamId}",
  async (event) => {
    const after = event.data.after.data();
    
    // 랭킹 업데이트
    await updateRankings(after.seasonId);
    
    // 리더보드 업데이트
    await updateLeaderboard(after.seasonId);
  }
);
```

#### 3. 협회 생성 시

```typescript
// functions/src/triggers/onFederationCreated.ts
export const onFederationCreated = onDocumentCreated(
  "federations/{federationId}",
  async (event) => {
    const federation = event.data.data();
    
    // 검색 인덱스 생성
    await createSearchIndex(federation);
    
    // 기본 설정 생성
    await createDefaultSettings(federation.id);
  }
);
```

---

## 7️⃣ 데이터 흐름

### 협회 생성 플로우

```
사용자 입력
  ↓
Cloud Function (createFederation)
  ↓
Firestore 배치 쓰기
  ├─ Federation 문서
  ├─ Pages (9개)
  ├─ Menus (11개)
  ├─ Notices (3개)
  ├─ Documents (3개)
  ├─ Leagues (3개)
  ├─ Admins (1개 이상)
  └─ AI Agents (7개)
  ↓
생성 완료
  ↓
Frontend 리다이렉트
  ↓
협회 홈페이지 표시
```

### 경기 결과 입력 플로우

```
관리자 결과 입력
  ↓
Cloud Function (updateMatchResult)
  ↓
Match 문서 업데이트
  ↓
트리거 (onMatchCompleted)
  ↓
자동 처리
  ├─ Standings 업데이트
  ├─ Player Stats 업데이트
  ├─ Team Stats 업데이트
  ├─ Activity Feed 생성
  └─ 알림 발송
  ↓
Frontend 실시간 업데이트
```

### AI 쿼리 플로우

```
사용자 질문
  ↓
Frontend (useAIChat)
  ↓
Cloud Function (queryAI)
  ↓
의도 분석
  ↓
에이전트 라우팅
  ↓
Firestore 데이터 조회
  ↓
컨텍스트 구성
  ↓
OpenAI API 호출
  ↓
응답 생성
  ↓
대화 기록 저장
  ↓
Frontend 응답 표시
```

---

## 8️⃣ 보안 아키텍처

### 인증 계층

```
1. Firebase Auth (사용자 인증)
2. Firestore Security Rules (데이터 접근 제어)
3. Cloud Functions 권한 확인 (비즈니스 로직)
4. Federation Admin 권한 (협회별 권한)
```

### 권한 구조

```
Platform Admin
  └─ 모든 협회 생성/관리 가능

Federation Super Admin
  └─ 해당 협회 모든 권한

Federation Admin
  └─ 해당 협회 운영 권한

League Manager
  └─ 리그/시즌 관리 권한

Match Operator
  └─ 경기 관리 권한

Viewer
  └─ 조회만 가능
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Federations
    match /federations/{federationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid in resource.data.adminUids || 
         request.auth.uid in resource.data.superAdminUids);
      
      // Pages (공개)
      match /pages/{pageId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
      }
      
      // Matches (공개 읽기, 관리자 쓰기)
      match /matches/{matchId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
      }
      
      // Admins (관리자만)
      match /admins/{adminId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.adminUids;
        allow write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/federations/$(federationId)).data.superAdminUids;
      }
    }
  }
}
```

---

## ✅ 시스템 아키텍처 요약

### 레이어별 역할

```
Client Layer
  - UI 렌더링
  - 사용자 인터랙션
  - 실시간 데이터 구독

API Gateway Layer
  - 인증/인가
  - 요청 라우팅
  - 에러 처리

Business Logic Layer
  - 비즈니스 로직
  - 데이터 검증
  - 자동화 처리

Data Layer
  - 데이터 저장
  - 인덱싱
  - 캐싱

External Services
  - AI 서비스
  - 알림 서비스
  - 스토리지 서비스
```

### 확장성

```
수평 확장
  - Cloud Functions 자동 스케일링
  - Firestore 자동 스케일링
  - CDN (Firebase Hosting)

수직 확장
  - 캐싱 전략
  - 인덱스 최적화
  - 배치 처리
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO 전체 시스템 아키텍처 완료
