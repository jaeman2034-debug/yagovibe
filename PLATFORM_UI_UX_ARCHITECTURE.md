# 🎨 YAGO SPORTS 플랫폼 UI/UX 아키텍처

## 📋 목차

1. [전체 UX 구조](#1-전체-ux-구조)
2. [Global Navigation](#2-global-navigation)
3. [Header UX](#3-header-ux)
4. [Homepage 구조](#4-homepage-구조)
5. [Event Page UX](#5-event-page-ux)
6. [Team Page UX](#6-team-page-ux)
7. [Player Page UX](#7-player-page-ux)
8. [Directory Pages](#8-directory-pages)
9. [Search UX](#9-search-ux)
10. [Mobile UX](#10-mobile-ux)
11. [Admin UX](#11-admin-ux)
12. [Design System](#12-design-system)

---

## 1️⃣ 전체 UX 구조

### Top-level Information Architecture

```
Public Platform
├── Home (/)
├── Events (/events)
│   └── Event Detail (/events/:eventId)
├── Teams (/teams)
│   └── Team Detail (/teams/:teamId)
├── Players (/players)
│   └── Player Detail (/players/:playerId)
├── Stats (/stats)
└── Search (/search)

Admin Console
└── /admin
    ├── Dashboard
    ├── Organizations
    ├── Events
    ├── Teams
    ├── Players
    └── Stats
```

### 핵심 원칙

- **빠른 탐색**: 모든 페이지에서 3클릭 이내 목적지 도달
- **데이터 중심**: 카드 + 테이블 UI로 정보 밀도 최적화
- **모바일 친화**: 반응형 디자인, 터치 최적화
- **관리자/일반 사용자 UX 분리**: Admin은 별도 콘솔

---

## 2️⃣ Global Navigation

### Desktop Navigation

```
LOGO | Events | Teams | Players | Stats | [Search] | Login/Profile
```

### Mobile Navigation

```
Menu | Search | Profile
```

### 구현 위치

- **컴포넌트**: `src/components/navigation/GlobalNavigation.tsx`
- **통합**: `src/layout/Header.tsx`

### Navigation Items

| Label | Path | Icon |
|-------|------|------|
| 대회 | `/events` | Calendar |
| 팀 | `/teams` | Users |
| 선수 | `/players` | Target |
| 통계 | `/stats` | BarChart3 |

---

## 3️⃣ Header UX

### Header 구성

```
[Logo] [Navigation] [Search] [User Menu]
```

### 구현 위치

- **컴포넌트**: `src/layout/Header.tsx`
- **Search**: `src/components/search/SearchAutocomplete.tsx`

### Header 기능

1. **Logo**: 클릭 시 홈으로 이동
2. **Navigation**: Events, Teams, Players, Stats 링크
3. **Search**: 자동완성 검색 (팀, 선수, 대회)
4. **User Menu**: 로그인/프로필/로그아웃

### 반응형

- **Desktop**: 전체 Navigation + Search 표시
- **Mobile**: Menu 버튼 + Search 아이콘

---

## 4️⃣ Homepage 구조

### 페이지 구조

```
Hero Section
├── 플랫폼 소개
├── CTA 버튼 (대회 보기, 팀 탐색, 선수 탐색)

Featured Events
├── 진행중인 대회 3개
└── 전체 보기 링크

Stats Summary
├── 총 대회 수
├── 등록 팀 수
├── 등록 선수 수
└── 총 경기 수

Top Teams
├── 인기 팀 6개
└── 전체 보기 링크

Top Players
├── 인기 선수 6개
└── 전체 보기 링크
```

### 구현 위치

- **컴포넌트**: `src/pages/platform/PlatformHomePage.tsx`

### 데이터 소스

- **Events**: `events` 컬렉션 (status: "ongoing")
- **Teams**: `team_summary` 컬렉션 (championships 순)
- **Players**: `player_summary` 컬렉션 (goals 순)

---

## 5️⃣ Event Page UX

### URL

```
/events/:eventId
```

### 페이지 구조

```
Event Hero
├── 대회명
├── 날짜
├── 팀 수 / 경기 수
└── CTA 버튼 (Bracket, Stats)

Tabs
├── Overview
├── Matches
├── Bracket
├── Teams
└── Stats
```

### Overview 탭

- 대회 정보
- 참가 팀 목록
- 최근 경기
- Top Performers

### Matches 탭

| Date | Match | Score | Stage |
|------|-------|-------|-------|
| 05-10 | 노원FC vs 강북FC | 3-1 | 16강 |

### Bracket 탭

- 토너먼트 브래킷 UI
- Horizontal scroll 가능
- Round별 진행 상황

### Teams 탭

- 참가 팀 카드 그리드
- 팀별 성적 요약

### Stats 탭

- Top Scorers
- Top Assists
- Appearances
- Team Rankings

---

## 6️⃣ Team Page UX

### URL

```
/teams/:teamId
```

### 페이지 구조

```
Team Hero
├── 팀명
├── 지역
├── 창단년도
└── 요약 통계

Summary Cards
├── 경기 수
├── 승
├── 득점
└── 우승

Tabs
├── Overview
├── Matches
├── Players
├── Records
└── Awards
```

### Overview 탭

- 팀 소개
- 전체 누적 전적
- 최근 참가 대회
- 최근 경기 5개
- 주요 선수 Top 3

### Matches 탭

- 팀 경기 이력
- `team_match_history` 기반

### Players 탭

| Player | Pos | Apps | Goals | Assists |
|--------|-----|------|-------|---------|
| 홍길동 | FW  | 10   | 7     | 2       |

### Records 탭

- 팀 최다 득점 선수
- 팀 최다 도움 선수
- 최다 출전 선수
- 평균 득점
- 클린시트 수

### Awards 탭

- 우승
- 준우승
- 4강
- 페어플레이

---

## 7️⃣ Player Page UX

### URL

```
/players/:playerId
```

### 페이지 구조

```
Player Hero
├── 선수명
├── 포지션
├── 소속 팀
├── 등번호
└── 요약 통계

Summary Cards
├── 출전 수
├── 득점
├── 도움
└── 수상

Tabs
├── Overview
├── Match Log
├── Events
└── Awards
```

### Overview 탭

- 프로필
- 누적 기록
- 최근 소속 팀
- 최근 경기
- 주요 수상

### Match Log 탭

| Date | Match | Team | Goals | Assists | YC | RC |
|------|-------|------|-------|---------|----|----|
| 05-10 | 노원FC vs 강북FC | 노원FC | 2 | 1 | 0 | 0 |

### Events 탭

| Event | Team | Apps | Goals | Assists |
|-------|------|------|-------|---------|
| 2026 봄 리그 | 노원FC | 5 | 4 | 2 |

### Awards 탭

- 득점왕
- MVP
- 베스트11
- 페어플레이

---

## 8️⃣ Directory Pages

### Teams Directory

**URL**: `/teams`

**구성**:
- Search Bar
- Filters (조직, 지역, 활동중 여부)
- Sort (이름순, 최다 승, 최다 경기, 최다 우승, 최근 활동순)
- Team Grid/List
- Pagination

**카드 예시**:
```
노원FC
서울 노원구

12경기 · 8승 2무 2패
24득점 · 우승 1회
```

### Players Directory

**URL**: `/players`

**구성**:
- Search Bar
- Filters (팀, 포지션, 활동중 여부, 최소 출전 수)
- Sort (이름순, 득점순, 도움순, 출전순, 최근 활동순)
- Player Grid/List
- Pagination

**카드 예시**:
```
홍길동
FW · 노원FC

18경기 9골 5도움
```

### Events Directory

**URL**: `/events`

**구성**:
- Search Bar
- Filters (상태, 조직, 시즌)
- Sort (최신순, 진행중 우선, 이름순, 시작일순)
- Event Grid/List
- Pagination

---

## 9️⃣ Search UX

### Global Search

**URL**: `/search?q=홍길동`

**구성**:
```
Search Header
├── 검색어 표시
└── 결과 수

Tabs
├── All
├── Teams
├── Players
└── Events

Results
├── Players
│   └── 홍길동 · FW · 노원FC
├── Teams
│   └── 노원FC · 서울 노원구
└── Events
    └── 2026 봄 리그 · 진행중
```

### Search Autocomplete

**위치**: Header

**기능**:
- 입력 시 자동완성 (300ms debounce)
- Top 5 결과 표시
- 엔터 키로 전체 검색 페이지 이동

**데이터 소스**: `search_index` 컬렉션

---

## 🔟 Mobile UX

### Bottom Navigation

```
Home | Events | Stats | Search | Profile
```

### Mobile Event Page

- Event Hero
- Tabs (horizontal scroll)
- Content
- Bracket (horizontal scroll)

### Mobile Team/Player Page

- Hero
- Summary Cards
- Tabs (horizontal scroll)
- Content

---

## 1️⃣1️⃣ Admin UX

### Admin Layout

```
Sidebar | Main Content
```

### Sidebar Navigation

```
Dashboard
Organizations
Events
Teams
Players
Matches
Stats
Settings
```

### Admin Event Page

```
Event Overview
Matches
Bracket
Teams
Players
Stats
Awards
Settings
```

---

## 1️⃣2️⃣ Design System

### 컴포넌트 라이브러리

- **TailwindCSS**: 스타일링
- **shadcn/ui**: 기본 UI 컴포넌트
- **Lucide React**: 아이콘

### 핵심 컴포넌트

#### StatCard

```tsx
<StatCard
  label="경기 수"
  value={12}
  icon={<Calendar />}
  variant="primary"
/>
```

#### EventCard

```tsx
<EventCard event={event} />
```

#### TeamCard

```tsx
<TeamCard team={team} />
```

#### PlayerCard

```tsx
<PlayerCard player={player} />
```

### Color System

| Color | Usage | Hex |
|-------|-------|-----|
| Primary | 주요 액션, 링크 | Blue (#2563EB) |
| Success | 승리, 성공 | Green (#10B981) |
| Warning | 경고 | Yellow (#F59E0B) |
| Danger | 실패, 삭제 | Red (#EF4444) |
| Gray | 텍스트, 배경 | Gray (#6B7280) |

### Typography

- **Font**: Inter 또는 Pretendard
- **Sizes**: H1 (2xl), H2 (xl), Body (base), Caption (sm)

---

## 📁 파일 구조

```
src/
├── components/
│   ├── cards/
│   │   ├── EventCard.tsx
│   │   ├── TeamCard.tsx
│   │   ├── PlayerCard.tsx
│   │   └── index.ts
│   ├── navigation/
│   │   └── GlobalNavigation.tsx
│   ├── search/
│   │   └── SearchAutocomplete.tsx
│   └── ui/
│       ├── StatCard.tsx
│       └── index.ts
├── layout/
│   └── Header.tsx
└── pages/
    └── platform/
        └── PlatformHomePage.tsx
```

---

## 🚀 다음 단계

1. **Admin Data Entry UX**: 경기 결과 / 선수 기록 입력 최적화
2. **Mobile App**: React Native 또는 PWA
3. **Notification System**: 실시간 알림
4. **Media Upload**: 사진/영상 업로드

---

## 📚 참고

- 전체 시스템 아키텍처: [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md)
- Firestore 구조: [YAGO_FIRESTORE_DATA_STRUCTURE.md](YAGO_FIRESTORE_DATA_STRUCTURE.md)
