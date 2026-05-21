# YAGO Platform - 전체 Site Map (완전판)

## 🎯 목표

**사용자 페이지 + 관리자 페이지 + 생성 시스템까지 모든 화면 구조를 한눈에 파악**

---

## 📊 전체 플랫폼 구조

```
YAGO Platform
│
├─ Builder System
│   └─ Organization Builder (Wizard)
│
├─ Organization Website (Public)
│   ├─ Home
│   ├─ Leagues
│   ├─ Teams
│   ├─ Players
│   ├─ Matches
│   ├─ News
│   └─ Contact
│
└─ Admin Dashboard
    ├─ Dashboard
    ├─ Seasons
    ├─ Leagues
    ├─ Teams
    ├─ Players
    ├─ Matches
    ├─ Standings
    ├─ Announcements
    └─ AI Copilot
```

---

## 🏗️ 1. Builder System

### Organization Builder

**URL**: `/builder`

**기능**: 협회/아카데미/클럽 생성

**페이지 구조**:
```
/builder
  ├─ Step 0: Landing
  ├─ Step 1: Organization Type
  ├─ Step 2: Sport Selection
  ├─ Step 3: Target Audience
  ├─ Step 4: Operation Type
  ├─ Step 5: Logo Upload
  ├─ Step 6: Hero Image Selection
  ├─ Step 7: Template Recommendation
  └─ Step 8: Create Organization
```

**결과**: Organization 생성 후 Dashboard로 이동

---

## 🌐 2. Organization Website (Public)

### URL 구조

**기본 패턴**: `/{organizationSlug}`

**예시**:
- `yago.io/nowon-fa` (노원구 축구협회)
- `yago.io/seoul-academy` (서울 유소년 아카데미)
- `yago.io/gangnam-club` (강남 FC 클럽)

---

### 2.1 Home Page

**URL**: `/{organizationSlug}`

**구성**:
```
┌─────────────────────────────────────┐
│  Header (Logo + Navigation)         │
├─────────────────────────────────────┤
│  Hero Section                       │
│  (조직 이름 + 설명 + Hero Image)     │
├─────────────────────────────────────┤
│  Quick Links                        │
│  [리그 보기] [팀 보기] [경기 보기]   │
├─────────────────────────────────────┤
│  League Overview                    │
│  - 진행 중인 리그                    │
│  - 다가오는 경기                     │
├─────────────────────────────────────┤
│  Upcoming Matches                   │
│  (최근 5개 경기)                     │
├─────────────────────────────────────┤
│  Latest News                        │
│  (최근 공지 3개)                     │
├─────────────────────────────────────┤
│  Footer                             │
└─────────────────────────────────────┘
```

---

### 2.2 Leagues Page

**URL**: `/{organizationSlug}/leagues`

**구성**:
```
┌─────────────────────────────────────┐
│  Leagues List                       │
│                                      │
│  ┌──────────────┐  ┌──────────────┐│
│  │ K7 리그      │  │ K5 리그      ││
│  │ 12팀 · 진행중│  │ 8팀 · 진행중 ││
│  └──────────────┘  └──────────────┘│
│                                      │
│  ┌──────────────┐                   │
│  │ 컵 대회      │                   │
│  │ 16팀 · 예정  │                   │
│  └──────────────┘                   │
└─────────────────────────────────────┘
```

---

### 2.3 League Page (상세)

**URL**: `/{organizationSlug}/leagues/{leagueSlug}`

**구성**:
```
┌─────────────────────────────────────┐
│  League Header (Hero)               │
├─────────────────────────────────────┤
│  [Overview] [Standings] [Matches]   │
│         [Teams] [Stats]              │
├─────────────────────────────────────┤
│  Tab Content                         │
│  - Overview: 순위 + 다가오는 경기    │
│  - Standings: 전체 순위표            │
│  - Matches: 경기 일정/결과           │
│  - Teams: 참가 팀 목록               │
│  - Stats: 리그 통계                  │
└─────────────────────────────────────┘
```

**상세 구조**: [YAGO_LEAGUE_PAGE_ARCHITECTURE.md](./YAGO_LEAGUE_PAGE_ARCHITECTURE.md) 참고

