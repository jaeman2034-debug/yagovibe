# 📁 YAGO VIBE SPORTS - 전체 폴더 구조 (Next.js 기준)

> **작성일**: 2024년  
> **목적**: 실제 개발에 바로 쓰는 완전한 폴더 구조 가이드

---

## 📋 프로젝트 루트 구조

```
yago-vibe-spt/
├── .cursor/
│   └── rules/                    # Cursor 규칙 파일
├── public/                        # 정적 파일
├── src/
│   ├── app/                      # Next.js App Router (또는 React Router)
│   ├── pages/                    # 페이지 컴포넌트
│   ├── components/               # 재사용 컴포넌트
│   ├── hooks/                    # 커스텀 훅
│   ├── services/                 # Firestore 서비스 레이어
│   ├── types/                    # TypeScript 타입 정의
│   ├── lib/                      # 유틸리티 및 공통 로직
│   ├── context/                  # React Context
│   ├── features/                 # 기능별 모듈
│   └── layout/                   # 레이아웃 컴포넌트
├── functions/                    # Cloud Functions
├── docs/                         # 문서
└── package.json
```

---

## 📂 src/ 폴더 상세 구조

### pages/ (페이지 컴포넌트)

```
src/pages/
├── hub/
│   └── HubHome.tsx              # 홈 페이지
├── teams/
│   ├── TeamsListPage.tsx        # 팀 목록
│   ├── TeamsSearchPage.tsx     # 팀 검색
│   └── TeamCreatePage.tsx       # 팀 생성
├── team/
│   ├── MyTeamPage.tsx          # 내 팀 페이지 (탭 구조)
│   ├── TeamPage.tsx            # 팀 정보 페이지
│   ├── TeamManagePage.tsx      # 팀 관리 페이지
│   └── tabs/                   # 팀 관리 탭
│       ├── JoinRequestsTab.tsx
│       ├── MembersTab.tsx
│       └── SettingsTab.tsx
├── matches/
│   ├── MatchListPage.tsx       # 경기 목록
│   ├── MatchDetailPage.tsx     # 경기 상세
│   └── MatchCreatePage.tsx     # 경기 생성
├── tournaments/
│   ├── TournamentListPage.tsx  # 대회 목록
│   └── TournamentDetailPage.tsx # 대회 상세
├── players/
│   ├── PlayerListPage.tsx      # 선수 목록
│   └── PlayerDetailPage.tsx    # 선수 상세
├── stats/
│   ├── StatsPage.tsx           # 통계 메인
│   ├── TeamStatsPage.tsx       # 팀 통계
│   ├── PlayerStatsPage.tsx     # 선수 통계
│   └── RankingPage.tsx         # 랭킹
├── academy/
│   ├── AcademyListPage.tsx     # 아카데미 목록
│   └── AcademyDetailPage.tsx   # 아카데미 상세
├── sports/
│   └── SportsActivityPage.tsx  # Sports Hub (이미 구현됨)
├── chat/
│   └── ChatPage.tsx            # 채팅 페이지
└── mypage/
    └── MyPage.tsx              # 마이페이지
```

---

### components/ (재사용 컴포넌트)

```
src/components/
├── ui/                          # 공통 UI 컴포넌트
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Tabs.tsx
│   ├── Modal.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   └── ModuleCard.tsx          # 모듈 카드 (새로 생성)
├── team/                        # 팀 관련 컴포넌트
│   ├── TeamCard.tsx
│   ├── TeamHeader.tsx
│   ├── TeamMembersTab.tsx
│   ├── TeamRecordsTab.tsx
│   ├── TeamNoticesTab.tsx
│   ├── ActivityFeedTab.tsx
│   ├── activity/                # Activity Feed 컴포넌트
│   │   ├── ActivityFeed.tsx
│   │   ├── ActivityItem.tsx
│   │   └── ActivityIcon.tsx
│   └── schedule/                # 일정 관련 컴포넌트
│       ├── ScheduleTab.tsx
│       ├── ScheduleList.tsx
│       ├── ScheduleCard.tsx
│       └── ScheduleCreateForm.tsx
├── match/                       # 경기 관련 컴포넌트
│   ├── MatchCard.tsx
│   ├── MatchHeader.tsx
│   ├── MatchLineup.tsx
│   ├── MatchTimeline.tsx
│   └── MatchStats.tsx
├── tournament/                  # 대회 관련 컴포넌트
│   ├── TournamentCard.tsx
│   ├── TournamentStandings.tsx
│   └── TournamentMatches.tsx
├── player/                      # 선수 관련 컴포넌트
│   ├── PlayerCard.tsx
│   └── PlayerStatsCard.tsx
├── stats/                       # 통계 관련 컴포넌트
│   ├── TeamStatsCard.tsx
│   ├── PlayerStatsCard.tsx
│   └── RankingTable.tsx
├── academy/                     # 아카데미 관련 컴포넌트
│   ├── AcademyCard.tsx
│   ├── CoachCard.tsx
│   └── ProgramCard.tsx
├── sports/                      # Sports Hub 컴포넌트
│   └── SportsModuleCard.tsx    # 이미 구현됨
├── chat/                        # 채팅 관련 컴포넌트
│   └── components/
│       ├── EventMessageCard.tsx
│       └── NoticeMessageCard.tsx
└── guards/                      # 권한 Guard 컴포넌트
    ├── TeamMemberGuard.tsx
    └── TeamAdminGuard.tsx
```

