# 🚀 YAGO VIBE SPORTS - Cursor 개발 프롬프트 패키지

> **목적**: 노원구 축구협회를 첫 번째 실전 사례로 YAGO 멀티 협회형 스포츠 운영 SaaS 구현

---

## 📋 목차

1. [Master Prompt](#1-master-prompt)
2. [1차 구현 범위](#2-1차-구현-범위)
3. [파일 단위 초정밀 프롬프트](#3-파일-단위-초정밀-프롬프트)
4. [작업 순서 가이드](#4-작업-순서-가이드)

---

## 1️⃣ Master Prompt

### 전체 개발 방향

```
We are building YAGO VIBE SPORTS as a multi-federation sports operating platform.

The first real production implementation target is:
Nowon-gu Football Association (노원구 축구협회).

This is not a generic sports app.
This is a federation website + league operating system + tournament operating system + admin dashboard.

Core product structure:
- Federation public homepage
- Federation admin dashboard
- League and season management
- Tournament and bracket management
- Team registration and approval
- Team roster and player registration
- Match schedule and result management
- Standings and statistics
- Documents / notices / sponsors
- AI-ready operating structure

Use:
- React / Next.js
- TypeScript
- TailwindCSS
- Reusable dashboard components
- Clean information architecture
- Football-specific terminology
- Modular folder structure
- Production-ready routing

Important:
- The federation homepage and dashboard must be separate but connected.
- Public pages are for visitors, teams, parents, sponsors, and players.
- Admin pages are for federation operators.
- Build with reusable multi-federation architecture so new federations can be generated later.
```

---

## 2️⃣ 1차 구현 범위

### MVP Build Prompt

```
Build the MVP for Nowon-gu Football Association inside YAGO VIBE SPORTS.

Implement these core modules first:

1. Federation public homepage
2. Federation admin dashboard
3. League management
4. Season management
5. Team registration approval
6. Team roster management
7. Match management
8. Result input
9. Standings view
10. Notices

The first routes to implement are:

Public:
- /federations/nowon-football
- /federations/nowon-football/about
- /federations/nowon-football/notices
- /federations/nowon-football/tournaments
- /federations/nowon-football/matches
- /federations/nowon-football/clubs
- /federations/nowon-football/docs
- /federations/nowon-football/sponsors

Admin:
- /federations/nowon-football/admin
- /federations/nowon-football/admin/leagues
- /federations/nowon-football/admin/seasons
- /federations/nowon-football/admin/registrations
- /federations/nowon-football/admin/teams
- /federations/nowon-football/admin/players
- /federations/nowon-football/admin/matches
- /federations/nowon-football/admin/results
- /federations/nowon-football/admin/standings
- /federations/nowon-football/admin/notices

Use mock data first, but structure everything for Firestore integration.
```

---

## 3️⃣ 파일 단위 초정밀 프롬프트

### 3.1 폴더 구조 생성

**프롬프트**:
```
Create the folder structure for YAGO federation platform.

Structure:
src/
  pages/
    federations/
      [federationId]/
        index.tsx (홈페이지)
        about.tsx
        notices.tsx
        tournaments.tsx
        matches.tsx
        clubs.tsx
        docs.tsx
        sponsors.tsx
        admin/
          index.tsx (대시보드)
          leagues.tsx
          seasons.tsx
          registrations.tsx
          teams.tsx
          players.tsx
          matches.tsx
          results.tsx
          standings.tsx
          notices.tsx
          tournaments.tsx
          tournaments/
            [tournamentId]/
              index.tsx
              draw.tsx
              schedule.tsx
              bracket.tsx

  components/
    federation/
      FederationHeader.tsx
      FederationTabs.tsx
      FederationHero.tsx
      ActiveTournaments.tsx
      TodayMatches.tsx
      CurrentStandings.tsx
      FeaturedClubs.tsx
      SponsorsBanner.tsx
      AIChatbot.tsx
    
    admin/
      AdminSidebar.tsx
      AdminTopbar.tsx
      StatCard.tsx
      QuickActionGrid.tsx
      ApprovalDrawer.tsx
      ResultEntryPanel.tsx
    
    shared/
      DataTable.tsx
      StatusBadge.tsx
      SectionHeader.tsx
      FilterBar.tsx
      NoticeCard.tsx
      LeagueCard.tsx
      TournamentCard.tsx
      MatchCard.tsx
      StandingTable.tsx
      TeamCard.tsx
      PlayerTable.tsx
      BracketView.tsx

  hooks/
    useFederation.ts
    useLeagues.ts
    useSeasons.ts
    useTeams.ts
    useMatches.ts
    useStandings.ts
    useTournaments.ts

  services/
    federationService.ts
    leagueService.ts
    seasonService.ts
    teamService.ts
    matchService.ts
    tournamentService.ts

  types/
    federation.ts
    league.ts
    season.ts
    team.ts
    match.ts
    tournament.ts
    player.ts

  lib/
    mock/
      mockFederation.ts
      mockLeagues.ts
      mockMatches.ts
    utils/
      dateUtils.ts
      formatUtils.ts
```

---

### 3.2 협회 홈페이지 (index.tsx)

**프롬프트**:
```
Create the federation public homepage for Nowon-gu Football Association.

File: src/pages/federations/[federationId]/index.tsx

Requirements:
- Route: /federations/nowon-football
- Must feel like an official football association portal
- Use mock data from mockFederation.ts

Sections (in order):
1. Hero Section
   - Federation name: "노원구 축구협회"
   - Short description
   - CTA buttons: "대회 보기", "경기 일정", "팀 등록"

2. Active Competitions
   - Current leagues (use ActiveTournaments component)
   - Current tournaments

3. Latest Notices
   - Recent 5 notices (use NoticeCard component)
   - "더보기" link to /notices

4. Upcoming Matches
   - Today's matches (use TodayMatches component)
   - This week's matches

5. Standings Snapshot
   - Top 5 teams from active season (use CurrentStandings component)
   - "전체 순위 보기" link

6. Clubs Directory Preview
   - Participating teams (use FeaturedClubs component)
   - "전체 팀 보기" link to /clubs

7. Sponsors Section
   - Official sponsors (use SponsorsBanner component)

8. AI Helper CTA
   - "AI 비서에게 물어보기" button
   - Opens AI chatbot (placeholder for now)

Layout:
- Use FederationHeader at top
- Use FederationTabs for navigation
- Card-based sections
- Responsive grid layout
- Clean, professional football association aesthetic

Use TailwindCSS for styling.
Import components from @/components/federation
```

---

### 3.3 관리자 대시보드 (admin/index.tsx)

**프롬프트**:
```
Create the federation admin dashboard.

File: src/pages/federations/[federationId]/admin/index.tsx

Requirements:
- Route: /federations/nowon-football/admin
- Protected route (check admin permission)
- Use AdminSidebar and AdminTopbar components

Layout:
- Left sidebar: AdminSidebar
- Top header: AdminTopbar
- Main content area

KPI Cards (top row):
- Active Leagues (count)
- Active Seasons (count)
- Registered Teams (count)
- Registered Players (count)
- Total Matches (count)
- Pending Approvals (count)
- Unreported Results (count)

Use StatCard component for each KPI.

Quick Actions (second row):
- "리그 생성" → /admin/leagues?action=create
- "시즌 생성" → /admin/seasons?action=create
- "팀 승인" → /admin/registrations
- "공지 작성" → /admin/notices?action=create
- "결과 입력" → /admin/results

Use QuickActionGrid component.

Widgets (below):
1. Pending Registrations
   - List of teams waiting approval
   - Show: team name, submitted date, status
   - "승인하기" button

2. Today's Matches
   - List of matches scheduled today
   - Show: time, teams, venue, status
   - "결과 입력" button

3. Recent Notices
   - Last 5 notices
   - "새 공지 작성" button

4. Missing Results
   - Matches without results
   - Show: date, teams, hours since match

Use mock data from mockFederation.ts
Style with TailwindCSS
```

---

### 3.4 리그 관리 페이지 (admin/leagues.tsx)

**프롬프트**:
```
Create the league management page.

File: src/pages/federations/[federationId]/admin/leagues.tsx

Requirements:
- Route: /federations/nowon-football/admin/leagues
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "리그 관리"
- "리그 생성" button (top right)
- DataTable with league list

Table columns:
- 리그명 (name)
- 카테고리 (category: 성인/유소년/혼합)
- 연령대 (ageGroup)
- 성별 (gender: 남자/여자/혼성)
- 현재 시즌 (currentSeason)
- 팀 수 (teamCount)
- 상태 (status: draft/active/completed)
- Actions (보기/수정/보관)

Filters:
- Category filter
- Status filter
- Search by name

Create/Edit Form (drawer or modal):
- 리그명 (required)
- 설명
- 카테고리 (select)
- 연령대 (select)
- 성별 (select)
- 경기 유형 (round_robin/knockout)
- 공개 여부 (toggle)
- 상태 (select)

Use DataTable component
Use mock data from mockLeagues.ts
Handle create/edit/delete actions
```

---

### 3.5 시즌 관리 페이지 (admin/seasons.tsx)

**프롬프트**:
```
Create the season management page.

File: src/pages/federations/[federationId]/admin/seasons.tsx

Requirements:
- Route: /federations/nowon-football/admin/seasons
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "시즌 관리"
- "시즌 생성" button
- Filter by league
- DataTable with season list

Table columns:
- 시즌명 (name)
- 리그 (league name)
- 기간 (startDate - endDate)
- 팀 제한 (teamLimit)
- 경기 수 (matchCount)
- 상태 (status)
- Actions

Season Detail View (tabs):
- Overview: 기본 정보, 통계
- Teams: 참가 팀 목록
- Matches: 경기 일정
- Standings: 순위표
- Notices: 관련 공지

Create/Edit Form:
- 시즌명
- 소속 리그 (select)
- 시작일 (date picker)
- 종료일 (date picker)
- 팀 제한 수
- 승점 규칙 (승리/무승부/패배)
- 동점 처리 규칙
- 공개 여부

Use DataTable and tab components
Use mock data from mockSeasons.ts
```

---

### 3.6 참가 신청 승인 페이지 (admin/registrations.tsx)

**프롬프트**:
```
Create the team registration approval page.

File: src/pages/federations/[federationId]/admin/registrations.tsx

Requirements:
- Route: /federations/nowon-football/admin/registrations
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "참가 신청 승인"
- Status filter tabs: 전체/대기중/검토중/승인/거절
- DataTable with registration list

Table columns:
- 제출일 (submittedDate)
- 리그/시즌 (league/season)
- 팀명 (teamName)
- 담당자 (manager)
- 연락처 (phone)
- 선수 수 (playerCount)
- 상태 (status badge)
- Actions (검토/승인/거절)

Status badges:
- 대기중: yellow
- 검토중: blue
- 승인: green
- 거절: red
- 수정요청: orange

Review Drawer (side panel):
- 팀 정보
  - 팀명
  - 담당자
  - 연락처
  - 이메일
  - 주소
- 제출 서류
  - 등록 신청서
  - 선수 명단
  - 서약서
- 메모
  - 내부 메모 입력
- Actions
  - 승인
  - 거절
  - 수정 요청
  - 저장

Use ApprovalDrawer component
Use StatusBadge component
Use mock data
```

---

### 3.7 경기 관리 페이지 (admin/matches.tsx)

**프롬프트**:
```
Create the match management page.

File: src/pages/federations/[federationId]/admin/matches.tsx

Requirements:
- Route: /federations/nowon-football/admin/matches
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "경기 관리"
- Filters: 날짜, 리그/시즌, 상태
- DataTable with match list

Table columns:
- 경기일 (matchDate)
- 시간 (matchTime)
- 리그/시즌
- 라운드 (round)
- 홈팀 (homeTeam)
- 스코어 (score)
- 원정팀 (awayTeam)
- 경기장 (venue)
- 심판 (referee)
- 상태 (status badge)
- Actions

Status badges:
- 예정: gray
- 진행중: blue
- 완료: green
- 연기: orange
- 취소: red

Match Detail View (modal or page):
- Overview tab
  - 경기 정보
  - 팀 정보
  - 경기장 정보
- Lineups tab
  - 홈팀 라인업
  - 원정팀 라인업
- Events tab
  - 경기 이벤트 타임라인
- Stats tab
  - 팀 통계
  - 선수 통계
- Result tab
  - 결과 입력/수정

Use MatchCard component for list view
Use mock data from mockMatches.ts
```

---

### 3.8 결과 입력 페이지 (admin/results.tsx)

**프롬프트**:
```
Create the match result entry page.

File: src/pages/federations/[federationId]/admin/results.tsx

Requirements:
- Route: /federations/nowon-football/admin/results
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "결과 입력"
- Filter: 날짜, 미입력만 보기
- List of matches needing results

Result Entry Panel (use ResultEntryPanel component):

1. Match Info
   - Date, time, venue
   - Home team vs Away team

2. Final Score
   - Home score input
   - Away score input

3. Scorers
   - Add scorer button
   - For each scorer:
     - Player select
     - Minute input
     - Assist select (optional)
     - Type: goal/own_goal/penalty

4. Cards
   - Yellow cards
   - Red cards
   - For each card:
     - Player select
     - Minute input

5. Substitutions
   - Add substitution button
   - For each substitution:
     - Out player select
     - In player select
     - Minute input

6. Notes
   - Textarea for match notes

7. Actions
   - 저장
   - 취소
   - 확인 (finalize)

On save:
- Update match status to "completed"
- Update standings automatically
- Update player/team stats
- Create activity feed entry

Use ResultEntryPanel component
Use mock data
Handle form validation
```

---

### 3.9 순위 페이지 (admin/standings.tsx)

**프롬프트**:
```
Create the season standings page.

File: src/pages/federations/[federationId]/admin/standings.tsx

Requirements:
- Route: /federations/nowon-football/admin/standings
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "순위"
- Season selector (dropdown)
- StandingTable component

Standings Table columns:
- 순위 (rank)
- 팀 (team name + logo)
- 경기수 (played)
- 승 (wins)
- 무 (draws)
- 패 (losses)
- 득점 (goalsFor)
- 실점 (goalsAgainst)
- 득실차 (goalDifference)
- 승점 (points)
- 최근 경기 (form: W/W/L/D/W)

Additional widgets:
- Top Scorers
  - Player name
  - Goals
  - Assists
  - Team

- Top Assists
  - Player name
  - Assists
  - Goals
  - Team

- Discipline Table
  - Team
  - Yellow cards
  - Red cards
  - Suspensions

Use StandingTable component
Use mock data from mockStandings.ts
Auto-refresh when results are updated
```

---

### 3.10 대회 관리 페이지 (admin/tournaments.tsx)

**프롬프트**:
```
Create the tournament management page.

File: src/pages/federations/[federationId]/admin/tournaments.tsx

Requirements:
- Route: /federations/nowon-football/admin/tournaments
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "대회 관리"
- "대회 생성" button
- DataTable with tournament list

Table columns:
- 대회명 (name)
- 포맷 (format: 리그/토너먼트/혼합)
- 연령대 (ageGroup)
- 성별 (gender)
- 기간 (startDate - endDate)
- 팀 수 (teamCount)
- 상태 (status)
- Actions

Tournament Detail Pages:
- /admin/tournaments/[tournamentId] (overview)
- /admin/tournaments/[tournamentId]/draw (조 추첨)
- /admin/tournaments/[tournamentId]/schedule (일정 생성)
- /admin/tournaments/[tournamentId]/bracket (대진표)

Create Tournament Form:
- 대회명
- 포맷 선택 (리그/토너먼트/조별리그+토너먼트)
- 연령대
- 성별
- 시작일/종료일
- 경기장 목록
- 팀 수
- 조 수 (조별리그인 경우)
- 조별 진출팀 수
- 시드 사용 여부
- 3/4위전 여부
- 승부차기 여부

Use TournamentCard component
Use mock data
```

---

### 3.11 대진표 생성 페이지 (admin/tournaments/[tournamentId]/bracket.tsx)

**프롬프트**:
```
Create the tournament bracket view page.

File: src/pages/federations/[federationId]/admin/tournaments/[tournamentId]/bracket.tsx

Requirements:
- Route: /federations/nowon-football/admin/tournaments/[tournamentId]/bracket
- Use AdminSidebar and AdminTopbar layout

Display:
- Page title: "대진표"
- Tournament info header
- BracketView component

Bracket View should show:
- Group Stage (if applicable)
  - Group A, B, C, D tables
  - Standings
  - Advancing teams highlighted

- Knockout Stage
  - Quarterfinals
  - Semifinals
  - Final
  - 3/4th Place (if enabled)

Visual bracket:
- Tree structure
- Match boxes with:
  - Team names
  - Scores
  - Status
  - Next match connection

Actions:
- Generate bracket (if not generated)
- Edit bracket (manual adjustment)
- Update results
- View match details

Use BracketView component
Use mock bracket data
Support both group stage and knockout visualization
```

---

### 3.12 공통 컴포넌트: DataTable

**프롬프트**:
```
Create a reusable DataTable component.

File: src/components/shared/DataTable.tsx

Requirements:
- Generic, reusable table component
- TypeScript with generics
- Support sorting, filtering, pagination
- Responsive design

Props:
- data: T[]
- columns: ColumnDef<T>[]
- onRowClick?: (row: T) => void
- sortable?: boolean
- filterable?: boolean
- pagination?: boolean
- pageSize?: number

Column definition:
interface ColumnDef<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

Features:
- Column sorting (asc/desc)
- Row click handler
- Responsive: mobile shows cards
- Loading state
- Empty state
- Custom cell rendering

Use TailwindCSS
Make it production-ready
```

---

### 3.13 공통 컴포넌트: AdminSidebar

**프롬프트**:
```
Create the admin sidebar navigation component.

File: src/components/admin/AdminSidebar.tsx

Requirements:
- Fixed left sidebar
- Collapsible (mobile)
- Active route highlighting
- Icon + text navigation

Menu items:
- 대시보드 (/admin)
- 리그 관리 (/admin/leagues)
- 시즌 관리 (/admin/seasons)
- 참가 승인 (/admin/registrations)
- 팀 관리 (/admin/teams)
- 선수 관리 (/admin/players)
- 경기 관리 (/admin/matches)
- 결과 입력 (/admin/results)
- 순위 (/admin/standings)
- 공지 관리 (/admin/notices)
- 대회 관리 (/admin/tournaments)

Features:
- Active route detection
- Collapse/expand on mobile
- Icon for each menu item
- Badge for pending items (optional)
- User info at bottom

Use Lucide icons
Use TailwindCSS
Responsive design
```

---

### 3.14 공통 컴포넌트: ResultEntryPanel

**프롬프트**:
```
Create the match result entry panel component.

File: src/components/admin/ResultEntryPanel.tsx

Requirements:
- Comprehensive result entry form
- Step-by-step or single form
- Validation
- Auto-save draft

Sections:
1. Match Info (read-only)
   - Date, time, venue
   - Teams

2. Final Score
   - Home score input (number)
   - Away score input (number)
   - Validation: must be numbers

3. Scorers Section
   - Add scorer button
   - List of scorers
   - For each:
     - Player dropdown
     - Minute input
     - Assist dropdown (optional)
     - Goal type (goal/own_goal/penalty)
     - Remove button

4. Cards Section
   - Yellow cards list
   - Red cards list
   - For each:
     - Player dropdown
     - Minute input
     - Remove button

5. Substitutions Section
   - Substitutions list
   - For each:
     - Out player dropdown
     - In player dropdown
     - Minute input
     - Remove button

6. Notes
   - Textarea

7. Actions
   - Save draft
   - Cancel
   - Confirm (finalize)

Validation:
- Score must be entered
- Scorers must have player and minute
- Cards must have player and minute
- Substitutions must have both players and minute

Use form library (react-hook-form recommended)
Use TailwindCSS
Handle loading states
```

---

## 4️⃣ 작업 순서 가이드

### Phase 1: 기반 구조 (1-2일)

```
1. Master Prompt 적용
2. 폴더 구조 생성
3. 공통 컴포넌트 (DataTable, StatusBadge, SectionHeader)
4. Mock 데이터 생성
5. 라우팅 설정
```

### Phase 2: 공개 페이지 (2-3일)

```
1. 협회 홈페이지 (index.tsx)
2. 협회 소개 페이지 (about.tsx)
3. 공지 페이지 (notices.tsx)
4. 대회 페이지 (tournaments.tsx)
5. 경기 일정 페이지 (matches.tsx)
6. 팀 페이지 (clubs.tsx)
```

### Phase 3: 관리자 대시보드 (2-3일)

```
1. 관리자 대시보드 (admin/index.tsx)
2. AdminSidebar
3. AdminTopbar
4. StatCard
5. QuickActionGrid
```

### Phase 4: 리그/시즌 관리 (2일)

```
1. 리그 관리 페이지
2. 시즌 관리 페이지
3. 리그/시즌 생성 폼
```

### Phase 5: 팀/선수 관리 (2일)

```
1. 참가 승인 페이지
2. 팀 관리 페이지
3. 선수 관리 페이지
4. ApprovalDrawer
```

### Phase 6: 경기/결과 관리 (2-3일)

```
1. 경기 관리 페이지
2. 결과 입력 페이지
3. ResultEntryPanel
4. MatchCard
```

### Phase 7: 순위/통계 (1-2일)

```
1. 순위 페이지
2. StandingTable
3. 통계 위젯
```

### Phase 8: 대회 시스템 (3-4일)

```
1. 대회 관리 페이지
2. 대회 생성 폼
3. 조 추첨 페이지
4. 일정 생성 페이지
5. 대진표 페이지
6. BracketView
```

---

## ✅ 프롬프트 사용 가이드

### 1. 한 번에 하나씩

각 프롬프트를 개별적으로 Cursor에 입력하고 완료 후 다음으로 진행

### 2. 컴포넌트 우선

공통 컴포넌트를 먼저 만들고 페이지에서 재사용

### 3. Mock 데이터 활용

실제 Firestore 연결 전에 Mock 데이터로 전체 플로우 완성

### 4. 점진적 개선

기본 기능 완성 후 스타일링 및 최적화

---

**작성일**: 2024년  
**상태**: ✅ Cursor 개발 프롬프트 패키지 완료
