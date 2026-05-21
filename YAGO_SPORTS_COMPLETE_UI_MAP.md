# 🗺️ YAGO SPORTS 전체 UI 지도 (플랫폼 설계도)

> **작성일**: 2024년  
> **목적**: YAGO SPORTS 플랫폼의 완전한 UI/UX 구조 및 페이지 맵

---

## 📋 목차

1. [플랫폼 전체 구조](#1-플랫폼-전체-구조)
2. [페이지 계층 구조](#2-페이지-계층-구조)
3. [라우터 맵](#3-라우터-맵)
4. [UI 컴포넌트 맵](#4-ui-컴포넌트-맵)
5. [사용자 여정](#5-사용자-여정)

---

## 1️⃣ 플랫폼 전체 구조

### YAGO SPORTS = 3개 도메인 결합

```
YAGO SPORTS PLATFORM
│
├─ Sports Hub (스포츠 허브)
│   ├─ Teams (팀)
│   ├─ Matches (경기)
│   ├─ Players (선수)
│   ├─ Events (이벤트)
│   ├─ Stats (통계)
│   ├─ Tournaments (대회)
│   └─ Academy (유소년 아카데미)
│
├─ Team Platform (팀 플랫폼)
│   ├─ Team Workspace
│   │   ├─ Chat (채팅)
│   │   ├─ Notices (공지)
│   │   ├─ Events (이벤트)
│   │   ├─ Matches (경기)
│   │   ├─ Members (멤버)
│   │   ├─ Blog (블로그)
│   │   └─ Activity Feed (활동 피드)
│   └─ Team Management
│       ├─ Settings (설정)
│       ├─ Billing (결제)
│       └─ Analytics (분석)
│
└─ League Management (리그 관리)
    ├─ Tournament Management
    ├─ Match Scheduling
    ├─ Standings
    └─ Player Registration
```

---

## 2️⃣ 페이지 계층 구조

### 2-1. 최상위 페이지

```
/
├─ /home (Dashboard)
│   ├─ Quick Start
│   ├─ Activity Feed
│   └─ Personal Stats
│
└─ /sports (Sports Hub)
    └─ 7개 모듈 그리드
```

### 2-2. Teams 도메인

```
/teams (Teams Entry)
│
├─ /teams (팀 목록)
├─ /teams/search (팀 검색)
├─ /team/create (팀 생성)
├─ /teams/:teamId (팀 상세)
│
└─ /sports/:type/team/* (Team Workspace)
    ├─ /schedule (일정)
    ├─ /members (멤버)
    ├─ /records (기록)
    ├─ /notices (공지)
    ├─ /events (이벤트)
    └─ /chat (채팅)
```

### 2-3. Matches 도메인

```
/matches
│
├─ /matches (경기 목록)
├─ /matches/create (경기 생성)
├─ /matches/:matchId (경기 상세)
│   ├─ /overview (개요)
│   ├─ /timeline (타임라인)
│   ├─ /stats (통계)
│   └─ /media (미디어)
│
└─ /teams/:teamId/matches (팀 경기)
```

### 2-4. Tournaments 도메인

```
/tournaments
│
├─ /tournaments (대회 목록)
├─ /tournaments/:tournamentId (대회 상세)
│   ├─ /overview (개요)
│   ├─ /teams (참가 팀)
│   ├─ /matches (경기 일정)
│   ├─ /standings (순위)
│   ├─ /players (선수)
│   └─ /stats (통계)
│
└─ /tournaments/:tournamentId/admin (대회 관리)
```

### 2-5. Players 도메인

```
/players
│
├─ /players (선수 목록)
├─ /players/search (선수 검색)
├─ /players/:playerId (선수 상세)
│   ├─ /overview (개요)
│   ├─ /stats (통계)
│   ├─ /matches (경기 기록)
│   └─ /awards (수상 내역)
│
└─ /players/:playerId/edit (선수 수정)
```

### 2-6. Stats 도메인

```
/stats
│
├─ /stats/team (팀 통계)
├─ /stats/player (선수 통계)
├─ /stats/rank (랭킹)
│   ├─ /goals (득점 랭킹)
│   ├─ /assists (도움 랭킹)
│   └─ /appearances (출전 랭킹)
│
└─ /stats/match (경기 통계)
```

### 2-7. Academy 도메인

```
/academy
│
├─ /academy (아카데미 목록)
├─ /academy/:academyId (아카데미 상세)
│   ├─ /overview (개요)
│   ├─ /players (선수)
│   ├─ /coaches (코치)
│   ├─ /programs (프로그램)
│   └─ /teams (유소년 팀)
│
└─ /academy/:academyId/admin (아카데미 관리)
```

### 2-8. Events 도메인

```
/teams/:teamId/events
│
├─ /events (이벤트 목록)
├─ /events/create (이벤트 생성)
├─ /events/:eventId (이벤트 상세)
│   ├─ /overview (개요)
│   ├─ /attendees (참석자)
│   └─ /chat (이벤트 채팅)
│
└─ /events/:eventId/edit (이벤트 수정)
```

---

## 3️⃣ 라우터 맵

### 3-1. 메인 라우터 구조

```typescript
<Routes>
  {/* Dashboard */}
  <Route path="/home" element={<DashboardPage />} />
  <Route path="/" element={<Navigate to="/home" />} />
  
  {/* Sports Hub */}
  <Route path="/sports" element={<SportsActivityPage />} />
  
  {/* Teams */}
  <Route path="/teams" element={<TeamsDirectoryPage />} />
  <Route path="/teams/search" element={<TeamSearchPage />} />
  <Route path="/team/create" element={<TeamCreatePage />} />
  <Route path="/teams/:teamId" element={<TeamDetailPage />} />
  <Route path="/sports/:type/team/*" element={<MyTeamPage />} />
  
  {/* Matches */}
  <Route path="/matches" element={<MatchListPage />} />
  <Route path="/matches/create" element={<MatchCreatePage />} />
  <Route path="/matches/:matchId" element={<MatchDetailPage />} />
  
  {/* Tournaments */}
  <Route path="/tournaments" element={<TournamentListPage />} />
  <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
  
  {/* Players */}
  <Route path="/players" element={<PlayerListPage />} />
  <Route path="/players/:playerId" element={<PlayerDetailPage />} />
  
  {/* Stats */}
  <Route path="/stats" element={<StatsPage />} />
  <Route path="/stats/team" element={<TeamStatsPage />} />
  <Route path="/stats/player" element={<PlayerStatsPage />} />
  <Route path="/stats/rank" element={<RankingPage />} />
  
  {/* Academy */}
  <Route path="/academy" element={<AcademyListPage />} />
  <Route path="/academy/:academyId" element={<AcademyDetailPage />} />
  
  {/* Chat */}
  <Route path="/chat" element={<ChatListPage />} />
  <Route path="/chat/:roomId" element={<ChatPage />} />
</Routes>
```

---

## 4️⃣ UI 컴포넌트 맵

### 4-1. 공통 컴포넌트

```
src/components/ui/
├─ Button.tsx
├─ Card.tsx
├─ Badge.tsx
├─ Avatar.tsx
├─ Tabs.tsx
├─ Modal.tsx
├─ Input.tsx
└─ Select.tsx
```

### 4-2. 도메인별 컴포넌트

```
src/components/
│
├─ sports/
│   └─ SportsModuleCard.tsx
│
├─ team/
│   ├─ TeamCard.tsx
│   ├─ TeamHeader.tsx
│   ├─ TeamMembersTab.tsx
│   ├─ TeamRecordsTab.tsx
│   ├─ TeamNoticesTab.tsx
│   ├─ schedule/
│   │   ├─ ScheduleTab.tsx
│   │   ├─ ScheduleList.tsx
│   │   ├─ ScheduleDetail.tsx
│   │   └─ ScheduleCreateForm.tsx
│   └─ persona/
│       ├─ TeamPersonaP0NewUser.tsx
│       ├─ TeamPersonaP1Individual.tsx
│       ├─ TeamPersonaP2TeamMember.tsx
│       ├─ TeamPersonaP3TeamCaptain.tsx
│       └─ TeamPersonaP4AssociationAdmin.tsx
│
├─ match/
│   ├─ MatchCard.tsx
│   ├─ MatchHeader.tsx
│   ├─ MatchTimeline.tsx
│   ├─ MatchStats.tsx
│   └─ MatchLineup.tsx
│
├─ tournament/
│   ├─ TournamentCard.tsx
│   ├─ TournamentHeader.tsx
│   ├─ TournamentStandings.tsx
│   └─ TournamentBracket.tsx
│
├─ player/
│   ├─ PlayerCard.tsx
│   ├─ PlayerHeader.tsx
│   └─ PlayerStats.tsx
│
├─ academy/
│   ├─ AcademyCard.tsx
│   ├─ AcademyHeader.tsx
│   └─ ProgramCard.tsx
│
└─ chat/
    ├─ ChatRoom.tsx
    ├─ MessageList.tsx
    ├─ MessageInput.tsx
    ├─ NoticeMessageCard.tsx
    └─ EventMessageCard.tsx
```

---

## 5️⃣ 사용자 여정

### 5-1. 신규 사용자 여정

```
1. 회원가입/로그인
   ↓
2. Dashboard 접속 (/home)
   ↓
3. Quick Start: "경기 활동" 클릭
   ↓
4. Sports Hub 접속 (/sports)
   ↓
5. "내 팀" 모듈 클릭
   ↓
6. 팀 생성 또는 팀 찾기
   ↓
7. 팀 가입
   ↓
8. Team Workspace 접속
```

### 5-2. 팀장 여정

```
1. Dashboard 접속
   ↓
2. Sports Hub → "내 팀"
   ↓
3. Team Workspace 접속
   ↓
4. 팀 관리
   ├─ 멤버 초대
   ├─ 이벤트 생성
   ├─ 공지 작성
   ├─ 경기 일정 생성
   └─ 채팅 관리
```

### 5-3. 협회 관리자 여정

```
1. Dashboard 접속
   ↓
2. Sports Hub → "대회"
   ↓
3. 대회 생성
   ↓
4. 팀 등록 관리
   ↓
5. 경기 일정 생성
   ↓
6. 순위 관리
```

---

## 6️⃣ Multi-Sport 구조

### 6-1. Sport Entity

```
sports/{sportId}
{
  id: string;
  name: string;
  key: string; // "soccer", "basketball", "baseball"
  icon: string;
  enabled: boolean;
  createdAt: Timestamp;
}
```

### 6-2. Sport별 데이터 분리

```
teams/{teamId}
  sportType: "soccer" | "basketball" | "baseball"

matches/{matchId}
  sportType: "soccer" | "basketball" | "baseball"

tournaments/{tournamentId}
  sportType: "soccer" | "basketball" | "baseball"
```

### 6-3. Sport별 라우터

```
/sports/soccer
/sports/basketball
/sports/baseball
```

---

## 7️⃣ 플랫폼 완성도

### 완전 구현 (90% 이상)
- ✅ Sports Hub (7개 모듈)
- ✅ Team System (40+ 페이지)
- ✅ Event System (100%)
- ✅ Chat System (90%)

### 부분 구현 (50-90%)
- ⚠️ Match System (60%)
- ⚠️ Tournament System (50%)

### 미구현 (20-50%)
- ⚠️ Player System (40%)
- ⚠️ Stats System (30%)
- ⚠️ Academy System (20%)

---

**작성일**: 2024년  
**상태**: ✅ 전체 UI 지도 완료
