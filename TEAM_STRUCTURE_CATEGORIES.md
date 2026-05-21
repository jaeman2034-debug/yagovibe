# 🏃 YAGO SPORTS 플랫폼 - 팀 구조 카테고리 (구현 현황)

> **작성일**: 2024년  
> **목적**: 현재까지 구현된 팀 관련 구조 및 카테고리 정리

---

## 📋 목차

1. [팀 페이지 구조](#1-팀-페이지-구조)
2. [팀 라우터 구조](#2-팀-라우터-구조)
3. [팀 컴포넌트 구조](#3-팀-컴포넌트-구조)
4. [팀 기능 카테고리](#4-팀-기능-카테고리)
5. [팀 데이터 구조](#5-팀-데이터-구조)

---

## 1️⃣ 팀 페이지 구조

### 1-1. 팀 목록 및 검색

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 목록 | `/activity/team` | `TeamList.tsx` | ✅ |
| 팀 검색 | `/teams/search` | `TeamSearchPage.tsx` | ✅ |
| 팀 디렉토리 | `/teams` | `TeamsDirectoryPage.tsx` | ✅ |

### 1-2. 팀 상세 및 정보

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 상세 (Persona 기반) | `/team/:teamId` | `TeamPage.tsx` | ✅ |
| 팀 상세 (공개) | `/teams/:teamId` | `PublicTeamPage.tsx` | ✅ |
| 팀 정보 | `/team/:teamId/info` | `TeamInfoPage.tsx` | ✅ |
| 팀 대시보드 | `/team/dashboard` | `TeamDashboard.tsx` | ✅ |
| 팀 대시보드 (신규) | `/sports/:type/team/dashboard` | `TeamDashboardNew.tsx` | ⚠️ |

### 1-3. 내 팀 페이지 (탭 구조)

**경로**: `/sports/:type/team/*`

**파일**: `MyTeamPage.tsx`

**탭 구조**:
```
내 팀 페이지
├─ 일정 (Schedule) - /sports/:type/team/schedule
├─ 멤버 (Members) - /sports/:type/team/members
├─ 기록 (Records) - /sports/:type/team/records
└─ 공지 (Notices) - /sports/:type/team/notices
```

### 1-4. 팀 생성 및 온보딩

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 생성 선택 | `/team/create/choice` | `TeamCreateChoice.tsx` | ✅ |
| 팀 생성 | `/team/create` | `TeamCreate.tsx` | ✅ |
| 팀 생성 Step 2 | `/team/create/next` | `TeamCreateStep2.tsx` | ✅ |
| 팀 생성 완료 | `/team/create/complete` | `TeamCreateStep3.tsx` | ✅ |
| 팀 온보딩 | `/team/onboarding` | `TeamOnboarding.tsx` | ✅ |

### 1-5. 팀 관리 페이지

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 관리 | `/team/:teamId/manage` | `TeamManagePage.tsx` | ✅ |
| 팀 관리 (신규) | `/team/:teamId/manage/new` | `TeamManagePageNew.tsx` | ⚠️ |
| 팀 관리 대시보드 | `/team/:teamId/manage/dashboard` | `TeamManageDashboard.tsx` | ✅ |
| 팀 관리 메인 | `/team/:teamId/manage/main` | `TeamManagementMain.tsx` | ✅ |

### 1-6. 팀 멤버 관리

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 멤버 목록 | `/sports/:type/team/members` | `TeamMembersPage.tsx` | ✅ |
| 팀 가입 요청 | `/team/:teamId/join-requests` | `TeamJoinRequestsPage.tsx` | ✅ |

### 1-7. 팀 초대 및 초대

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 초대 | `/team/:teamId/invite` | `TeamInvite.tsx` | ✅ |
| 팀 초대 페이지 | `/team/:teamId/invite/page` | `TeamInvitePage.tsx` | ✅ |
| 팀장 초대 | `/team/:teamId/captain-invite` | `TeamCaptainInvitePage.tsx` | ✅ |

### 1-8. 팀 경기 관리

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 경기 목록 | `/teams/:teamId/games` | `TeamGamesPage.tsx` | ✅ |
| 팀 경기 생성 | `/teams/:teamId/games/create` | `TeamGameCreatePage.tsx` | ✅ |
| 팀 경기 수정 | `/teams/:teamId/games/:gameId/edit` | `TeamGameEditPage.tsx` | ✅ |
| 경기 선수 기록 | `/teams/:teamId/games/:gameId/players` | `GamePlayerStatsPage.tsx` | ✅ |

### 1-9. 팀 통계 및 기록

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 통계 | `/teams/:teamId/stats` | `TeamStatsPage.tsx` | ✅ |
| 팀 랭킹 | `/teams/:teamId/ranking` | `TeamRankingPage.tsx` | ✅ |

### 1-10. 팀 회계 및 관리

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 출석 | `/sports/:type/team/attendance` | `TeamAttendancePage.tsx` | ⚠️ |
| 팀 장부 | `/sports/:type/team/ledger` | `TeamLedgerPage.tsx` | ⚠️ |
| 팀 회계 | `/sports/:type/team/accounting` | `TeamAccountingPage.tsx` | ⚠️ |
| 팀 요금 결제 | `/team/:teamId/fee` | `TeamFeePaymentPage.tsx` | ⚠️ |
| 팀 요금 상세 | `/team/:teamId/fee-detail` | `TeamFeeDetailPage.tsx` | ⚠️ |

### 1-11. 팀 커뮤니티 기능

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 총회 | `/sports/:type/team/assembly` | `TeamAssemblyPage.tsx` | ⚠️ |
| 팀 투표 | `/sports/:type/team/vote` | `TeamVotePage.tsx` | ⚠️ |
| 팀 건강도 | `/sports/:type/team/health` | `TeamHealthDashboard.tsx` | ⚠️ |
| 팀 알림 | `/sports/:type/team/notifications` | `TeamNotificationPage.tsx` | ⚠️ |
| 팀 알림 설정 | `/sports/:type/team/notifications/settings` | `TeamNotificationSettingsPage.tsx` | ⚠️ |
| 팀 감사 로그 | `/sports/:type/team/audit` | `TeamAuditLogPage.tsx` | ✅ |

### 1-12. 팀 블로그

| 페이지 | 경로 | 파일 | 상태 |
|--------|------|------|------|
| 팀 블로그 공개 | `/team/:teamId/blog` | `TeamBlogPublicPage.tsx` | ✅ |
| 팀 블로그 포스트 상세 | `/team/:teamId/blog/:postId` | `TeamBlogPostDetailPage.tsx` | ✅ |

---

## 2️⃣ 팀 라우터 구조

### 2-1. Activity Router 내 팀 라우트

**파일**: `src/pages/activity/ActivityRouter.tsx`

```typescript
// 팀 메인 페이지
<Route path="team" element={<TeamList />} />

// 팀 모집 상세 페이지
<Route path="team/:id" element={<TeamRecruitDetailRouter />} />

// 팀 하위 라우트
<Route path="team/*" element={<TeamList />} />
```

### 2-2. App Router 내 팀 라우트

**주요 라우트**:

```typescript
// 팀 목록 및 검색
<Route path="/activity/team" element={<TeamList />} />
<Route path="/teams/search" element={<TeamSearchPage />} />
<Route path="/teams" element={<TeamsDirectoryPage />} />

// 팀 상세
<Route path="/team/:teamId" element={<TeamPage />} />
<Route path="/teams/:teamId" element={<PublicTeamPage />} />

// 내 팀 페이지 (탭 구조)
<Route path="/sports/:type/team/*" element={<MyTeamPage />} />
  ├─ /sports/:type/team/schedule
  ├─ /sports/:type/team/members
  ├─ /sports/:type/team/records
  └─ /sports/:type/team/notices

// 팀 생성
<Route path="/team/create" element={<TeamCreate />} />
<Route path="/team/create/choice" element={<TeamCreateChoice />} />
<Route path="/team/create/next" element={<TeamCreateStep2 />} />
<Route path="/team/create/complete" element={<TeamCreateStep3 />} />

// 팀 관리
<Route path="/team/:teamId/manage" element={<TeamManagePage />} />
<Route path="/t/:teamId/admin" element={<TeamAdminDashboard />} />

// 팀 경기
<Route path="/teams/:teamId/games" element={<TeamGamesPage />} />
<Route path="/teams/:teamId/games/create" element={<TeamGameCreatePage />} />
<Route path="/teams/:teamId/games/:gameId/edit" element={<TeamGameEditPage />} />
<Route path="/teams/:teamId/games/:gameId/players" element={<GamePlayerStatsPage />} />

// 팀 멤버
<Route path="/sports/:type/team/members" element={<TeamMembersPage />} />
<Route path="/team/:teamId/join-requests" element={<TeamJoinRequestsPage />} />

// 팀 초대
<Route path="/team/:teamId/invite" element={<TeamInvite />} />
<Route path="/team/:teamId/invite/page" element={<TeamInvitePage />} />
<Route path="/team/:teamId/captain-invite" element={<TeamCaptainInvitePage />} />

// 팀 통계
<Route path="/teams/:teamId/stats" element={<TeamStatsPage />} />
<Route path="/teams/:teamId/ranking" element={<TeamRankingPage />} />

// 팀 회계 및 관리
<Route path="/sports/:type/team/attendance" element={<TeamAttendancePage />} />
<Route path="/sports/:type/team/ledger" element={<TeamLedgerPage />} />
<Route path="/sports/:type/team/accounting" element={<TeamAccountingPage />} />
<Route path="/team/:teamId/fee" element={<TeamFeePaymentPage />} />
<Route path="/team/:teamId/fee-detail" element={<TeamFeeDetailPage />} />

// 팀 커뮤니티
<Route path="/sports/:type/team/assembly" element={<TeamAssemblyPage />} />
<Route path="/sports/:type/team/vote" element={<TeamVotePage />} />
<Route path="/sports/:type/team/health" element={<TeamHealthDashboard />} />
<Route path="/sports/:type/team/notifications" element={<TeamNotificationPage />} />
<Route path="/sports/:type/team/notifications/settings" element={<TeamNotificationSettingsPage />} />
<Route path="/sports/:type/team/audit" element={<TeamAuditLogPage />} />
```

---

## 3️⃣ 팀 컴포넌트 구조

### 3-1. 팀 카드 및 리스트

```
components/team/
├─ TeamCard.tsx              # 팀 카드 컴포넌트
├─ TeamList.tsx              # 팀 리스트 컴포넌트
└─ TeamMemberList.tsx        # 팀 멤버 리스트
```

### 3-2. 팀 헤더 및 정보

```
components/team/
├─ TeamIdentityHeader.tsx    # 팀 식별 헤더
├─ TeamSearchIdentityHeader.tsx  # 팀 검색 헤더
└─ TeamPersonaSection.tsx    # 팀 Persona 섹션
```

### 3-3. 팀 Persona 컴포넌트

```
components/team/persona/
├─ TeamPersonaP0NewUser.tsx          # 신규 사용자
├─ TeamPersonaP1Individual.tsx      # 개인 사용자
├─ TeamPersonaP2TeamMember.tsx       # 팀 멤버
├─ TeamPersonaP3TeamCaptain.tsx     # 팀장
└─ TeamPersonaP4AssociationAdmin.tsx # 협회 관리자
```

### 3-4. 팀 탭 컴포넌트

```
components/team/
├─ TeamMembersTab.tsx        # 멤버 탭
├─ TeamRecordsTab.tsx        # 기록 탭
├─ TeamNoticesTab.tsx        # 공지 탭
└─ schedule/
    ├─ ScheduleTab.tsx       # 일정 탭
    ├─ ScheduleList.tsx      # 일정 리스트
    ├─ ScheduleDetail.tsx    # 일정 상세
    └─ ScheduleCreateForm.tsx # 일정 생성 폼
```

### 3-5. 팀 관리 컴포넌트

```
components/team/
├─ TeamMemberManagement.tsx  # 멤버 관리
├─ TeamSettingsModal.tsx    # 팀 설정 모달
├─ TeamJoinRequestsSection.tsx  # 가입 요청 섹션
├─ TeamJoinRequestsPanel.tsx    # 가입 요청 패널
├─ JoinTeamButton.tsx        # 팀 가입 버튼
├─ DisbandTeamButton.tsx    # 팀 해체 버튼
└─ RequestCard.tsx           # 요청 카드
```

### 3-6. 팀 블로그 컴포넌트

```
components/team/
├─ TeamBlogManagement.tsx    # 블로그 관리
└─ BlogKPIDashboard.tsx      # 블로그 KPI 대시보드
```

### 3-7. 팀 기타 컴포넌트

```
components/team/
├─ TeamOpportunitySection.tsx # 팀 기회 섹션
├─ UserBadge.tsx             # 사용자 배지
├─ FilterBar.tsx             # 필터 바
└─ OrganizationContextBar.tsx # 조직 컨텍스트 바
```

---

## 4️⃣ 팀 기능 카테고리

### 4-1. 팀 탐색 및 검색 ✅

- [x] 팀 목록 조회
- [x] 팀 검색
- [x] 팀 디렉토리
- [x] 팀 필터링 (종목, 지역, 레벨)

### 4-2. 팀 생성 및 온보딩 ✅

- [x] 팀 생성 선택
- [x] 팀 생성 (단계별)
- [x] 팀 온보딩
- [x] 팀 생성 완료

### 4-3. 팀 상세 정보 ✅

- [x] 팀 프로필
- [x] 팀 정보
- [x] 팀 대시보드
- [x] Persona 기반 팀 페이지

### 4-4. 팀 멤버 관리 ✅

- [x] 멤버 목록
- [x] 멤버 관리
- [x] 가입 요청 관리
- [x] 멤버 초대

### 4-5. 팀 일정 관리 ✅

- [x] 일정 목록
- [x] 일정 상세
- [x] 일정 생성
- [x] 일정 수정

### 4-6. 팀 경기 관리 ✅

- [x] 경기 목록
- [x] 경기 생성
- [x] 경기 수정
- [x] 경기 선수 기록

### 4-7. 팀 통계 및 기록 ✅

- [x] 팀 통계
- [x] 팀 랭킹
- [x] 팀 기록

### 4-8. 팀 관리 기능 ✅

- [x] 팀 관리 페이지
- [x] 팀 설정
- [x] 팀 감사 로그
- [x] 팀 관리 대시보드

### 4-9. 팀 회계 및 관리 ⚠️

- [ ] 팀 출석 (부분 구현)
- [ ] 팀 장부 (부분 구현)
- [ ] 팀 회계 (부분 구현)
- [ ] 팀 요금 결제 (부분 구현)

### 4-10. 팀 커뮤니티 기능 ⚠️

- [ ] 팀 총회 (부분 구현)
- [ ] 팀 투표 (부분 구현)
- [ ] 팀 건강도 (부분 구현)
- [ ] 팀 알림 (부분 구현)

### 4-11. 팀 블로그 ✅

- [x] 팀 블로그 공개
- [x] 팀 블로그 포스트 상세
- [x] 팀 블로그 관리

---

## 5️⃣ 팀 데이터 구조

### 5-1. Firestore 컬렉션

```
teams/{teamId}
  ├─ 기본 정보
  │   ├─ name: string
  │   ├─ sportType: string
  │   ├─ region: string
  │   ├─ level: string
  │   ├─ description: string
  │   └─ logoUrl: string
  │
  ├─ 소유자 정보
  │   ├─ ownerUid: string
  │   └─ owners: string[]
  │
  ├─ 상태 정보
  │   ├─ status: "active" | "inactive"
  │   ├─ plan: "free" | "pro"
  │   └─ visibility: "public" | "private"
  │
  └─ 메타데이터
      ├─ createdAt: Timestamp
      └─ updatedAt: Timestamp

teams/{teamId}/members/{uid}
  ├─ userId: string
  ├─ role: "owner" | "admin" | "member"
  ├─ accessLevel: "OWNER" | "ADMIN" | "STAFF" | "MEMBER"
  ├─ status: "active" | "inactive" | "pending"
  ├─ joinedAt: Timestamp
  └─ isDeleted: boolean

teams/{teamId}/blog_posts/{postId}
  ├─ title: string
  ├─ content: string
  ├─ authorId: string
  ├─ status: "draft" | "published"
  └─ publishedAt: Timestamp
```

### 5-2. TypeScript 타입

```typescript
// src/features/sportHub/domain/team.types.ts
export type Team = {
  id: string;
  region: Region;
  name: string;
  level: TeamLevel;
  description?: string;
  logoUrl?: string;
  homeGroundId?: string;
  members: TeamMember[];
  schedule: TeamSchedule[];
  recruitStatus: TeamRecruitStatus;
  recruitMessage?: string;
  stats: {
    totalMatches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  createdAt: string;
  updatedAt: string;
};
```

---

## 6️⃣ 팀 기능 완성도 요약

### ✅ 완전 구현 (90% 이상)

- 팀 목록 및 검색
- 팀 생성 및 온보딩
- 팀 상세 정보
- 팀 멤버 관리
- 팀 일정 관리
- 팀 경기 관리
- 팀 통계 및 기록
- 팀 관리 기능
- 팀 블로그

### ⚠️ 부분 구현 (50-90%)

- 팀 회계 및 관리
- 팀 커뮤니티 기능

### 📊 전체 완성도

**평균 완성도**: **약 85%**

---

## 7️⃣ 주요 파일 위치

### 페이지 파일

```
src/pages/team/
├─ TeamList.tsx
├─ TeamPage.tsx
├─ TeamDetail.tsx
├─ TeamCreate.tsx
├─ MyTeamPage.tsx
├─ TeamManagePage.tsx
├─ TeamMembersPage.tsx
└─ ... (기타 팀 페이지들)

src/pages/teams/
├─ TeamPage.tsx (공개)
└─ TeamsDirectoryPage.tsx
```

### 컴포넌트 파일

```
src/components/team/
├─ TeamCard.tsx
├─ TeamList.tsx
├─ TeamMemberManagement.tsx
├─ TeamMembersTab.tsx
├─ TeamRecordsTab.tsx
├─ TeamNoticesTab.tsx
└─ ... (기타 팀 컴포넌트들)
```

### 라우터 파일

```
src/App.tsx              # 메인 라우터
src/pages/activity/ActivityRouter.tsx  # Activity 라우터
```

---

## 8️⃣ 향후 확장 가능한 기능

### 8-1. 팀 회계 기능 완성

- [ ] 팀 출석 완전 구현
- [ ] 팀 장부 완전 구현
- [ ] 팀 회계 완전 구현
- [ ] 팀 요금 결제 완전 구현

### 8-2. 팀 커뮤니티 기능 완성

- [ ] 팀 총회 완전 구현
- [ ] 팀 투표 완전 구현
- [ ] 팀 건강도 완전 구현
- [ ] 팀 알림 완전 구현

### 8-3. 새로운 기능

- [ ] 팀 미디어 갤러리
- [ ] 팀 소셜 피드
- [ ] 팀 실시간 채팅
- [ ] 팀 AI 어시스턴트

---

**작성일**: 2024년  
**상태**: ✅ 팀 구조 카테고리 정리 완료