---

### hooks/ (커스텀 훅)

```
src/hooks/
├── useMyTeams.ts               # 내 팀 조회
├── useMyProfile.ts             # 내 프로필 조회
├── useTeamPermission.ts        # 팀 권한 체크
├── useTeamActivities.ts        # 팀 활동 피드
├── useTeamEvents.ts            # 팀 이벤트
├── useTeamNotices.ts           # 팀 공지
├── useTeamMembers.ts           # 팀 멤버
├── useChatMessages.ts          # 채팅 메시지
├── useMatches.ts               # 경기 목록
├── useMatchDetail.ts           # 경기 상세
├── usePlayerStats.ts           # 선수 통계
├── useTeamStats.ts             # 팀 통계
├── useRanking.ts               # 랭킹
└── useTournaments.ts           # 대회 목록
```

---

### services/ (Firestore 서비스 레이어)

```
src/services/
├── teamService.ts              # 팀 관련 Firestore 작업
├── matchService.ts             # 경기 관련 Firestore 작업
├── playerService.ts            # 선수 관련 Firestore 작업
├── statsService.ts            # 통계 관련 Firestore 작업
├── rankingService.ts          # 랭킹 관련 Firestore 작업
├── tournamentService.ts       # 대회 관련 Firestore 작업
├── academyService.ts          # 아카데미 관련 Firestore 작업
├── federationService.ts       # 협회 관련 Firestore 작업
├── leagueService.ts           # 리그 관련 Firestore 작업
├── activityService.ts         # Activity 관련 Firestore 작업
└── chatService.ts             # 채팅 관련 Firestore 작업
```

---

### types/ (TypeScript 타입 정의)

```
src/types/
├── user.ts                     # User 타입
├── team.ts                     # Team 타입
├── match.ts                    # Match (매칭) 타입
├── matchGame.ts                # Match Game (경기) 타입
├── player.ts                   # Player 타입
├── stats.ts                    # Stats 타입
├── ranking.ts                  # Ranking 타입
├── tournament.ts               # Tournament 타입
├── academy.ts                  # Academy 타입
├── federation.ts               # Federation 타입
├── activity.ts                 # Activity 타입
├── chat.ts                     # Chat 타입
└── sport.ts                    # Sport 타입
```

---

### lib/ (유틸리티 및 공통 로직)

```
src/lib/
├── firebase.ts                 # Firebase 초기화
├── team/
│   ├── createTeamSimple.ts
│   ├── roleConstants.ts
│   ├── permissions.ts
│   └── regionCode.ts
└── utils/
    ├── formatDate.ts
    ├── formatTime.ts
    └── generateSlug.ts
```

---

### context/ (React Context)

```
src/context/
├── AuthProvider.tsx            # 인증 Context
├── HubContext.tsx              # Hub Context
└── ThemeProvider.tsx           # 테마 Context
```

---

### features/ (기능별 모듈)

```
src/features/
├── chat/                       # 채팅 기능
│   └── components/
│       └── index.ts
└── notifications/              # 알림 기능
    └── BellButton.tsx
```

---

### layout/ (레이아웃 컴포넌트)

```
src/layout/
├── Header.tsx                  # 공통 헤더
└── Footer.tsx                  # 공통 푸터 (선택적)
```

---

## 📂 functions/ (Cloud Functions)

