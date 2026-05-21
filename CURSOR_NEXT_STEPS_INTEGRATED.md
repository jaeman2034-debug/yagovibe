# 🚀 YAGO VIBE SPORTS - Cursor 다음 단계 통합 작업 지시문

> **작성일**: 2024년  
> **목적**: Cursor AI가 바로 사용할 수 있는 통합 작업 지시문

---

## 📋 개발 우선순위

```
1. Teams Entry / Workspace 정리
2. Match System
3. Activity Feed
4. Stats / Ranking
5. Tournament
6. Academy
7. Federation / League
```

---

## 1️⃣ Teams Entry / Workspace 정리

### 작업 내용

1. **Teams Entry Page 생성** (`/teams`)
   - 팀 목록 표시
   - 팀 검색 기능
   - 팀 생성 버튼

2. **Team Workspace 개선** (`/sports/{type}/team`)
   - Activity Feed 탭 (이미 구현됨)
   - Schedule 탭 개선
   - Members 탭 개선
   - Records 탭 개선
   - Notices 탭 개선

### 파일 구조

```
src/pages/teams/
  ├─ TeamsListPage.tsx (새로 생성)
  ├─ TeamsSearchPage.tsx (새로 생성)
  └─ TeamCreatePage.tsx (이미 존재)

src/pages/team/
  └─ MyTeamPage.tsx (개선)
```

### Cursor 작업 지시문

```markdown
Create Teams Entry Page at /teams.

Requirements:
- Display team list with TeamCard components
- Add search functionality
- Add filter by region/sport
- Add "Create Team" button
- Use getDocs (not onSnapshot) for team list
- Implement pagination (20 teams per page)

Files to create:
- src/pages/teams/TeamsListPage.tsx
- src/pages/teams/TeamsSearchPage.tsx

Files to update:
- src/App.tsx (add routes)
```

---

## 2️⃣ Match System

### 작업 내용

1. **Match 목록 페이지** (`/matches`)
   - 예정 경기
   - 진행 중 경기 (LIVE)
   - 완료 경기

2. **Match 상세 페이지** (`/matches/{matchId}`)
   - 경기 정보
   - 라인업
   - 경기 이벤트 타임라인
   - 통계

3. **Match 생성 페이지** (`/matches/create`)
   - 경기 생성 폼
   - 팀 선택
   - 일정 선택

### 파일 구조

```
src/pages/matches/
  ├─ MatchListPage.tsx (새로 생성)
  ├─ MatchDetailPage.tsx (새로 생성)
  └─ MatchCreatePage.tsx (이미 존재, 개선)

src/components/match/
  ├─ MatchCard.tsx (새로 생성)
  ├─ MatchHeader.tsx (새로 생성)
  ├─ MatchLineup.tsx (새로 생성)
  ├─ MatchTimeline.tsx (새로 생성)
  └─ MatchStats.tsx (새로 생성)
```

### Cursor 작업 지시문

```markdown
Create Match System pages and components.

Requirements:
1. Match List Page (/matches)
   - Display matches by status (scheduled, live, completed)
   - Use getDocs for match list
   - Add filters (date, team, status)

2. Match Detail Page (/matches/{matchId})
   - Display match information
   - Show lineup (if available)
   - Show match events timeline
   - Show match stats (if available)
   - Use getDoc for match data
   - Use onSnapshot for live matches only

3. Match Components
   - MatchCard: Display match summary
   - MatchHeader: Display match score and teams
   - MatchLineup: Display team lineups
   - MatchTimeline: Display match events
   - MatchStats: Display match statistics

Files to create:
- src/pages/matches/MatchListPage.tsx
- src/pages/matches/MatchDetailPage.tsx
- src/components/match/MatchCard.tsx
- src/components/match/MatchHeader.tsx
- src/components/match/MatchLineup.tsx
- src/components/match/MatchTimeline.tsx
- src/components/match/MatchStats.tsx

Files to update:
- src/App.tsx (add routes)
- src/services/matchService.ts (add functions)
```

---

## 3️⃣ Activity Feed

### 작업 내용

1. **Activity Feed 컴포넌트 개선**
   - 이미 구현됨 (`src/components/team/activity/ActivityFeed.tsx`)
   - 필터 기능 추가
   - 무한 스크롤 추가

2. **Activity Feed 통합**
   - 홈 페이지에 Activity Feed 추가
   - 팀 페이지에 Activity Feed 탭 (이미 구현됨)

### Cursor 작업 지시문

```markdown
Improve Activity Feed component.

Requirements:
1. Add filter functionality
   - Filter by type (event, notice, match, member_join)
   - Add filter UI in ActivityFeedTab

2. Add infinite scroll
   - Load more activities on scroll
   - Use startAfter for pagination

3. Integrate with Home Page
   - Add Activity Feed section to Home page
   - Display recent activities (limit 10)

Files to update:
- src/components/team/activity/ActivityFeed.tsx
- src/components/team/ActivityFeedTab.tsx
- src/pages/hub/HubHome.tsx
```

---

## 4️⃣ Stats / Ranking

### 작업 내용

1. **Stats 페이지** (`/stats`)
   - 팀 통계
   - 선수 통계
   - 랭킹

2. **Ranking 페이지** (`/stats/rank`)
   - 팀 순위
   - 선수 순위 (득점, 어시스트)

### 파일 구조

```
src/pages/stats/
  ├─ StatsPage.tsx (새로 생성)
  ├─ TeamStatsPage.tsx (새로 생성)
  ├─ PlayerStatsPage.tsx (새로 생성)
  └─ RankingPage.tsx (새로 생성)

src/components/stats/
  ├─ TeamStatsCard.tsx (새로 생성)
  ├─ PlayerStatsCard.tsx (새로 생성)
  └─ RankingTable.tsx (새로 생성)
```