---

### 2.4 Teams Page

**URL**: `/{organizationSlug}/teams`

**구성**:
```
┌─────────────────────────────────────┐
│  Teams Grid                          │
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 노원 │  │ 상계 │  │ 중계 │      │
│  │  FC │  │유나이│  │스타즈│      │
│  └──────┘  └──────┘  └──────┘      │
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 월계 │  │ 공릉 │  │ 수락 │      │
│  │  FC │  │  FC │  │  FC │      │
│  └──────┘  └──────┘  └──────┘      │
└─────────────────────────────────────┘
```

---

### 2.5 Team Page (상세)

**URL**: `/{organizationSlug}/teams/{teamSlug}`

**구성**:
```
┌─────────────────────────────────────┐
│  Team Header                        │
│  (로고 + 팀 이름 + 설명)             │
├─────────────────────────────────────┤
│  [Overview] [Players] [Matches]     │
│         [Stats] [History]            │
├─────────────────────────────────────┤
│  Tab Content                         │
│  - Overview: 팀 정보 + 통계          │
│  - Players: 선수 목록                │
│  - Matches: 경기 일정/결과           │
│  - Stats: 팀 통계                    │
│  - History: 시즌별 기록              │
└─────────────────────────────────────┘
```

---

### 2.6 Players Page

**URL**: `/{organizationSlug}/players`

**구성**:
```
┌─────────────────────────────────────┐
│  Player Directory                   │
│                                      │
│  [검색] [필터: 포지션, 팀]           │
│                                      │
│  ┌──────────┐  ┌──────────┐        │
│  │ 김민수    │  │ 박준호   │        │
│  │ 노원FC    │  │ 상계유나이│        │
│  │ FW       │  │ MF      │        │
│  └──────────┘  └──────────┘        │
└─────────────────────────────────────┘
```

---

### 2.7 Player Profile

**URL**: `/players/{playerId}` (글로벌) 또는 `/{organizationSlug}/players/{playerId}`

**구성**:
```
┌─────────────────────────────────────┐
│  Player Header                       │
│  (프로필 사진 + 이름 + 포지션)        │
├─────────────────────────────────────┤
│  [Overview] [Career] [Stats]         │
│         [Matches] [Awards]            │
├─────────────────────────────────────┤
│  Tab Content                         │
│  - Overview: 기본 정보 + 현재 팀      │
│  - Career: 팀 이력                   │
│  - Stats: 시즌별 통계                │
│  - Matches: 경기 기록                │
│  - Awards: 수상 내역                 │
└─────────────────────────────────────┘
```

---

### 2.8 Matches Page

**URL**: `/{organizationSlug}/matches`

**구성**:
```
┌─────────────────────────────────────┐
│  Match List                          │
│                                      │
│  [필터: 리그, 날짜, 상태]             │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 노원FC 3 : 1 상계유나이티드   │   │
│  │ 2026.04.12 · 완료            │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 중계스타즈 vs 월계FC          │   │
│  │ 2026.04.19 · 예정             │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### 2.9 Match Center (상세)

**URL**: `/matches/{matchId}`

**구성**:
```
┌─────────────────────────────────────┐
│  Match Header                        │
│  (팀 로고 + 점수 + 날짜)              │
├─────────────────────────────────────┤
│  [Overview] [Timeline] [Stats]       │
│         [Report] [Highlights]         │
├─────────────────────────────────────┤
│  Tab Content                         │
│  - Overview: 경기 요약               │
│  - Timeline: 이벤트 타임라인         │
│  - Stats: 선수 통계                  │
│  - Report: AI 경기 리포트            │
│  - Highlights: 하이라이트 (향후)     │
└─────────────────────────────────────┘
```

---

### 2.10 News Page

**URL**: `/{organizationSlug}/news`

**구성**:
```
┌─────────────────────────────────────┐
│  News List                           │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ [이미지]                      │   │
│  │ 2026 시즌 개막 공지           │   │
│  │ 2026.04.01                   │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ [이미지]                      │   │
│  │ 노원FC vs 상계 경기 리포트    │   │
│  │ 2026.04.12                   │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### 2.11 Contact Page

