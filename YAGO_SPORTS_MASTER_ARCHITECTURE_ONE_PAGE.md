# 🏟️ YAGO VIBE SPORTS — Master Architecture (One Page)

> **작성일**: 2024년  
> **목적**: 개발 / Cursor 작업 / Firestore 설계 / 투자 설명 / 플랫폼 확장의 기준  
> **버전**: v1.0 Final

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    YAGO VIBE SPORTS                                           ║
║              Sports Operating System (SOS)                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER ENTRY POINTS                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    HOME     │  │ MARKETPLACE │  │ SPORTS HUB  │  │   PROFILE   │        │
│  │   /home     │  │  /market    │  │  /sports    │  │  /mypage    │        │
│  │             │  │             │  │             │  │             │        │
│  │ Quick Start │  │ 스포츠 장비  │  │ 7개 모듈    │  │ 내 정보/팀  │        │
│  │ Activity    │  │ 팀 용품     │  │             │  │             │        │
│  │ Feed        │  │ 거래        │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SPORTS HUB (7 MODULES)                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  내 팀   │  │  경기     │  │ 팀 이벤트 │  │  선수     │  │  통계     │     │
│  │ /teams   │  │ /matches │  │ /events  │  │ /players │  │ /stats   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                                                │
│  ┌──────────┐  ┌──────────┐                                                 │
│  │  대회     │  │  아카데미 │                                                 │
│  │ /tourn...│  │ /academy │                                                 │
│  └──────────┘  └──────────┘                                                 │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                          TEAM WORKSPACE SYSTEM                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  /sports/{type}/team                                                           │
│                                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 활동 피드 │  │  일정     │  │  멤버     │  │  기록     │  │  공지     │     │
│  │ Activity │  │ Schedule │  │ Members  │  │ Records  │  │ Notices  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐     │
│  │                        TEAM CHAT SYSTEM                              │     │
│  │  chatRooms/team_{teamId}/messages                                    │     │
│  │  - EventMessageCard (이벤트 카드)                                    │     │
│  │  - NoticeMessageCard (공지 카드)                                     │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                            MATCH SYSTEM (CORE)                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  matches/{matchId}                                                             │
│  ├─ lineups/{playerId}          # 라인업                                       │
│  └─ events/{eventId}             # 경기 이벤트                                 │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐     │
│  │              MATCH → STATS → RANKING FLOW                            │     │
│  │                                                                       │     │
│  │  Match 생성                                                            │     │
│  │    ↓                                                                  │     │
│  │  Match Events 기록                                                     │     │
│  │    ↓                                                                  │     │
│  │  Player Stats 자동 업데이트                                            │     │
│  │    ↓                                                                  │     │
│  │  Team Stats 자동 업데이트                                              │     │
│  │    ↓                                                                  │     │
│  │  Ranking 자동 재계산                                                   │     │
│  │    ↓                                                                  │     │
│  │  Activity Feed 자동 생성                                               │     │
│  └──────────────────────────────────────────────────────────────────────┘     │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                        STATS + RANKING ENGINE                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────┐              ┌──────────────────┐                      │
│  │  Player Stats    │              │   Team Stats      │                      │
│  │  players/{id}/    │              │   teams/{id}/     │                      │
│  │  stats/{season}  │              │   stats/{season}  │                      │
│  │                  │              │                   │                      │
│  │ - goals          │              │ - wins/draws/loss │                      │
│  │ - assists        │              │ - goalsFor/Against│                      │
│  │ - matches        │              │ - points          │                      │
│  └──────────────────┘              └──────────────────┘                      │
│                                                                                │
│  ┌──────────────────┐              ┌──────────────────┐                      │
│  │  Team Ranking    │              │  Player Ranking │                      │
│  │  rankings/{season│              │  rankings/{season│                      │
│  │  }/teams/{id}    │              │  }/players/{cat} │                      │
│  │                  │              │                  │                      │
│  │ - rank           │              │ - goals rank     │                      │
│  │ - points         │              │ - assists rank   │                      │
│  │ - goalDiff       │              │                  │                      │
│  └──────────────────┘              └──────────────────┘                      │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          FIRESTORE STRUCTURE                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Core Collections:                                                             │
│  ├─ users/{uid}                                                                │
│  ├─ teams/{teamId}                                                             │
│  │   ├─ members/{uid}                                                          │
│  │   ├─ events/{eventId}                                                       │
│  │   ├─ notices/{noticeId}                                                     │
│  │   ├─ matches/{matchId}                                                      │
│  │   ├─ stats/{seasonId}                                                       │
│  │   └─ activities/{activityId}                                                │
│  │                                                                              │
│  ├─ matches/{matchId}                                                          │
│  │   ├─ lineups/{playerId}                                                     │
│  │   └─ events/{eventId}                                                       │
│  │                                                                              │
│  ├─ players/{playerId}                                                         │
│  │   └─ stats/{seasonId}                                                       │
│  │                                                                              │
│  ├─ tournaments/{tournamentId}                                                 │
│  │   ├─ teams/{teamId}                                                         │
│  │   ├─ matches/{matchId}                                                      │
│  │   └─ standings/{teamId}                                                     │
│  │                                                                              │
│  ├─ rankings/{seasonId}                                                         │
│  │   ├─ teams/{teamId}                                                         │
│  │   └─ players/{category}/{playerId}                                          │
│  │                                                                              │
│  ├─ academies/{academyId}                                                      │
│  │   ├─ players/{playerId}                                                     │
│  │   ├─ coaches/{coachId}                                                      │
│  │   └─ programs/{programId}                                                   │
│  │                                                                              │
│  └─ chatRooms/team_{teamId}/messages/{messageId}                               │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         CLOUD FUNCTIONS TRIGGERS                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Team Triggers:                                                                │
│  ├─ onTeamCreated          → 채팅방 생성                                       │
│  ├─ onEventCreated         → 채팅 카드 + Activity 생성                          │
│  └─ onNoticeCreated        → 채팅 카드 + Activity 생성                          │
│                                                                                │
│  Match Triggers:                                                               │
│  ├─ onMatchCreated         → Activity 생성                                      │
│  ├─ onMatchEventCreated    → Stats 업데이트                                     │
│  └─ onMatchCompleted       → Stats + Ranking 재계산                             │
│                                                                                │
│  Stats Triggers:                                                               │
│  ├─ recalculateTeamRanking    → 팀 순위 재계산                                 │
│  └─ recalculatePlayerRanking  → 선수 순위 재계산                               │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW DIAGRAM                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  User Action                                                                   │
│    ↓                                                                           │
│  Frontend (React)                                                               │
│    ↓                                                                           │
│  Firestore Write                                                               │
│    ↓                                                                           │
│  Cloud Function Trigger                                                        │
│    ↓                                                                           │
│  Stats Update                                                                  │
│    ↓                                                                           │
│  Ranking Recalculation                                                         │
│    ↓                                                                           │
│  Activity Feed Update                                                          │
│    ↓                                                                           │
│  Frontend Real-time Update (onSnapshot)                                       │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         PLATFORM FEATURE MATRIX                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Feature                    │ Status │ Priority │ Integration                 │
│  ───────────────────────────┼────────┼──────────┼────────────────────────────│
│  Team Management            │   ✅   │   P0     │ Core                        │
│  Team Chat                  │   ✅   │   P0     │ Core                        │
│  Team Events                │   ✅   │   P0     │ Core                        │
│  Team Notices               │   ✅   │   P0     │ Core                        │
│  Activity Feed              │   ✅   │   P0     │ Core                        │
│  Match System               │   ✅   │   P0     │ Core                        │
│  Match Lineups              │   ⚠️   │   P1     │ Match                       │
│  Match Events               │   ⚠️   │   P1     │ Match                       │
│  Player Stats               │   ✅   │   P0     │ Match                       │
│  Team Stats                 │   ✅   │   P0     │ Match                       │
│  Ranking System             │   ✅   │   P0     │ Stats                       │
│  Tournament System          │   ⚠️   │   P1     │ Match                       │
│  Academy System             │   ⚠️   │   P2     │ Standalone                  │
│  Marketplace                │   ✅   │   P1     │ Standalone                  │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          PERMISSION STRUCTURE                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  User Level:                                                                   │
│  ├─ 팀 가입                                                                    │
│  ├─ 경기 참여                                                                  │
│  └─ 이벤트 참석                                                                │
│                                                                                │
│  Team Admin Level:                                                             │
│  ├─ 팀 관리                                                                    │
│  ├─ 멤버 관리                                                                  │
│  ├─ 경기 생성                                                                  │
│  └─ 공지 작성                                                                  │
│                                                                                │
│  Association Admin Level:                                                      │
│  ├─ 대회 생성                                                                  │
│  ├─ 팀 승인                                                                    │
│  ├─ 경기 관리                                                                  │
│  └─ 랭킹 관리                                                                  │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         TECHNOLOGY STACK                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Frontend:                                                                     │
│  ├─ React 18 + TypeScript                                                      │
│  ├─ React Router v6                                                            │
│  ├─ TailwindCSS                                                                │
│  ├─ Lucide Icons                                                               │
│  └─ TanStack Query (React Query)                                               │
│                                                                                │
│  Backend:                                                                      │
│  ├─ Firebase Firestore                                                         │
│  ├─ Firebase Cloud Functions (v2)                                              │
│  ├─ Firebase Storage                                                           │
│  └─ Firebase Auth                                                              │
│                                                                                │
│  Infrastructure:                                                               │
│  ├─ Firebase Hosting                                                           │
│  ├─ Cloudflare (CDN)                                                           │
│  └─ GitHub Actions (CI/CD)                                                     │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         SCALING STRATEGY                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Current Capacity:                                                              │
│  ├─ Teams: 1,000+                                                               │
│  ├─ Users: 10,000+                                                              │
│  └─ Matches: 10,000+ / month                                                    │
│                                                                                │
│  Growth Path:                                                                  │
│  ├─ Phase 1: Single Sport (Football) ✅                                        │
│  ├─ Phase 2: Multi-Sport (Football + Basketball) ⚠️                           │
│  ├─ Phase 3: Multi-Association (노원구 + 도봉구) ⚠️                           │
│  ├─ Phase 4: Multi-Region (서울 + 경기) ⚠️                                     │
│  └─ Phase 5: National Platform (전국) ⚠️                                        │
│                                                                                │
│  Technical Scaling:                                                            │
│  ├─ Firestore Sharding (by region)                                             │
│  ├─ Cloud Functions Regional Deployment                                        │
│  ├─ CDN for Static Assets                                                      │
│  └─ Redis Cache for Rankings                                                   │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════════════════╗
║                    YAGO VIBE SPORTS = Complete Sports OS                      ║
║                                                                                ║
║  ✅ Team Management          ✅ Match System                                   ║
║  ✅ Stats Engine             ✅ Ranking System                                 ║
║  ✅ Activity Feed            ✅ Chat System                                    ║
║  ✅ Event/Notice System      ⚠️ Tournament System                              ║
║  ⚠️ Academy System            ✅ Marketplace                                    ║
║                                                                                ║
║  Status: Production Ready (v1.0)                                              ║
║  Last Updated: 2024년                                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

