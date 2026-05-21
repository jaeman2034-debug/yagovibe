# 🗺️ YAGO VIBE SPORTS - 개발 로드맵

> **작성일**: 2024년  
> **목적**: 실제 구현 순서 및 단계별 개발 가이드

---

## 📋 목차

1. [전체 개발 단계](#1-전체-개발-단계)
2. [Phase 1: 기반 구조](#2-phase-1-기반-구조)
3. [Phase 2: 공개 페이지](#3-phase-2-공개-페이지)
4. [Phase 3: 관리자 대시보드](#4-phase-3-관리자-대시보드)
5. [Phase 4: 리그/시즌 시스템](#5-phase-4-리그시즌-시스템)
6. [Phase 5: 팀/선수 시스템](#6-phase-5-팀선수-시스템)
7. [Phase 6: 경기/결과 시스템](#7-phase-6-경기결과-시스템)
8. [Phase 7: 대회 시스템](#8-phase-7-대회-시스템)
9. [Phase 8: AI 시스템](#9-phase-8-ai-시스템)
10. [Phase 9: 협회 자동 생성](#10-phase-9-협회-자동-생성)

---

## 1️⃣ 전체 개발 단계

### 개발 순서

```
Phase 1: 기반 구조 (1주)
  ↓
Phase 2: 공개 페이지 (1주)
  ↓
Phase 3: 관리자 대시보드 (1주)
  ↓
Phase 4: 리그/시즌 시스템 (1주)
  ↓
Phase 5: 팀/선수 시스템 (1주)
  ↓
Phase 6: 경기/결과 시스템 (1주)
  ↓
Phase 7: 대회 시스템 (2주)
  ↓
Phase 8: AI 시스템 (2주)
  ↓
Phase 9: 협회 자동 생성 (1주)
```

**총 예상 기간**: 10주 (약 2.5개월)

---

## 2️⃣ Phase 1: 기반 구조

### 목표
프로젝트 구조 및 공통 컴포넌트 구축

### 작업 내용

1. **폴더 구조 생성**
   ```
   src/
     pages/
     components/
     hooks/
     services/
     types/
     lib/
   ```

2. **공통 컴포넌트**
   - DataTable
   - StatusBadge
   - SectionHeader
   - FilterBar
   - LoadingSpinner
   - ErrorBoundary

3. **타입 정의**
   - federation.ts
   - league.ts
   - season.ts
   - team.ts
   - match.ts
   - tournament.ts
   - player.ts

4. **Mock 데이터**
   - mockFederation.ts
   - mockLeagues.ts
   - mockMatches.ts
   - mockTeams.ts

5. **라우팅 설정**
   - Next.js App Router 구조
   - 동적 라우팅 설정

### 완료 기준
- [ ] 폴더 구조 완성
- [ ] 공통 컴포넌트 5개 이상
- [ ] 타입 정의 완료
- [ ] Mock 데이터 준비
- [ ] 기본 라우팅 동작

---

## 3️⃣ Phase 2: 공개 페이지

### 목표
협회 홈페이지 및 공개 페이지 구현

### 작업 내용

1. **협회 홈페이지**
   - `/federations/[federationId]`
   - Hero Section
   - Active Tournaments
   - Latest Notices
   - Upcoming Matches
   - Standings Snapshot
   - Featured Clubs
   - Sponsors Banner

2. **협회 소개 페이지**
   - `/federations/[federationId]/about`
   - President greeting
   - Federation introduction
   - History
   - Organization chart

3. **공지 페이지**
   - `/federations/[federationId]/notices`
   - Notice list
   - Notice detail
   - Category filter

4. **대회 페이지**
   - `/federations/[federationId]/tournaments`
   - Tournament list
   - Tournament detail

5. **경기 일정 페이지**
   - `/federations/[federationId]/matches`
   - Match list
   - Match detail
   - Date filter

6. **팀 페이지**
   - `/federations/[federationId]/clubs`
   - Team list
   - Team detail

### 완료 기준
- [ ] 홈페이지 6개 섹션 완성
- [ ] 공개 페이지 5개 이상
- [ ] 반응형 디자인 적용
- [ ] Mock 데이터 연동

---

## 4️⃣ Phase 3: 관리자 대시보드

### 목표
관리자 대시보드 및 기본 관리 기능

### 작업 내용

1. **관리자 대시보드**
   - `/federations/[federationId]/admin`
   - KPI Cards
   - Quick Actions
   - Widgets

2. **AdminSidebar**
   - Navigation menu
   - Active route highlighting
   - Collapsible

3. **AdminTopbar**
   - User info
   - Notifications
   - Settings

4. **StatCard 컴포넌트**
   - KPI 표시
   - Trend 표시

5. **QuickActionGrid**
   - 빠른 액션 버튼들

### 완료 기준
- [ ] 대시보드 레이아웃 완성
- [ ] AdminSidebar 동작
- [ ] KPI Cards 표시
- [ ] Quick Actions 동작

---

## 5️⃣ Phase 4: 리그/시즌 시스템

### 목표
리그 및 시즌 관리 기능

### 작업 내용

1. **리그 관리 페이지**
   - `/admin/leagues`
   - League list
   - Create/Edit league
   - League filters

2. **시즌 관리 페이지**
   - `/admin/seasons`
   - Season list
   - Create/Edit season
   - Season detail (tabs)

3. **리그/시즌 서비스**
   - leagueService.ts
   - seasonService.ts

4. **리그/시즌 훅**
   - useLeagues.ts
   - useSeasons.ts

### 완료 기준
- [ ] 리그 CRUD 완성
- [ ] 시즌 CRUD 완성
- [ ] 리그/시즌 연동
- [ ] Mock 데이터 연동

---

## 6️⃣ Phase 5: 팀/선수 시스템

### 목표
팀 등록 승인 및 선수 관리

### 작업 내용

1. **참가 승인 페이지**
   - `/admin/registrations`
   - Registration list
   - Approval drawer
   - Status filters

2. **팀 관리 페이지**
   - `/admin/teams`
   - Team list
   - Team detail
   - Team edit

3. **선수 관리 페이지**
   - `/admin/players`
   - Player list
   - Player detail
   - Player edit

4. **팀 명단 페이지**
   - `/teams/[teamId]/roster`
   - Roster table
   - Add/Edit player

5. **ApprovalDrawer 컴포넌트**
   - 승인/거절 UI
   - 메모 기능

### 완료 기준
- [ ] 참가 승인 플로우 완성
- [ ] 팀 CRUD 완성
- [ ] 선수 CRUD 완성
- [ ] 명단 관리 완성

---

## 7️⃣ Phase 6: 경기/결과 시스템

### 목표
경기 관리 및 결과 입력

### 작업 내용

1. **경기 관리 페이지**
   - `/admin/matches`
   - Match list
   - Match filters
   - Match detail

2. **결과 입력 페이지**
   - `/admin/results`
   - Result entry panel
   - Score input
   - Events input
   - Lineups input

3. **ResultEntryPanel 컴포넌트**
   - 종합 결과 입력 폼
   - Validation
   - Auto-save

4. **순위 페이지**
   - `/admin/standings`
   - Standings table
   - Top scorers
   - Top assists

5. **StandingTable 컴포넌트**
   - 순위표 표시
   - 정렬 기능

### 완료 기준
- [ ] 경기 CRUD 완성
- [ ] 결과 입력 완성
- [ ] 순위 계산 로직 완성
- [ ] 순위표 표시 완성

---

## 8️⃣ Phase 7: 대회 시스템

### 목표
대회 생성 및 대진표 생성

### 작업 내용

1. **대회 관리 페이지**
   - `/admin/tournaments`
   - Tournament list
   - Create tournament

2. **대회 생성 폼**
   - Basic info
   - Format selection
   - AI format recommendation
   - Options

3. **조 추첨 페이지**
   - `/admin/tournaments/[id]/draw`
   - Group draw UI
   - Seeding options
   - Manual adjustment

4. **일정 생성 페이지**
   - `/admin/tournaments/[id]/schedule`
   - Schedule generation
   - Conflict detection
   - Manual adjustment

5. **대진표 페이지**
   - `/admin/tournaments/[id]/bracket`
   - Bracket visualization
   - Group standings
   - Knockout bracket

6. **BracketView 컴포넌트**
   - 브래킷 시각화
   - 결과 표시

7. **대진표 생성 로직**
   - Round Robin 알고리즘
   - Knockout 알고리즘
   - Hybrid 알고리즘

8. **일정 최적화 로직**
   - Venue allocation
   - Time allocation
   - Conflict detection

### 완료 기준
- [ ] 대회 CRUD 완성
- [ ] AI 포맷 추천 동작
- [ ] 조 편성 완성
- [ ] 대진표 생성 완성
- [ ] 일정 생성 완성
- [ ] 브래킷 시각화 완성

---

## 9️⃣ Phase 8: AI 시스템

### 목표
AI 에이전트 시스템 구현

### 작업 내용

1. **AI Gateway (Cloud Function)**
   - queryAI 함수
   - Intent detection
   - Agent routing
   - Context retrieval

2. **Public AI Chatbot**
   - AIChatbot 컴포넌트
   - 홈페이지 통합
   - Conversation history

3. **Admin AI Panel**
   - AdminAIPanel 컴포넌트
   - Daily report
   - Alerts
   - Recommendations

4. **에이전트별 처리 로직**
   - Tournament Guide Agent
   - Team Registration Agent
   - Match Operations Agent
   - Rules & Documents Agent
   - Admin Operations Agent

5. **AI 자동화**
   - Notice draft generation
   - Report generation
   - Alert generation

6. **OpenAI API 통합**
   - API key 설정
   - Error handling
   - Rate limiting

### 완료 기준
- [ ] AI Gateway 동작
- [ ] Public AI Chatbot 동작
- [ ] Admin AI Panel 동작
- [ ] 에이전트별 응답 정확도 80% 이상
- [ ] 자동화 기능 동작

---

## 🔟 Phase 9: 협회 자동 생성

### 목표
협회 자동 생성 시스템

### 작업 내용

1. **협회 생성 페이지**
   - `/platform/federations/new`
   - Federation creation form
   - Preview

2. **Federation Builder (Cloud Function)**
   - createFederation 함수
   - 8단계 자동 생성
   - Batch writes

3. **자동 생성 로직**
   - Federation document
   - Default pages
   - Default menus
   - Admin accounts
   - Default leagues
   - AI agents
   - Dashboard initialization

4. **검증 로직**
   - Creation validation
   - Rollback on error

### 완료 기준
- [ ] 협회 생성 폼 완성
- [ ] 자동 생성 로직 완성
- [ ] 8단계 모두 동작
- [ ] 검증 로직 완성
- [ ] 생성 시간 10초 이내

---

## 📊 개발 우선순위

### MVP (최소 기능 제품)

```
Phase 1: 기반 구조
Phase 2: 공개 페이지
Phase 3: 관리자 대시보드
Phase 4: 리그/시즌 시스템
Phase 5: 팀/선수 시스템
Phase 6: 경기/결과 시스템
```

**예상 기간**: 6주

### Full Feature

```
Phase 7: 대회 시스템
Phase 8: AI 시스템
Phase 9: 협회 자동 생성
```

**예상 기간**: 4주

---

## 🎯 각 Phase별 체크리스트

### Phase 1 체크리스트
- [ ] 폴더 구조 생성
- [ ] 공통 컴포넌트 5개
- [ ] 타입 정의
- [ ] Mock 데이터
- [ ] 라우팅 설정

### Phase 2 체크리스트
- [ ] 홈페이지 6개 섹션
- [ ] 공개 페이지 5개
- [ ] 반응형 디자인
- [ ] Mock 데이터 연동

### Phase 3 체크리스트
- [ ] 대시보드 레이아웃
- [ ] AdminSidebar
- [ ] KPI Cards
- [ ] Quick Actions

### Phase 4 체크리스트
- [ ] 리그 CRUD
- [ ] 시즌 CRUD
- [ ] 리그/시즌 연동

### Phase 5 체크리스트
- [ ] 참가 승인
- [ ] 팀 CRUD
- [ ] 선수 CRUD
- [ ] 명단 관리

### Phase 6 체크리스트
- [ ] 경기 CRUD
- [ ] 결과 입력
- [ ] 순위 계산
- [ ] 순위표 표시

### Phase 7 체크리스트
- [ ] 대회 CRUD
- [ ] AI 포맷 추천
- [ ] 조 편성
- [ ] 대진표 생성
- [ ] 일정 생성
- [ ] 브래킷 시각화

### Phase 8 체크리스트
- [ ] AI Gateway
- [ ] Public AI Chatbot
- [ ] Admin AI Panel
- [ ] 에이전트별 로직
- [ ] 자동화 기능

### Phase 9 체크리스트
- [ ] 협회 생성 폼
- [ ] 자동 생성 로직
- [ ] 8단계 완성
- [ ] 검증 로직

---

## ✅ 개발 완료 기준

### MVP 완료
- 노원구 축구협회 홈페이지 동작
- 관리자 대시보드 동작
- 리그/시즌 관리 동작
- 팀/선수 관리 동작
- 경기/결과 관리 동작

### Full Feature 완료
- 대회 시스템 완전 동작
- AI 에이전트 시스템 동작
- 협회 자동 생성 동작
- 멀티 협회 지원

---

**작성일**: 2024년  
**상태**: ✅ YAGO 개발 로드맵 완료
