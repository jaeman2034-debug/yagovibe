# 🎨 YAGO SPORTS 플랫폼 전체 UI 구조 아키텍처

> **실제 서비스 수준 - 완전한 플랫폼 구조**

---

## 📋 목차

1. [전체 플랫폼 구조](#1-전체-플랫폼-구조)
2. [페이지 계층 구조](#2-페이지-계층-구조)
3. [라우터 구조](#3-라우터-구조)
4. [컴포넌트 구조](#4-컴포넌트-구조)
5. [UX 흐름](#5-ux-흐름)
6. [디자인 시스템](#6-디자인-시스템)

---

## 1️⃣ 전체 플랫폼 구조

### 플랫폼 레이어

```
YAGO SPORTS Platform
│
├─ Dashboard (대시보드)
│   ├─ Quick Start (빠른 시작)
│   ├─ Activity Feed (활동 피드)
│   ├─ Recent Updates (최근 업데이트)
│   └─ Personal Stats (개인 통계)
│
├─ Sports (경기 활동)
│   ├─ Activity Hub (활동 허브)
│   ├─ Tournaments (대회)
│   ├─ Teams (팀)
│   ├─ Players (선수)
│   ├─ Matches (경기)
│   ├─ Records (기록)
│   └─ Statistics (통계)
│
├─ Marketplace (거래)
│   ├─ Product List (상품 목록)
│   ├─ Product Detail (상품 상세)
│   ├─ Write Post (글쓰기)
│   └─ Seller Page (판매자 페이지)
│
├─ Events (이벤트)
│   ├─ Event List (이벤트 목록)
│   ├─ Event Detail (이벤트 상세)
│   └─ Event Create (이벤트 생성)
│
├─ Community (커뮤니티)
│   ├─ Activity Feed (활동 피드)
│   ├─ Social Features (소셜 기능)
│   └─ Media Gallery (미디어 갤러리)
│
└─ Admin (관리)
    ├─ Platform Admin (플랫폼 관리)
    ├─ Association Admin (협회 관리)
    └─ Analytics (분석)
```

---

## 2️⃣ 페이지 계층 구조

### 2-1. Dashboard 계층

```
Dashboard (/home)
│
├─ Quick Start (빠른 시작)
│   ├─ 거래 (Trading)
│   ├─ 경기 활동 (Sports Activity)
│   └─ 이벤트 (Events)
│
├─ Activity Feed (활동 피드)
│   ├─ Match Results (경기 결과)
│   ├─ Team Updates (팀 업데이트)
│   ├─ Player Achievements (선수 기록)
│   └─ Media Uploads (미디어 업로드)
│
└─ Personal Dashboard (개인 대시보드)
    ├─ My Teams (내 팀)
    ├─ My Matches (내 경기)
    └─ My Stats (내 통계)
```

### 2-2. Sports 계층

```
Sports Activity Hub (/sports/activity)
│
├─ Tournaments (대회)
│   ├─ Tournament List (/tournaments)
│   ├─ Tournament Detail (/tournaments/:id)
│   ├─ Tournament Standings (/tournaments/:id/standings)
│   └─ Tournament Matches (/tournaments/:id/matches)
│
├─ Teams (팀)
│   ├─ Team List (/activity/team)
│   ├─ Team Detail (/teams/:id)
│   ├─ Team Members (/teams/:id/members)
│   ├─ Team Matches (/teams/:id/matches)
│   └─ Team Stats (/teams/:id/stats)
│
├─ Players (선수)
│   ├─ Player List (/players)
│   ├─ Player Detail (/players/:id)
│   ├─ Player Stats (/players/:id/stats)
│   └─ Player Matches (/players/:id/matches)
│
├─ Matches (경기)
│   ├─ Match List (/matches)
│   ├─ Match Detail (/matches/:id)
│   ├─ Match Timeline (/matches/:id/timeline)
│   └─ Match Stats (/matches/:id/stats)
│
├─ Records (기록)
│   ├─ League Records (/records/league)
│   ├─ Team Records (/records/team)
│   └─ Player Records (/records/player)
│
└─ Statistics (통계)
    ├─ League Stats (/stats/league)
    ├─ Team Stats (/stats/team)
    ├─ Player Stats (/stats/player)
    └─ Leaderboards (/stats/leaderboard)
```

### 2-3. Marketplace 계층

```
Marketplace (/sports/:sport/market)
│
├─ Product List (상품 목록)
│   ├─ Filter by Sport (종목별 필터)
│   ├─ Filter by Category (카테고리 필터)
│   └─ Search (검색)
│
├─ Product Detail (상품 상세)
│   ├─ Product Info (상품 정보)
│   ├─ Seller Info (판매자 정보)
│   └─ Chat (채팅)
│
├─ Write Post (글쓰기)
│   ├─ Product Form (상품 폼)
│   ├─ Image Upload (이미지 업로드)
│   └─ Category Selection (카테고리 선택)
│
└─ Seller Page (판매자 페이지)
    ├─ Seller Profile (판매자 프로필)
    └─ Seller Products (판매자 상품)
```

### 2-4. Events 계층

```
Events (/activity/events)
│
├─ Event List (이벤트 목록)
│   ├─ Upcoming Events (예정 이벤트)
│   ├─ Past Events (과거 이벤트)
│   └─ My Events (내 이벤트)
│
├─ Event Detail (이벤트 상세)
│   ├─ Event Info (이벤트 정보)
│   ├─ Participants (참가자)
│   └─ Event Schedule (이벤트 일정)
│
└─ Event Create (이벤트 생성)
    ├─ Event Form (이벤트 폼)
    └─ Event Settings (이벤트 설정)
```

### 2-5. Community 계층

```
Community
│
├─ Activity Feed (활동 피드)
│   ├─ Global Feed (전체 피드)
│   ├─ Team Feed (팀 피드)
│   └─ Personal Feed (개인 피드)
│
├─ Social Features (소셜 기능)
│   ├─ Likes (좋아요)
│   ├─ Comments (댓글)
│   ├─ Shares (공유)
│   └─ Follows (팔로우)
│
└─ Media Gallery (미디어 갤러리)
    ├─ Photos (사진)
    ├─ Videos (영상)
    └─ Highlights (하이라이트)
```

---

## 3️⃣ 라우터 구조

### 3-1. 메인 라우터

```typescript
// App.tsx
<Routes>
  {/* Dashboard */}
  <Route path="/home" element={<DashboardPage />} />
  <Route path="/" element={<Navigate to="/home" />} />
  
  {/* Sports Activity Hub */}
  <Route path="/sports/activity" element={<SportsActivityPage />} />
  
  {/* Tournaments */}
  <Route path="/tournaments" element={<TournamentListPage />} />
  <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
  <Route path="/tournaments/:id/standings" element={<TournamentStandingsPage />} />
  
  {/* Teams */}
  <Route path="/activity/team" element={<TeamListPage />} />
  <Route path="/teams/:id" element={<TeamDetailPage />} />
  <Route path="/teams/:id/members" element={<TeamMembersPage />} />
  <Route path="/teams/:id/matches" element={<TeamMatchesPage />} />
  
  {/* Players */}
  <Route path="/players" element={<PlayerListPage />} />
  <Route path="/players/:id" element={<PlayerDetailPage />} />
  <Route path="/players/:id/stats" element={<PlayerStatsPage />} />
  
  {/* Matches */}
  <Route path="/matches" element={<MatchListPage />} />
  <Route path="/matches/:id" element={<MatchDetailPage />} />
  <Route path="/matches/:id/timeline" element={<MatchTimelinePage />} />
  
  {/* Statistics */}
  <Route path="/stats" element={<StatsPage />} />
  <Route path="/stats/league" element={<LeagueStatsPage />} />
  <Route path="/stats/leaderboard" element={<LeaderboardPage />} />
  
  {/* Marketplace */}
  <Route path="/sports/:sport/market" element={<SportMarketPage />} />
  <Route path="/sports/:sport/market/:postId" element={<MarketPostDetailPage />} />
  <Route path="/sports/:sport/market/write" element={<MarketWritePage />} />
  
  {/* Events */}
  <Route path="/activity/events" element={<EventListPage />} />
  <Route path="/events/:id" element={<EventDetailPage />} />
</Routes>
```

---

## 4️⃣ 컴포넌트 구조

### 4-1. Dashboard 컴포넌트

```
components/dashboard/
├─ QuickStartSection.tsx
│   ├─ QuickStartCard.tsx
│   └─ QuickStartGrid.tsx
├─ ActivityFeedSection.tsx
│   ├─ ActivityCard.tsx
│   └─ ActivityList.tsx
└─ PersonalStatsSection.tsx
    ├─ StatsCard.tsx
    └─ StatsChart.tsx
```

### 4-2. Sports 컴포넌트

```
components/sports/
├─ activity/
│   ├─ ActivityHub.tsx
│   └─ ActivityGrid.tsx
├─ tournament/
│   ├─ TournamentCard.tsx
│   ├─ TournamentHeader.tsx
│   ├─ TournamentStandings.tsx
│   └─ TournamentBracket.tsx
├─ team/
│   ├─ TeamCard.tsx
│   ├─ TeamHeader.tsx
│   ├─ TeamMembers.tsx
│   └─ TeamStats.tsx
├─ player/
│   ├─ PlayerCard.tsx
│   ├─ PlayerHeader.tsx
│   └─ PlayerStats.tsx
├─ match/
│   ├─ MatchCard.tsx
│   ├─ MatchHeader.tsx
│   ├─ MatchTimeline.tsx
│   └─ MatchStats.tsx
└─ stats/
    ├─ StatsCard.tsx
    ├─ Leaderboard.tsx
    └─ StatsChart.tsx
```

### 4-3. Marketplace 컴포넌트

```
components/marketplace/
├─ ProductCard.tsx
├─ ProductDetail.tsx
├─ ProductForm.tsx
└─ SellerCard.tsx
```

### 4-4. Community 컴포넌트

```
components/community/
├─ ActivityFeed.tsx
├─ ActivityCard.tsx
├─ SocialBar.tsx
│   ├─ LikeButton.tsx
│   ├─ CommentButton.tsx
│   └─ ShareButton.tsx
└─ MediaGallery.tsx
```

---

## 5️⃣ UX 흐름

### 5-1. 사용자 여정

```
1. 사용자 로그인
   ↓
2. Dashboard 접속 (/home)
   ↓
3. Quick Start에서 "경기 활동" 클릭
   ↓
4. Sports Activity Hub (/sports/activity)
   ↓
5. 기능 선택 (대회/팀/선수/통계)
   ↓
6. 상세 페이지 이동
```

### 5-2. 주요 UX 흐름

**경기 활동 흐름**:
```
Dashboard
  → Quick Start: 경기 활동 클릭
  → /sports/activity
  → 대회/팀/선수/통계 선택
  → 상세 페이지
```

**거래 흐름**:
```
Dashboard
  → Quick Start: 거래 클릭
  → /sports/:sport/market
  → 상품 선택
  → 상품 상세
```

**이벤트 흐름**:
```
Dashboard
  → Quick Start: 이벤트 클릭
  → /activity/events
  → 이벤트 선택
  → 이벤트 상세
```

---

## 6️⃣ 디자인 시스템

### 6-1. 컬러 시스템

```typescript
// Primary Colors
primary: {
  50: "#EFF6FF",
  500: "#0F3D75",  // 메인 Primary
  600: "#0D3563",
}

// Accent Colors
accent: {
  50: "#F0FDF4",
  500: "#16A34A",  // 메인 Accent
  600: "#15803D",
}

// Status Colors
success: "#16A34A"
warning: "#F59E0B"
danger: "#EF4444"
info: "#3B82F6"
```

### 6-2. 타이포그래피

```typescript
// Headings
h1: "text-4xl font-bold"      // 36px
h2: "text-3xl font-bold"      // 30px
h3: "text-2xl font-semibold"  // 24px

// Body
body: "text-base"             // 16px
bodySmall: "text-sm"          // 14px
caption: "text-xs"            // 12px
```

### 6-3. 카드 스타일

```typescript
// 기본 카드
className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4"

// Hover 효과
className="hover:shadow-md hover:border-gray-300 transition-all"

// 클릭 가능
className="cursor-pointer hover:-translate-y-0.5 transition-transform"
```

### 6-4. 버튼 스타일

```typescript
// Primary Button
className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"

// Outline Button
className="border-2 border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"

// Ghost Button
className="text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
```

---

## 7️⃣ 페이지별 상세 구조

### 7-1. Dashboard Page

```
/home
│
├─ Header
│   ├─ Logo (YAGO SPORTS)
│   └─ 우측 아이콘 (알림, 다크모드, 프로필)
│
├─ Quick Start Section
│   ├─ 거래 카드
│   ├─ 경기 활동 카드
│   └─ 이벤트 카드
│
├─ Activity Feed Section
│   ├─ 최근 활동 목록
│   └─ 더보기 버튼
│
└─ Personal Stats Section
    ├─ 내 팀 통계
    ├─ 내 경기 통계
    └─ 내 기록
```

### 7-2. Sports Activity Page

```
/sports/activity
│
├─ Page Header
│   ├─ 제목: "경기 활동"
│   └─ 설명: "대회, 팀, 선수, 통계 정보를 확인하세요"
│
└─ Feature Grid (2x2 또는 4열)
    ├─ 대회 카드
    ├─ 팀 카드
    ├─ 선수 카드
    └─ 통계 카드
```

### 7-3. Tournament List Page

```
/tournaments
│
├─ Page Header
│   ├─ 제목: "대회"
│   └─ 필터 (진행중/종료/예정)
│
├─ Tournament Grid
│   └─ TournamentCard[]
│
└─ Pagination
```

### 7-4. Team Detail Page

```
/teams/:id
│
├─ Team Header
│   ├─ 팀 로고
│   ├─ 팀 이름
│   ├─ 지역
│   └─ 팔로우 버튼
│
├─ Tabs
│   ├─ Overview
│   ├─ Members
│   ├─ Matches
│   ├─ Stats
│   └─ Media
│
└─ Tab Content
```

---

## 8️⃣ 컴포넌트 예시 코드

### 8-1. QuickStartCard 컴포넌트

```typescript
// components/dashboard/QuickStartCard.tsx
interface QuickStartCardProps {
  icon: string;
  label: string;
  path: string;
  onClick?: () => void;
}

export function QuickStartCard({
  icon,
  label,
  path,
  onClick,
}: QuickStartCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(path);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs font-medium text-gray-900">{label}</div>
    </button>
  );
}
```

### 8-2. ActivityGrid 컴포넌트

```typescript
// components/activity/ActivityGrid.tsx
interface Activity {
  id: string;
  label: string;
  icon: string;
  path: string;
  description: string;
}

interface ActivityGridProps {
  activities: Activity[];
}

export function ActivityGrid({ activities }: ActivityGridProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {activities.map((activity) => (
        <button
          key={activity.id}
          onClick={() => navigate(activity.path)}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
        >
          <div className="text-4xl mb-3">{activity.icon}</div>
          <div className="text-base font-semibold text-gray-900 mb-1">
            {activity.label}
          </div>
          <div className="text-xs text-gray-500 text-center">
            {activity.description}
          </div>
        </button>
      ))}
    </div>
  );
}
```

---

## 9️⃣ 확장 가능한 구조

### 9-1. 향후 추가 가능한 기능

**Sports Activity Hub 확장**:
```
경기 활동
├─ 대회
├─ 팀
├─ 선수
├─ 통계
├─ 경기 (추가 가능)
├─ 리그 (추가 가능)
├─ 랭킹 (추가 가능)
└─ 기록 (추가 가능)
```

**Dashboard 확장**:
```
Dashboard
├─ Quick Start
├─ Activity Feed
├─ Personal Stats
├─ Recent Matches (추가 가능)
├─ Upcoming Events (추가 가능)
└─ Recommendations (추가 가능)
```

---

## 🔟 파일 구조

### 10-1. 페이지 파일 구조

```
src/pages/
├─ dashboard/
│   └─ DashboardPage.tsx
├─ sports/
│   ├─ SportsActivityPage.tsx
│   ├─ tournaments/
│   │   ├─ TournamentListPage.tsx
│   │   └─ TournamentDetailPage.tsx
│   ├─ teams/
│   │   ├─ TeamListPage.tsx
│   │   └─ TeamDetailPage.tsx
│   ├─ players/
│   │   ├─ PlayerListPage.tsx
│   │   └─ PlayerDetailPage.tsx
│   └─ matches/
│       ├─ MatchListPage.tsx
│       └─ MatchDetailPage.tsx
├─ marketplace/
│   ├─ MarketListPage.tsx
│   └─ MarketDetailPage.tsx
└─ events/
    ├─ EventListPage.tsx
    └─ EventDetailPage.tsx
```

### 10-2. 컴포넌트 파일 구조

```
src/components/
├─ dashboard/
│   ├─ QuickStartSection.tsx
│   └─ QuickStartCard.tsx
├─ sports/
│   ├─ activity/
│   │   └─ ActivityGrid.tsx
│   ├─ tournament/
│   │   └─ TournamentCard.tsx
│   └─ team/
│       └─ TeamCard.tsx
└─ ui/
    ├─ Card.tsx
    ├─ Button.tsx
    └─ Badge.tsx
```

---

## ✅ 구현 체크리스트

### Phase 1: Dashboard 정리
- [x] Quick Start 섹션 수정
- [x] "팀" → "경기 활동" 변경
- [x] 내부 그리드 제거
- [x] 단순 진입 카드로 변경

### Phase 2: Sports Activity Page
- [x] 경기 활동 페이지 생성
- [x] 4개 기능 그리드 구현
- [x] 라우팅 설정

### Phase 3: 확장 기능 (향후)
- [ ] 경기 페이지 추가
- [ ] 리그 페이지 추가
- [ ] 랭킹 페이지 추가
- [ ] 기록 페이지 추가

---

## 📚 참고 문서

- [UI Design System](mdc:UI_DESIGN_SYSTEM_COMPLETE.md)
- [Firestore Schema](mdc:FIRESTORE_DATABASE_SCHEMA_COMPLETE.md)
- [Production Architecture](mdc:PRODUCTION_ARCHITECTURE_COMPLETE.md)

---

**작성일**: 2024년  
**상태**: ✅ UI 구조 설계 완료 (확장 가능)