```

---

## 📋 핵심 아키텍처 원칙

### 1. **통합 플랫폼**
- 팀 관리 + 경기 + 통계 + 커뮤니티가 하나로 통합
- 단일 진입점 (Sports Hub)에서 모든 기능 접근

### 2. **자동화 엔진**
- 경기 → 통계 → 랭킹 자동 계산
- Cloud Functions로 모든 집계 자동 처리

### 3. **실시간 동기화**
- Firestore onSnapshot으로 실시간 업데이트
- Activity Feed 자동 생성

### 4. **확장 가능한 구조**
- Multi-Sport 지원 준비
- Multi-Association 지원 준비
- 플러그인 방식의 모듈 구조

---

## 🎯 플랫폼 완성도

### 완전 구현 (✅)
- Team Management
- Team Chat
- Team Events
- Team Notices
- Activity Feed
- Match System
- Stats Engine
- Ranking System
- Marketplace

### 부분 구현 (⚠️)
- Match Lineups
- Match Events
- Tournament System
- Academy System

---

## 🚀 다음 확장 단계

### Federation + League System (협회 시스템)
```
federations/{federationId}
  ├─ leagues/{leagueId}
  │     ├─ teams/{teamId}
  │     ├─ matches/{matchId}
  │     └─ standings/{teamId}
  └─ clubs/{clubId}
```

이 구조를 추가하면:
- Association → League → Team → Match 계층 완성
- 협회/리그 운영까지 확장 가능
- 전국 단위 플랫폼으로 확장 가능

---

**이 문서는 YAGO VIBE SPORTS 플랫폼의 마스터 아키텍처입니다.**

- 개발 기준
- Cursor 작업 기준
- Firestore 설계 기준
- 투자 설명 기준
- 플랫폼 확장 기준