**URL**: `/{organizationSlug}/contact`

**구성**:
```
┌─────────────────────────────────────┐
│  Contact Information                │
│                                      │
│  연락처                              │
│  이메일                              │
│  주소                                │
│                                      │
│  [문의하기 폼]                       │
└─────────────────────────────────────┘
```

---

## 🔧 3. Admin Dashboard

### URL 구조

**기본 패턴**: `/admin/{organizationSlug}`

**예시**: `yago.io/admin/nowon-fa`

---

### 3.1 Dashboard (홈)

**URL**: `/admin/{organizationSlug}`

**구성**:
```
┌─────────────────────────────────────┐
│  Header (Organization Switcher)     │
├─────────────────────────────────────┤
│  Hero Section                        │
│  (조직 이름 + Hero Image)            │
├─────────────────────────────────────┤
│  Quick Actions                       │
│  [+ 리그 생성] [+ 팀 등록]           │
│  [+ 경기 일정] [+ 공지 작성]         │
├─────────────────────────────────────┤
│  Organization Overview               │
│  - Teams: 12                        │
│  - Players: 240                     │
│  - Matches: 36                      │
│  - Seasons: 1                        │
├─────────────────────────────────────┤
│  Recent Activity                     │
│  - 상계유나이티드 팀 등록            │
│  - 노원FC 경기 결과 입력             │
│  - 2026 시즌 생성                    │
└─────────────────────────────────────┘
```

---

### 3.2 Seasons Manager

**URL**: `/admin/{organizationSlug}/seasons`

**기능**:
- 시즌 생성
- 시즌 목록
- 시즌 활성화/비활성화

---

### 3.3 Leagues Manager

**URL**: `/admin/{organizationSlug}/leagues`

**기능**:
- 리그 생성
- 리그 목록
- 리그 설정 (팀 수, 일정 등)
- 리그 삭제

**리그 상세**: `/admin/{organizationSlug}/leagues/{leagueId}`
- 팀 추가/제거
- 경기 일정 생성
- 결과 입력
- 순위 확인

---

### 3.4 Teams Manager

**URL**: `/admin/{organizationSlug}/teams`

**기능**:
- 팀 등록
- 팀 목록
- 팀 정보 수정
- 팀 삭제

**팀 상세**: `/admin/{organizationSlug}/teams/{teamId}`
- 팀 정보 수정
- 선수 추가/제거
- 팀 통계

---

### 3.5 Players Manager

**URL**: `/admin/{organizationSlug}/players`

**기능**:
- 선수 등록
- 선수 목록
- 선수 정보 수정
- 선수 이동 (팀 변경)

**선수 상세**: `/admin/{organizationSlug}/players/{playerId}`
- 선수 정보 수정
- 경기 기록
- 통계

---

### 3.6 Matches Manager

**URL**: `/admin/{organizationSlug}/matches`

**기능**:
- 경기 일정 생성
- 경기 목록
- 결과 입력
- Match Events 입력

**경기 상세**: `/admin/{organizationSlug}/matches/{matchId}`
- 경기 정보 수정
- 결과 입력
- 이벤트 입력 (득점, 어시스트 등)
- AI 리포트 생성

---

### 3.7 Standings Manager

**URL**: `/admin/{organizationSlug}/standings`

**기능**:
- 순위 확인
- 순위 자동 계산 (경기 결과 반영)
- 순위 수동 조정 (필요시)

---

### 3.8 Announcements Manager

**URL**: `/admin/{organizationSlug}/announcements`

**기능**:
- 공지 작성
- 공지 목록
- 공지 수정/삭제
- 공지 게시/비공개

---

### 3.9 AI Copilot

**URL**: `/admin/{organizationSlug}/copilot`

**구성**:
```
┌─────────────────────────────────────┐
│  AI League Copilot                  │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 관리자: 8팀 리그 만들어줘     │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ AI: 리그 이름을 입력해주세요  │   │
│  └──────────────────────────────┘   │
│                                      │
│  [빠른 명령]                         │
│  [리그 생성] [팀 등록] [경기 일정]   │
└─────────────────────────────────────┘
```