```
functions/
├── src/
│   ├── team/
│   │   ├── onTeamCreated.ts
│   │   ├── onEventCreated.ts
│   │   ├── onNoticeCreated.ts
│   │   └── eventReminder.ts
│   ├── match/
│   │   ├── onMatchCreated.ts
│   │   ├── onMatchEventCreated.ts
│   │   └── onMatchCompleted.ts
│   ├── stats/
│   │   ├── recalculateTeamRanking.ts
│   │   └── recalculatePlayerRanking.ts
│   └── index.ts
└── package.json
```

---

## 📂 docs/ (문서)

```
docs/
├── YAGO_SPORTS_COMPLETE_SCREEN_MAP.md
├── YAGO_FIRESTORE_OPTIMIZATION_GUIDE.md
├── YAGO_REALTIME_DATA_STRATEGY.md
├── YAGO_PERMISSION_SYSTEM_CODE.md
├── YAGO_MATCH_SYSTEM_COMPLETE_DESIGN.md
├── YAGO_STATS_RANKING_ENGINE_DESIGN.md
├── YAGO_FEDERATION_LEAGUE_SYSTEM_DESIGN.md
└── CURSOR_PHASE1_BUILD_INSTRUCTIONS.md
```

---

## 🎯 파일 생성 우선순위

### Phase 1 (즉시)

```
1. src/pages/teams/TeamsListPage.tsx
2. src/pages/matches/MatchListPage.tsx
3. src/pages/tournaments/TournamentListPage.tsx
4. src/pages/players/PlayerListPage.tsx
5. src/pages/stats/StatsPage.tsx
6. src/pages/academy/AcademyListPage.tsx
7. src/components/ui/ModuleCard.tsx
8. src/components/match/MatchCard.tsx
9. src/services/matchService.ts (확장)
10. src/services/statsService.ts
```

### Phase 2 (다음)

```
1. src/pages/matches/MatchDetailPage.tsx
2. src/components/match/MatchHeader.tsx
3. src/components/match/MatchLineup.tsx
4. src/components/match/MatchTimeline.tsx
5. src/components/stats/RankingTable.tsx
6. src/services/rankingService.ts
```

---

## 📝 네이밍 규칙

### 파일 네이밍

- **페이지**: `{Domain}Page.tsx` (예: `TeamsListPage.tsx`)
- **컴포넌트**: `{ComponentName}.tsx` (예: `MatchCard.tsx`)
- **서비스**: `{domain}Service.ts` (예: `matchService.ts`)
- **훅**: `use{Feature}.ts` (예: `useTeamPermission.ts`)
- **타입**: `{domain}.ts` (예: `match.ts`)

### 컴포넌트 네이밍

- **페이지 컴포넌트**: `{Domain}Page` (예: `TeamsListPage`)
- **기능 컴포넌트**: `{Feature}` (예: `ActivityFeed`)
- **UI 컴포넌트**: `{Component}` (예: `Button`, `Card`)

---

## 🔗 라우팅 구조

### React Router 구조

```typescript
// src/App.tsx
<Routes>
  {/* Home */}
  <Route path="/" element={<HubHome />} />
  
  {/* Sports Hub */}
  <Route path="/sports" element={<SportsActivityPage />} />
  
  {/* Teams */}
  <Route path="/teams" element={<TeamsListPage />} />
  <Route path="/sports/:type/team" element={<MyTeamPage />} />
  <Route path="/sports/:type/team/activity" element={<ActivityFeedTab />} />
  
  {/* Matches */}
  <Route path="/matches" element={<MatchListPage />} />
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
</Routes>
```

---

## ✅ 폴더 구조 체크리스트

### 필수 폴더

- [x] `src/pages/` - 페이지 컴포넌트
- [x] `src/components/` - 재사용 컴포넌트
- [x] `src/hooks/` - 커스텀 훅
- [x] `src/services/` - Firestore 서비스
- [x] `src/types/` - TypeScript 타입
- [x] `src/lib/` - 유틸리티
- [x] `src/context/` - React Context
- [x] `src/layout/` - 레이아웃 컴포넌트

### 선택적 폴더

- [ ] `src/features/` - 기능별 모듈 (확장 시)
- [ ] `src/utils/` - 공통 유틸리티 (확장 시)

---

**작성일**: 2024년  
**상태**: ✅ 전체 폴더 구조 완료