### Cursor 작업 지시문

```markdown
Create Stats and Ranking pages.

Requirements:
1. Stats Page (/stats)
   - Display team stats and player stats
   - Use getDoc for stats (not onSnapshot)
   - Add season selector

2. Ranking Page (/stats/rank)
   - Display team ranking
   - Display player ranking (goals, assists)
   - Use getDocs for ranking (not onSnapshot)
   - Add category selector (goals, assists)

Files to create:
- src/pages/stats/StatsPage.tsx
- src/pages/stats/TeamStatsPage.tsx
- src/pages/stats/PlayerStatsPage.tsx
- src/pages/stats/RankingPage.tsx
- src/components/stats/TeamStatsCard.tsx
- src/components/stats/PlayerStatsCard.tsx
- src/components/stats/RankingTable.tsx

Files to update:
- src/App.tsx (add routes)
- src/services/statsService.ts (add functions)
- src/services/rankingService.ts (add functions)
```

---

## 5️⃣ Tournament

### 작업 내용

1. **Tournament 목록 페이지** (`/tournaments`)
   - 대회 목록
   - 대회 검색

2. **Tournament 상세 페이지** (`/tournaments/{tournamentId}`)
   - 대회 정보
   - 참가 팀
   - 경기 일정
   - 순위

### Cursor 작업 지시문

```markdown
Create Tournament pages.

Requirements:
1. Tournament List Page (/tournaments)
   - Display tournament list
   - Use getDocs (not onSnapshot)
   - Add filters (status, sport, season)

2. Tournament Detail Page (/tournaments/{tournamentId})
   - Display tournament information
   - Show participating teams
   - Show match schedule
   - Show standings
   - Use getDoc for tournament data
   - Use getDocs for teams/matches/standings

Files to create:
- src/pages/tournaments/TournamentListPage.tsx
- src/pages/tournaments/TournamentDetailPage.tsx
- src/components/tournament/TournamentCard.tsx
- src/components/tournament/TournamentStandings.tsx

Files to update:
- src/App.tsx (add routes)
- src/services/tournamentService.ts (add functions)
```

---

## 6️⃣ Academy

### 작업 내용

1. **Academy 목록 페이지** (`/academy`)
   - 아카데미 목록
   - 아카데미 검색

2. **Academy 상세 페이지** (`/academy/{academyId}`)
   - 아카데미 정보
   - 선수 목록
   - 코치 목록
   - 프로그램 목록

### Cursor 작업 지시문

```markdown
Create Academy pages.

Requirements:
1. Academy List Page (/academy)
   - Display academy list
   - Use getDocs (not onSnapshot)
   - Add filters (sport, region)

2. Academy Detail Page (/academy/{academyId})
   - Display academy information
   - Show players
   - Show coaches
   - Show programs
   - Use getDoc for academy data
   - Use getDocs for players/coaches/programs

Files to create:
- src/pages/academy/AcademyListPage.tsx
- src/pages/academy/AcademyDetailPage.tsx
- src/components/academy/AcademyCard.tsx

Files to update:
- src/App.tsx (add routes)
- src/services/academyService.ts (add functions)
```

---

## 7️⃣ Federation / League

### 작업 내용

1. **Federation Admin 페이지** (`/federations/{federationId}/admin`)
   - 리그 관리
   - 팀 승인
   - 경기 관리

2. **League 페이지** (`/leagues/{leagueId}`)
   - 리그 정보
   - 참가 팀
   - 경기 일정
   - 순위

### Cursor 작업 지시문

```markdown
Create Federation and League pages.

Requirements:
1. Federation Admin Page (/federations/{federationId}/admin)
   - League management
   - Team approval
   - Match management
   - Use permission check (isFederationAdmin)

2. League Page (/leagues/{leagueId})
   - Display league information
   - Show participating teams
   - Show match schedule
   - Show standings
   - Use getDoc for league data
   - Use getDocs for teams/matches/standings

Files to create:
- src/pages/federations/FederationAdminPage.tsx
- src/pages/leagues/LeagueDetailPage.tsx
- src/components/league/LeagueStandings.tsx

Files to update:
- src/App.tsx (add routes)
- src/services/federationService.ts (add functions)
- src/services/leagueService.ts (add functions)
```

---

## 🎯 통합 작업 체크리스트

### Phase 1 (즉시)
- [ ] Teams Entry Page 생성
- [ ] Match System 기본 구조
- [ ] Activity Feed 개선

### Phase 2 (다음)
- [ ] Stats / Ranking 페이지
- [ ] Tournament 페이지
- [ ] Academy 페이지

### Phase 3 (확장)
- [ ] Federation / League 관리자 UI
- [ ] 고급 통계 기능
- [ ] 모바일 최적화

---

## 📝 개발 가이드라인

### 1. Firestore 쿼리 패턴

```typescript
// ✅ 실시간 구독 (onSnapshot)
- Chat Messages
- Team Activities
- Team Events
- Team Notices
- Team Members

// ✅ 조회형 (getDocs)
- Team List
- Match List
- Tournament List
- Player Directory
- Stats
- Ranking
- Academy List
```

### 2. 권한 체크

```typescript
// ✅ 권한 체크 필수
- Team Admin 기능: useTeamPermission
- Association Admin 기능: isAssociationAdmin
- Federation Admin 기능: isFederationAdmin
```

### 3. 컴포넌트 구조

```typescript
// ✅ 컴포넌트 분리
- Page Component (라우트)
- Feature Component (기능)
- UI Component (재사용)
```

---

**작성일**: 2024년  
**상태**: ✅ Cursor 다음 단계 통합 작업 지시문 완료