**기능**:
- 자연어로 리그 운영 작업 수행
- 리그 생성
- 팀 등록
- 경기 일정 생성
- 공지 작성

---

## 🔗 전체 URL 구조

### Public URLs

```
/                                    → YAGO 홈 (조직 목록)
/builder                             → Organization Builder
/{organizationSlug}                  → Organization Home
/{organizationSlug}/leagues          → Leagues List
/{organizationSlug}/leagues/{slug}   → League Page
/{organizationSlug}/teams            → Teams List
/{organizationSlug}/teams/{slug}     → Team Page
/{organizationSlug}/players          → Players List
/players/{playerId}                  → Player Profile (글로벌)
/{organizationSlug}/matches          → Matches List
/matches/{matchId}                   → Match Center (글로벌)
/{organizationSlug}/news            → News List
/{organizationSlug}/contact         → Contact
```

### Admin URLs

```
/admin/{organizationSlug}                    → Admin Dashboard
/admin/{organizationSlug}/seasons            → Seasons Manager
/admin/{organizationSlug}/leagues             → Leagues Manager
/admin/{organizationSlug}/leagues/{id}         → League Detail
/admin/{organizationSlug}/teams               → Teams Manager
/admin/{organizationSlug}/teams/{id}          → Team Detail
/admin/{organizationSlug}/players             → Players Manager
/admin/{organizationSlug}/players/{id}         → Player Detail
/admin/{organizationSlug}/matches             → Matches Manager
/admin/{organizationSlug}/matches/{id}         → Match Detail
/admin/{organizationSlug}/standings            → Standings Manager
/admin/{organizationSlug}/announcements         → Announcements Manager
/admin/{organizationSlug}/copilot              → AI Copilot
```

---

## 🎯 핵심 페이지 6개

플랫폼 UX의 핵심이 되는 페이지:

1. **Organization Builder** - 온보딩
2. **Organization Dashboard** - 관리자 첫 화면
3. **League Page** - 가장 많이 보는 페이지
4. **Team Page** - 팀 정보
5. **Player Profile** - 선수 프로필
6. **Match Center** - 경기 상세

---

## 🔄 사용자 흐름

### 관리자 흐름

```
1. Organization Builder
   ↓
2. Organization 생성
   ↓
3. Admin Dashboard
   ↓
4. League 생성
   ↓
5. 팀 등록
   ↓
6. 경기 일정 생성
   ↓
7. 결과 입력
   ↓
8. AI 리포트 생성
```

### 일반 사용자 흐름

```
1. Organization Website Home
   ↓
2. Leagues Page
   ↓
3. League Page (Standings 확인)
   ↓
4. Match Schedule 확인
   ↓
5. Match Center (경기 결과 확인)
   ↓
6. Team Page (팀 정보 확인)
   ↓
7. Player Profile (선수 정보 확인)
```

---

## 📊 플랫폼 구조 요약

```
YAGO Platform
│
├─ Builder Layer
│   └─ Organization Builder (Wizard)
│
├─ Public Layer
│   ├─ Organization Websites
│   ├─ League Pages
│   ├─ Team Pages
│   ├─ Player Profiles
│   └─ Match Centers
│
└─ Admin Layer
    ├─ Dashboard
    ├─ League Management
    ├─ Team Management
    ├─ Player Management
    ├─ Match Management
    └─ AI Copilot
```

---

## ✅ 구현 우선순위

### Phase 1: 핵심 구조
- [ ] Organization Builder
- [ ] Organization Dashboard
- [ ] League Page
- [ ] Admin 기본 구조

### Phase 2: Public Pages
- [ ] Home Page
- [ ] Teams Page
- [ ] Team Page
- [ ] Matches Page
- [ ] Match Center

### Phase 3: Player System
- [ ] Players Page
- [ ] Player Profile
- [ ] Player Identity System

### Phase 4: Admin Features
- [ ] League Manager
- [ ] Team Manager
- [ ] Match Manager
- [ ] Standings Manager

### Phase 5: AI Features
- [ ] AI Match Reports
- [ ] AI League Copilot

---

이 Site Map으로 **YAGO 플랫폼의 전체 구조를 완벽하게 파악**할 수 있습니다! 🚀
