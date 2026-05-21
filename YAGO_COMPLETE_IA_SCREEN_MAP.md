# 🗺️ YAGO VIBE SPORTS - Complete IA + Screen Map

> **작성일**: 2024년  
> **목적**: 개발자/디자이너/Cursor가 동일한 구조로 작업할 수 있는 화면 지도

---

## 📋 목차

1. [YAGO 전체 화면 구조](#1-yago-전체-화면-구조)
2. [협회 홈페이지 구조](#2-협회-홈페이지-구조)
3. [협회 홈페이지 화면 Map](#3-협회-홈페이지-화면-map)
4. [협회 관리자 화면](#4-협회-관리자-화면)
5. [플랫폼 관리자 화면](#5-플랫폼-관리자-화면)
6. [전체 화면 수](#6-전체-화면-수)
7. [실제 서비스 흐름](#7-실제-서비스-흐름)

---

## 1️⃣ YAGO 전체 화면 구조

### 플랫폼 IA

```
/
└─ YAGO Home (플랫폼 홈페이지)

/sports
└─ 개인 스포츠 활동

/federations
└─ 협회 목록

/federations/[federationId]
├─ Home (협회 홈페이지)
├─ About (협회 소개)
├─ Notices (공지사항)
├─ Tournaments (대회/리그)
├─ Matches (경기 일정)
├─ Standings (순위)
├─ Clubs (참가팀)
├─ Documents (규정/자료실)
├─ Sponsors (후원사)
└─ Contact (문의하기)

/federations/[federationId]/admin
├─ Dashboard (관리자 대시보드)
├─ Leagues (리그 관리)
├─ Seasons (시즌 관리)
├─ Registrations (참가 승인)
├─ Teams (팀 관리)
├─ Players (선수 관리)
├─ Matches (경기 관리)
├─ Results (결과 입력)
├─ Standings (순위 관리)
├─ Tournaments (대회 관리)
│   └─ [tournamentId]
│       ├─ Overview (대회 개요)
│       ├─ Draw (조 추첨)
│       ├─ Schedule (일정 생성)
│       └─ Bracket (대진표)
├─ Notices (공지 관리)
├─ Documents (문서 관리)
├─ Sponsors (후원사 관리)
├─ Venues (경기장 관리)
├─ Referees (심판 관리)
└─ AI Operations (AI 운영)

/platform
├─ Federations (협회 관리)
│   └─ /new (협회 생성)
├─ Users (사용자 관리)
├─ Templates (템플릿 관리)
├─ AI Agents (AI 에이전트 관리)
└─ System Logs (시스템 로그)
```

---

## 2️⃣ 협회 홈페이지 구조

### 예시: 노원구 축구협회

```
/federations/nowon-football
```

### 화면 구조

```
Federation Homepage
│
├─ Home (/)
│   ├─ Hero Section
│   ├─ Active Competitions
│   ├─ Latest Notices
│   ├─ Upcoming Matches
│   ├─ Standings Snapshot
│   ├─ Featured Clubs
│   ├─ Sponsors Banner
│   └─ AI Helper CTA
│
├─ About (/about)
│   ├─ Federation Introduction
│   ├─ President Greeting
│   ├─ History
│   ├─ Vision / Mission
│   ├─ Organization Chart
│   ├─ Advisors
│   ├─ Executives
│   └─ Contact / Location
│
├─ Notices (/notices)
│   ├─ Notice List
│   ├─ Category Filter
│   ├─ Notice Detail
│   └─ Attachments
│
├─ Tournaments (/tournaments)
│   ├─ Tournament List
│   ├─ Tournament Detail
│   │   ├─ Overview
│   │   ├─ Participating Teams
│   │   ├─ Group Standings
│   │   ├─ Bracket
│   │   ├─ Schedule
│   │   └─ Results
│   └─ Filter (Status, Category)
│
├─ Matches (/matches)
│   ├─ Match List
│   ├─ Date Filter
│   ├─ Match Detail
│   │   ├─ Match Info
│   │   ├─ Lineups
│   │   ├─ Match Events
│   │   ├─ Team Stats
│   │   └─ Result Report
│   └─ Calendar View
│
├─ Standings (/standings)
│   ├─ Season Selector
│   ├─ Standings Table
│   ├─ Top Scorers
│   ├─ Top Assists
│   └─ Discipline Table
│
├─ Clubs (/clubs)
│   ├─ Team List
│   ├─ Team Detail
│   │   ├─ Team Info
│   │   ├─ Roster
│   │   ├─ Season Participation
│   │   └─ Match History
│   └─ Filter (Category, Age Group)
│
├─ Documents (/docs)
│   ├─ Document List
│   ├─ Category Filter
│   ├─ Document Detail
│   └─ Download
│
├─ Sponsors (/sponsors)
│   ├─ Sponsor List
│   ├─ Sponsor Categories
│   └─ Sponsor Detail
│
└─ Contact (/contact)
    ├─ Contact Form
    ├─ Contact Info
    └─ Location Map
```

---

## 3️⃣ 협회 홈페이지 화면 Map

### 3.1 Home (`/`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  FederationHeader                   │
├─────────────────────────────────────┤
│  FederationTabs                     │
├─────────────────────────────────────┤
│                                     │
│  Hero Section                       │
│  - Logo                             │
│  - Federation Name                   │
│  - Description                      │
│  - CTA Buttons                      │
│                                     │
├─────────────────────────────────────┤
│  Active Competitions                │
│  - League Cards                     │
│  - Tournament Cards                 │
│                                     │
├─────────────────────────────────────┤
│  Latest Notices                     │
│  - Notice Cards (5)                 │
│  - "더보기" Link                    │
│                                     │
├─────────────────────────────────────┤
│  Upcoming Matches                  │
│  - Today's Matches                 │
│  - This Week's Matches             │
│                                     │
├─────────────────────────────────────┤
│  Standings Snapshot                │
│  - Top 5 Teams                     │
│  - "전체 순위 보기" Link           │
│                                     │
├─────────────────────────────────────┤
│  Featured Clubs                    │
│  - Team Cards                      │
│  - "전체 팀 보기" Link             │
│                                     │
├─────────────────────────────────────┤
│  Sponsors Banner                   │
│  - Sponsor Logos                   │
│                                     │
├─────────────────────────────────────┤
│  AI Helper CTA                     │
│  - "AI 비서에게 물어보기" Button   │
│                                     │
└─────────────────────────────────────┘
│  Footer                             │
└─────────────────────────────────────┘
```

**컴포넌트**:
- `FederationHeader`
- `FederationTabs`
- `FederationHero`
- `ActiveTournaments`
- `NoticeCard` (5개)
- `TodayMatches`
- `CurrentStandings`
- `FeaturedClubs`
- `SponsorsBanner`
- `AIChatbot` (우하단 고정)

---

### 3.2 About (`/about`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  FederationHeader                   │
├─────────────────────────────────────┤
│  FederationTabs                     │
├─────────────────────────────────────┤
│                                     │
│  Federation Introduction            │
│  - Text Content                     │
│  - Images                          │
│                                     │
├─────────────────────────────────────┤
│  President Greeting                 │
│  - Photo                            │
│  - Message                          │
│                                     │
├─────────────────────────────────────┤
│  History                            │
│  - Timeline                         │
│                                     │
├─────────────────────────────────────┤
│  Vision / Mission                  │
│  - Vision Text                     │
│  - Mission Text                    │
│                                     │
├─────────────────────────────────────┤
│  Organization Chart                 │
│  - Chart Visualization             │
│                                     │
├─────────────────────────────────────┤
│  Advisors / Executives             │
│  - Profile Cards                   │
│                                     │
├─────────────────────────────────────┤
│  Contact / Location                │
│  - Address                         │
│  - Map                             │
│                                     │
└─────────────────────────────────────┘
```

---

### 3.3 Notices (`/notices`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  FederationHeader                   │
├─────────────────────────────────────┤
│  FederationTabs                     │
├─────────────────────────────────────┤
│  Filter Bar                         │
│  - Category Filter                  │
│  - Search                           │
├─────────────────────────────────────┤
│                                     │
│  Notice List                        │
│  ┌─────────────────────────────┐   │
│  │ [Pinned] Notice 1           │   │
│  │ Title, Date, Category       │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Notice 2                     │   │
│  └─────────────────────────────┘   │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  Pagination                         │
└─────────────────────────────────────┘
```

**Notice Detail**:
```
┌─────────────────────────────────────┐
│  Back Button                        │
├─────────────────────────────────────┤
│  Notice Title                       │
│  Date | Category | Views            │
├─────────────────────────────────────┤
│  Content                            │
│  - Text                             │
│  - Images                           │
│  - Attachments                      │
└─────────────────────────────────────┘
```

---

### 3.4 Tournaments (`/tournaments`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  FederationHeader                   │
├─────────────────────────────────────┤
│  FederationTabs                     │
├─────────────────────────────────────┤
│  Filter Bar                         │
│  - Status Filter                    │
│  - Category Filter                  │
├─────────────────────────────────────┤
│                                     │
│  Tournament List                    │
│  ┌─────────────────────────────┐   │
│  │ Tournament Card              │   │
│  │ - Name, Dates                │   │
│  │ - Team Count                 │   │
│  │ - Status Badge               │   │
│  └─────────────────────────────┘   │
│  ...                                │
│                                     │
└─────────────────────────────────────┘
```

**Tournament Detail**:
```
┌─────────────────────────────────────┐
│  Back Button                        │
├─────────────────────────────────────┤
│  Tournament Header                  │
│  - Name, Dates                      │
│  - Status                           │
├─────────────────────────────────────┤
│  Tabs                               │
│  [Overview] [Teams] [Bracket]       │
│  [Schedule] [Results]               │
├─────────────────────────────────────┤
│                                     │
│  Tab Content                        │
│  - Overview: Info, Stats            │
│  - Teams: Participating Teams       │
│  - Bracket: Visual Bracket         │
│  - Schedule: Match Schedule        │
│  - Results: Match Results          │
│                                     │
└─────────────────────────────────────┘
```

---

### 3.5 Matches (`/matches`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  FederationHeader                   │
├─────────────────────────────────────┤
│  FederationTabs                     │
├─────────────────────────────────────┤
│  Filter Bar                         │
│  - Date Picker                      │
│  - League/Season Filter             │
├─────────────────────────────────────┤
│                                     │
│  Match List                         │
│  ┌─────────────────────────────┐   │
│  │ Match Card                  │   │
│  │ Date | Time | Venue         │   │
│  │ Home Team vs Away Team      │   │
│  │ Score (if completed)        │   │
│  └─────────────────────────────┘   │
│  ...                                │
│                                     │
└─────────────────────────────────────┘
```

**Match Detail**:
```
┌─────────────────────────────────────┐
│  Back Button                        │
├─────────────────────────────────────┤
│  Match Header                       │
│  Date | Time | Venue                │
│  Home Team vs Away Team             │
│  Score (if completed)               │
├─────────────────────────────────────┤
│  Tabs                               │
│  [Overview] [Lineups] [Events]      │
│  [Stats] [Result]                  │
├─────────────────────────────────────┤
│                                     │
│  Tab Content                        │
│  - Overview: Match Info             │
│  - Lineups: Team Lineups           │
│  - Events: Match Timeline          │
│  - Stats: Team/Player Stats        │
│  - Result: Result Report           │
│                                     │
└─────────────────────────────────────┘
```

---

### 3.6 Standings (`/standings`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  FederationHeader                   │
├─────────────────────────────────────┤
│  FederationTabs                     │
├─────────────────────────────────────┤
│  Season Selector                    │
├─────────────────────────────────────┤
│                                     │
│  Standings Table                    │
│  ┌─────────────────────────────┐   │
│  │ Rank | Team | P | W | D | L │   │
│  │      |      | GF| GA| GD| Pts│   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  Top Scorers                        │
│  - Player Name | Goals | Team      │
│                                     │
├─────────────────────────────────────┤
│  Top Assists                        │
│  - Player Name | Assists | Team    │
│                                     │
└─────────────────────────────────────┘
```

---

### 3.7 Clubs (`/clubs`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  FederationHeader                   │
├─────────────────────────────────────┤
│  FederationTabs                     │
├─────────────────────────────────────┤
│  Filter Bar                         │
│  - Category Filter                  │
│  - Age Group Filter                 │
├─────────────────────────────────────┤
│                                     │
│  Team List                          │
│  ┌─────────────────────────────┐   │
│  │ Team Card                   │   │
│  │ - Logo, Name                │   │
│  │ - Manager                   │   │
│  │ - Player Count              │   │
│  └─────────────────────────────┘   │
│  ...                                │
│                                     │
└─────────────────────────────────────┘
```

**Team Detail**:
```
┌─────────────────────────────────────┐
│  Back Button                        │
├─────────────────────────────────────┤
│  Team Header                        │
│  - Logo, Name                       │
│  - Manager, Coach                   │
├─────────────────────────────────────┤
│  Tabs                               │
│  [Overview] [Roster] [Matches]      │
│  [History]                         │
├─────────────────────────────────────┤
│                                     │
│  Tab Content                        │
│  - Overview: Team Info             │
│  - Roster: Player List             │
│  - Matches: Match History          │
│  - History: Season History         │
│                                     │
└─────────────────────────────────────┘
```

---

## 4️⃣ 협회 관리자 화면

### 4.1 Admin Dashboard (`/admin`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│          │  AdminTopbar             │
│ Admin    ├──────────────────────────┤
│ Sidebar  │                          │
│          │  KPI Cards               │
│ - Dashboard│ ┌────┐ ┌────┐ ┌────┐  │
│ - Leagues │ │Leag│ │Seas│ │Team│  │
│ - Seasons │ │ues │ │ons │ │s   │  │
│ - Reg...  │ └────┘ └────┘ └────┘  │
│ - Teams   │ ┌────┐ ┌────┐ ┌────┐  │
│ - Players │ │Play│ │Matc│ │Pend│  │
│ - Matches │ │ers │ │hes │ │ing │  │
│ - Results │ └────┘ └────┘ └────┘  │
│ - Stand...│                          │
│ - Tourn...│  Quick Actions          │
│ - Notices │ ┌────┐ ┌────┐ ┌────┐  │
│ - Docs    │ │Create│ │Approve│ │Enter│ │
│ - Sponsors│ │League│ │Team │ │Result│ │
│ - Venues  │ └────┘ └────┘ └────┘  │
│ - Referees│                          │
│ - AI Ops  │  Widgets                │
│          │ ┌────────────────────┐  │
│          │ │ Pending Registrations│ │
│          │ └────────────────────┘  │
│          │ ┌────────────────────┐  │
│          │ │ Today's Matches    │  │
│          │ └────────────────────┘  │
│          │ ┌────────────────────┐  │
│          │ │ Recent Notices     │  │
│          │ └────────────────────┘  │
│          │ ┌────────────────────┐  │
│          │ │ Missing Results    │  │
│          │ └────────────────────┘  │
└──────────┴──────────────────────────┘
```

---

### 4.2 Leagues (`/admin/leagues`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Page Header             │
│ Sidebar  │  "리그 관리"             │
│          │  [+ 리그 생성] Button    │
│          ├──────────────────────────┤
│          │  Filter Bar              │
│          │  - Category              │
│          │  - Status                │
│          │  - Search                │
│          ├──────────────────────────┤
│          │  DataTable               │
│          │  ┌────────────────────┐ │
│          │  │ 리그명 │ 카테고리 │ │ │
│          │  │ 연령대 │ 시즌수 │ │ │
│          │  │ 팀수 │ 상태 │ 액션│ │ │
│          │  └────────────────────┘ │
│          │  ...                    │
│          └──────────────────────────┘
```

---

### 4.3 Seasons (`/admin/seasons`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Page Header             │
│ Sidebar  │  "시즌 관리"             │
│          │  [+ 시즌 생성] Button    │
│          ├──────────────────────────┤
│          │  Filter Bar              │
│          │  - League Filter         │
│          │  - Status Filter         │
│          ├──────────────────────────┤
│          │  DataTable               │
│          │  ┌────────────────────┐ │
│          │  │ 시즌명 │ 리그 │ 기간│ │ │
│          │  │ 팀제한 │ 경기수 │ 상태│ │ │
│          │  └────────────────────┘ │
│          │  ...                    │
│          └──────────────────────────┘
```

**Season Detail**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Back Button             │
│ Sidebar  │  Season Header           │
│          ├──────────────────────────┤
│          │  Tabs                    │
│          │  [Overview] [Teams]       │
│          │  [Matches] [Standings]   │
│          │  [Notices]               │
│          ├──────────────────────────┤
│          │  Tab Content             │
│          │  - Overview: Info, Stats│ │
│          │  - Teams: Team List     │ │
│          │  - Matches: Schedule    │ │
│          │  - Standings: Table     │ │
│          │  - Notices: Related     │ │
│          └──────────────────────────┘
```

---

### 4.4 Registrations (`/admin/registrations`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Page Header             │
│ Sidebar  │  "참가 승인"             │
│          ├──────────────────────────┤
│          │  Status Tabs             │
│          │  [전체] [대기중] [검토중]│
│          │  [승인] [거절]           │
│          ├──────────────────────────┤
│          │  DataTable               │
│          │  ┌────────────────────┐ │
│          │  │ 제출일 │ 리그/시즌 │ │ │
│          │  │ 팀명 │ 담당자 │ 상태│ │ │
│          │  │ 선수수 │ 액션 │    │ │ │
│          │  └────────────────────┘ │
│          │  ...                    │
│          └──────────────────────────┘
```

**Approval Drawer** (Side Panel):
```
┌──────────┬──────────────────┬──────┐
│ Admin    │  Main Content    │ Draw │
│ Sidebar  │                  │ er   │
│          │                  │      │
│          │                  │ ┌──┐ │
│          │                  │ │팀│ │
│          │                  │ │정보│ │
│          │                  │ └──┘ │
│          │                  │ ┌──┐ │
│          │                  │ │서류│ │
│          │                  │ └──┘ │
│          │                  │ ┌──┐ │
│          │                  │ │메모│ │
│          │                  │ └──┘ │
│          │                  │ ┌──┐ │
│          │                  │ │액션│ │
│          │                  │ │버튼│ │
│          │                  │ └──┘ │
└──────────┴──────────────────┴──────┘
```

---

### 4.5 Matches (`/admin/matches`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Page Header             │
│ Sidebar  │  "경기 관리"             │
│          ├──────────────────────────┤
│          │  Filter Bar              │
│          │  - Date Range            │
│          │  - League/Season         │
│          │  - Status                │
│          ├──────────────────────────┤
│          │  Match List              │
│          │  ┌────────────────────┐ │
│          │  │ 날짜 │ 시간 │ 경기장│ │ │
│          │  │ 홈팀 vs 원정팀     │ │ │
│          │  │ 스코어 │ 상태 │ 액션│ │ │
│          │  └────────────────────┘ │
│          │  ...                    │
│          └──────────────────────────┘
```

---

### 4.6 Results (`/admin/results`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Page Header             │
│ Sidebar  │  "결과 입력"             │
│          │  Filter: [미입력만 보기] │
│          ├──────────────────────────┤
│          │  Match List              │
│          │  (결과 미입력 경기)      │
│          │  ┌────────────────────┐ │
│          │  │ Match Card          │ │
│          │  │ [결과 입력] Button  │ │
│          │  └────────────────────┘ │
│          │  ...                    │
│          └──────────────────────────┘
```

**Result Entry Panel** (Modal or Page):
```
┌─────────────────────────────────────┐
│  Result Entry Panel                 │
├─────────────────────────────────────┤
│  Match Info (Read-only)             │
│  Date | Time | Venue                │
│  Home Team vs Away Team             │
├─────────────────────────────────────┤
│  Final Score                        │
│  [Home Score] : [Away Score]       │
├─────────────────────────────────────┤
│  Scorers                            │
│  [+ Add Scorer]                     │
│  - Player | Minute | Assist         │
├─────────────────────────────────────┤
│  Cards                              │
│  Yellow Cards | Red Cards           │
│  - Player | Minute                  │
├─────────────────────────────────────┤
│  Substitutions                      │
│  [+ Add Substitution]               │
│  - Out | In | Minute                │
├─────────────────────────────────────┤
│  Notes                              │
│  [Textarea]                         │
├─────────────────────────────────────┤
│  Actions                            │
│  [Save Draft] [Cancel] [Confirm]    │
└─────────────────────────────────────┘
```

---

### 4.7 Standings (`/admin/standings`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Page Header             │
│ Sidebar  │  "순위"                  │
│          │  Season Selector         │
│          ├──────────────────────────┤
│          │  Standings Table         │
│          │  ┌────────────────────┐ │
│          │  │ 순위 │ 팀 │ 경기수 │ │ │
│          │  │ 승 │ 무 │ 패 │ 득점 │ │ │
│          │  │ 실점 │ 득실차 │ 승점│ │ │
│          │  └────────────────────┘ │
│          │  ...                    │
│          ├──────────────────────────┤
│          │  Top Scorers             │
│          │  Top Assists             │
│          │  Discipline Table        │
│          └──────────────────────────┘
```

---

### 4.8 Tournaments (`/admin/tournaments`)

**레이아웃**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Page Header             │
│ Sidebar  │  "대회 관리"             │
│          │  [+ 대회 생성] Button    │
│          ├──────────────────────────┤
│          │  DataTable               │
│          │  ┌────────────────────┐ │
│          │  │ 대회명 │ 포맷 │ 연령│ │ │
│          │  │ 성별 │ 기간 │ 팀수│ │ │
│          │  │ 상태 │ 액션 │    │ │ │
│          │  └────────────────────┘ │
│          │  ...                    │
│          └──────────────────────────┘
```

**Tournament Detail**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Back Button             │
│ Sidebar  │  Tournament Header       │
│          ├──────────────────────────┤
│          │  Tabs                    │
│          │  [Overview] [Draw]       │
│          │  [Schedule] [Bracket]    │
│          │  [Operations]            │
│          ├──────────────────────────┤
│          │  Tab Content             │
│          │  - Overview: Info        │
│          │  - Draw: Group Draw UI  │
│          │  - Schedule: Schedule Gen│
│          │  - Bracket: Visual Bracket│
│          │  - Operations: Ops View │
│          └──────────────────────────┘
```

**Bracket View**:
```
┌──────────┬──────────────────────────┐
│ Admin    │  Back Button             │
│ Sidebar  │  Tournament Header       │
│          ├──────────────────────────┤
│          │  Group Stage (if any)    │
│          │  ┌────┐ ┌────┐ ┌────┐  │
│          │  │ A조│ │ B조│ │ C조│  │
│          │  │순위│ │순위│ │순위│  │
│          │  └────┘ └────┘ └────┘  │
│          ├──────────────────────────┤
│          │  Knockout Bracket        │
│          │      ┌──────┐           │
│          │      │ 8강  │           │
│          │  ┌───┴───┐              │
│          │  │  4강  │              │
│          │  └───┬───┘              │
│          │      │ 결승              │
│          │      └──────┘           │
│          └──────────────────────────┘
```

---

## 5️⃣ 플랫폼 관리자 화면

### 5.1 Platform Dashboard (`/platform`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  Platform Header                    │
├─────────────────────────────────────┤
│  Navigation                         │
│  [Federations] [Users] [Templates] │
│  [AI Agents] [System Logs]         │
├─────────────────────────────────────┤
│                                     │
│  Platform Stats                     │
│  - Total Federations                │
│  - Active Federations               │
│  - Total Users                      │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 Federation Creation (`/platform/federations/new`)

**레이아웃**:
```
┌─────────────────────────────────────┐
│  Back Button                        │
├─────────────────────────────────────┤
│  Page Header                        │
│  "새 협회 생성"                     │
├─────────────────────────────────────┤
│                                     │
│  Creation Form                      │
│  ┌─────────────────────────────┐   │
│  │ 협회명 *                    │   │
│  │ [Input]                     │   │
│  ├─────────────────────────────┤   │
│  │ 슬러그 *                    │   │
│  │ [Input]                     │   │
│  ├─────────────────────────────┤   │
│  │ 종목 *                      │   │
│  │ [Select]                    │   │
│  ├─────────────────────────────┤   │
│  │ 지역 *                      │   │
│  │ [Input]                     │   │
│  ├─────────────────────────────┤   │
│  │ 로고                        │   │
│  │ [Upload]                    │   │
│  ├─────────────────────────────┤   │
│  │ 주요 색상                  │   │
│  │ [Color Picker]              │   │
│  ├─────────────────────────────┤   │
│  │ 관리자 이메일 *            │   │
│  │ [Input]                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [생성하기] Button                  │
│                                     │
└─────────────────────────────────────┘
```

---

## 6️⃣ 전체 화면 수

### 화면 카운트

**Public Pages**: ~10개
- Home
- About
- Notices (List + Detail)
- Tournaments (List + Detail)
- Matches (List + Detail)
- Standings
- Clubs (List + Detail)
- Documents (List + Detail)
- Sponsors (List + Detail)
- Contact

**Admin Pages**: ~25개
- Dashboard
- Leagues (List + Create/Edit)
- Seasons (List + Create/Edit + Detail)
- Registrations (List + Approval)
- Teams (List + Detail)
- Players (List + Detail)
- Matches (List + Detail)
- Results (List + Entry)
- Standings
- Tournaments (List + Create/Edit + Detail + Draw + Schedule + Bracket)
- Notices (List + Create/Edit)
- Documents (List + Create/Edit)
- Sponsors (List + Create/Edit)
- Venues (List + Create/Edit)
- Referees (List + Create/Edit)
- AI Operations

**Platform Pages**: ~5개
- Platform Dashboard
- Federation List
- Federation Creation
- Users
- System Logs

**총 화면 수**: **약 40개**

---

## 7️⃣ 실제 서비스 흐름

### 일반 사용자 흐름

```
홈페이지 접속
  ↓
대회 보기
  ↓
경기 일정 확인
  ↓
순위 확인
  ↓
팀 정보 확인
```

### 팀 관리자 흐름

```
홈페이지 접속
  ↓
팀 등록 신청
  ↓
선수 등록
  ↓
경기 일정 확인
  ↓
결과 확인
```

### 협회 관리자 흐름

```
관리자 대시보드 접속
  ↓
리그 생성
  ↓
시즌 생성
  ↓
팀 승인
  ↓
경기 운영
  ↓
결과 입력
  ↓
순위 확인
```

---

## ✅ 화면 설계 완료

### 완성된 IA

- ✅ 전체 플랫폼 구조
- ✅ 협회 홈페이지 구조 (10개 페이지)
- ✅ 관리자 대시보드 구조 (25개 페이지)
- ✅ 플랫폼 관리자 구조 (5개 페이지)
- ✅ 화면별 상세 레이아웃
- ✅ 컴포넌트 매핑

### 다음 단계

이제 **Firestore 실제 데이터 스키마 + TypeScript 타입**을 작성하면 모든 개발자가 동일한 데이터 구조로 작업할 수 있습니다.

---

**작성일**: 2024년  
**상태**: ✅ YAGO Complete IA + Screen Map 완료
