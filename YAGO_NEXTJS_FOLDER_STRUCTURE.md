# 📁 YAGO VIBE SPORTS - Next.js 기준 전체 폴더 구조

> **작성일**: 2024년  
> **목적**: Next.js App Router 기준 완전한 폴더 구조 가이드

---

## 📋 프로젝트 루트 구조

```
yago-vibe-spt/
├── .cursor/
│   └── rules/                    # Cursor 규칙 파일
├── public/                       # 정적 파일
├── src/
│   ├── app/                     # Next.js App Router
│   ├── components/              # 재사용 컴포넌트
│   ├── hooks/                   # 커스텀 훅
│   ├── services/                # Firestore 서비스 레이어
│   ├── types/                   # TypeScript 타입 정의
│   ├── lib/                     # 유틸리티 및 공통 로직
│   ├── context/                 # React Context
│   ├── features/                 # 기능별 모듈
│   └── layout/                  # 레이아웃 컴포넌트
├── functions/                   # Cloud Functions
├── docs/                        # 문서
├── firestore.indexes.json      # Firestore 인덱스 정의
└── package.json
```

---

## 📂 src/app/ (Next.js App Router)

### Domain 기반 구조

```
src/app/
├── layout.tsx                   # 루트 레이아웃
├── page.tsx                     # 홈 페이지 (/)
├── sports/
│   └── page.tsx                 # Sports Hub (/sports)
├── teams/
│   ├── page.tsx                 # 팀 목록 (/teams)
│   ├── search/
│   │   └── page.tsx             # 팀 검색 (/teams/search)
│   ├── create/
│   │   └── page.tsx             # 팀 생성 (/teams/create)
│   └── [teamId]/
│       ├── page.tsx             # 팀 상세 (/teams/[teamId])
│       └── manage/
│           └── page.tsx         # 팀 관리 (/teams/[teamId]/manage)
├── sports/
│   └── [type]/
│       └── team/
│           ├── page.tsx         # 내 팀 (/sports/[type]/team)
│           ├── activity/
│           │   └── page.tsx     # 활동 피드 (/sports/[type]/team/activity)
│           ├── schedule/
│           │   ├── page.tsx     # 일정 (/sports/[type]/team/schedule)
│           │   ├── new/
│           │   │   └── page.tsx # 일정 생성
│           │   └── [id]/
│           │       └── page.tsx # 일정 상세
│           ├── members/
│           │   └── page.tsx     # 멤버 (/sports/[type]/team/members)
│           ├── records/
│           │   └── page.tsx     # 기록 (/sports/[type]/team/records)
│           └── notices/
│               └── page.tsx     # 공지 (/sports/[type]/team/notices)
├── matches/
│   ├── page.tsx                 # 경기 목록 (/matches)
│   ├── create/
│   │   └── page.tsx             # 경기 생성 (/matches/create)
│   └── [matchId]/
│       ├── page.tsx             # 경기 상세 (/matches/[matchId])
│       ├── lineup/
│       │   └── page.tsx         # 라인업 (/matches/[matchId]/lineup)
│       ├── timeline/
│       │   └── page.tsx         # 타임라인 (/matches/[matchId]/timeline)
│       └── stats/
│           └── page.tsx         # 통계 (/matches/[matchId]/stats)
├── tournaments/
│   ├── page.tsx                 # 대회 목록 (/tournaments)
│   └── [tournamentId]/
│       ├── page.tsx             # 대회 상세 (/tournaments/[tournamentId])
│       ├── teams/
│       │   └── page.tsx         # 참가 팀
│       ├── matches/
│       │   └── page.tsx         # 경기 일정
│       └── standings/
│           └── page.tsx         # 순위
├── players/
│   ├── page.tsx                 # 선수 목록 (/players)
│   └── [playerId]/
│       ├── page.tsx             # 선수 상세 (/players/[playerId])
│       ├── stats/
│       │   └── page.tsx         # 선수 통계
│       └── matches/
│           └── page.tsx         # 경기 기록
├── stats/
│   ├── page.tsx                 # 통계 메인 (/stats)
│   ├── team/
│   │   └── page.tsx             # 팀 통계 (/stats/team)
│   ├── player/
│   │   └── page.tsx             # 선수 통계 (/stats/player)
│   └── rank/
│       └── page.tsx             # 랭킹 (/stats/rank)
├── academy/
│   ├── page.tsx                 # 아카데미 목록 (/academy)
│   └── [academyId]/
│       ├── page.tsx             # 아카데미 상세 (/academy/[academyId])
│       ├── players/
│       │   └── page.tsx         # 선수 목록
│       ├── coaches/
│       │   └── page.tsx         # 코치 목록
│       └── programs/
│           └── page.tsx         # 프로그램 목록
├── federations/
│   └── [federationId]/
│       ├── page.tsx             # 협회 상세
│       ├── leagues/
│       │   └── page.tsx         # 리그 목록
│       └── admin/
│           └── page.tsx         # 협회 관리
├── leagues/
│   └── [leagueId]/
│       ├── page.tsx             # 리그 상세 (/leagues/[leagueId])
│       ├── teams/
│       │   └── page.tsx         # 참가 팀
│       ├── matches/
│       │   └── page.tsx         # 경기 일정
│       └── standings/
│           └── page.tsx         # 순위
├── chat/
│   └── [roomId]/
│       └── page.tsx             # 채팅방 (/chat/[roomId])
└── mypage/
    └── page.tsx                 # 마이페이지 (/mypage)
```

---

## 📂 src/components/ (재사용 컴포넌트)

### Domain 기반 구조

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
│   ├── ModuleCard.tsx
│   └── EmptyState.tsx
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
│   └── SportsModuleCard.tsx
├── chat/                        # 채팅 관련 컴포넌트
│   └── components/
│       ├── EventMessageCard.tsx
│       └── NoticeMessageCard.tsx
└── guards/                      # 권한 Guard 컴포넌트
    ├── TeamMemberGuard.tsx
    └── TeamAdminGuard.tsx
```

---

## 📂 src/hooks/ (커스텀 훅)

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

## 📂 src/services/ (Firestore 서비스 레이어)

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

## 📂 src/types/ (TypeScript 타입 정의)

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
└── chat.ts                     # Chat 타입
```

---

## 📂 src/lib/ (유틸리티 및 공통 로직)

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

## 🎯 파일 생성 우선순위

### Phase 1 (즉시)

```
1. src/app/teams/page.tsx
2. src/app/matches/page.tsx
3. src/app/tournaments/page.tsx
4. src/app/players/page.tsx
5. src/app/stats/page.tsx
6. src/app/academy/page.tsx
7. src/components/ui/ModuleCard.tsx
8. src/components/match/MatchCard.tsx
```

### Phase 2 (다음)

```
1. src/app/matches/[matchId]/page.tsx
2. src/components/match/MatchHeader.tsx
3. src/components/match/MatchLineup.tsx
4. src/components/match/MatchTimeline.tsx
5. src/components/stats/RankingTable.tsx
```

---

## 📝 Next.js App Router 규칙

### 1. 페이지 파일

- `page.tsx` - 페이지 컴포넌트
- `layout.tsx` - 레이아웃 컴포넌트
- `loading.tsx` - 로딩 UI
- `error.tsx` - 에러 UI

### 2. 동적 라우트

- `[teamId]` - 동적 세그먼트
- `[...slug]` - Catch-all 라우트

### 3. 라우트 그룹

- `(marketing)` - 라우트 그룹 (URL에 포함 안 됨)

---

**작성일**: 2024년  
**상태**: ✅ Next.js 기준 전체 폴더 구조 완료
