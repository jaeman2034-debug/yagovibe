# 🎯 YAGO Federation Admin Dashboard - 완전한 설계

> **작성일**: 2024년  
> **목적**: 협회 운영 콘솔 - 리그 운영 플랫폼의 핵심

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [전체 구조](#2-전체-구조)
3. [대시보드 메인](#3-대시보드-메인)
4. [주요 메뉴](#4-주요-메뉴)
5. [UI 컴포넌트](#5-ui-컴포넌트)
6. [페이지 구조](#6-페이지-구조)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
협회 관리자가 리그, 팀, 경기, 결과를 통합 관리하는 운영 콘솔
```

### 핵심 기능

```
✓ 리그/시즌 관리
✓ 팀 승인 및 관리
✓ 선수 등록 관리
✓ 경기 일정 생성 및 관리
✓ 경기 결과 입력
✓ 순위 자동 계산
✓ 공지사항 관리
✓ 대회 운영
```

### URL 구조

```
/federations/{slug}/admin
```

---

## 2️⃣ 전체 구조

### 레이아웃

```
┌─────────────────────────────────────┐
│  Admin Header (협회명, 사용자)      │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │  Main Content            │
│          │                          │
│ - 대시보드                          │
│ - 리그 관리                         │
│ - 시즌 관리                         │
│ - 팀 관리                           │
│ - 선수 관리                         │
│ - 경기 관리                         │
│ - 결과 입력                         │
│ - 순위                              │
│ - 대회                              │
│ - 공지사항                          │
│ - 설정                              │
│          │                          │
└──────────┴──────────────────────────┘
```

### 컴포넌트 트리

```
AdminLayout
 ├ AdminHeader
 ├ AdminSidebar
 └ AdminContent
    ├ DashboardPage
    ├ LeaguesPage
    ├ SeasonsPage
    ├ TeamsPage
    ├ PlayersPage
    ├ MatchesPage
    ├ ResultsPage
    ├ StandingsPage
    ├ TournamentsPage
    ├ NoticesPage
    └ SettingsPage
```

---

## 3️⃣ 대시보드 메인

### KPI 카드

```typescript
// Dashboard KPI Cards
const kpiCards = [
  {
    title: "활성 리그",
    value: 3,
    icon: <Trophy />,
    trend: { value: 1, isPositive: true },
  },
  {
    title: "등록 팀",
    value: 24,
    icon: <Users />,
    trend: { value: 3, isPositive: true },
  },
  {
    title: "등록 선수",
    value: 320,
    icon: <User />,
    trend: { value: 12, isPositive: true },
  },
  {
    title: "오늘 경기",
    value: 6,
    icon: <Calendar />,
    trend: null,
  },
  {
    title: "승인 대기",
    value: 3,
    icon: <Clock />,
    trend: null,
    alert: true,
  },
  {
    title: "결과 미입력",
    value: 2,
    icon: <AlertCircle />,
    trend: null,
    alert: true,
  },
];
```

### 위젯 영역

```typescript
// Dashboard Widgets
const widgets = [
  {
    title: "오늘 경기",
    component: <TodayMatches />,
    size: "large",
  },
  {
    title: "승인 대기 팀",
    component: <PendingTeams />,
    size: "medium",
  },
  {
    title: "최근 공지",
    component: <RecentNotices />,
    size: "medium",
  },
  {
    title: "운영 리포트",
    component: <OperationsReport />,
    size: "large",
  },
];
```

### UI 예시

```typescript
// src/app/federations/[slug]/admin/page.tsx
"use client";

import { StatCard } from "@/components/admin/StatCard";
import { TodayMatches } from "@/components/admin/TodayMatches";
import { PendingTeams } from "@/components/admin/PendingTeams";
import { RecentNotices } from "@/components/admin/RecentNotices";
import { OperationsReport } from "@/components/admin/OperationsReport";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="활성 리그"
          value={3}
          icon={<Trophy className="w-5 h-5" />}
          trend={{ value: 1, isPositive: true }}
        />
        <StatCard
          title="등록 팀"
          value={24}
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 3, isPositive: true }}
        />
        <StatCard
          title="등록 선수"
          value={320}
          icon={<User className="w-5 h-5" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="오늘 경기"
          value={6}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="승인 대기"
          value={3}
          icon={<Clock className="w-5 h-5" />}
          alert
        />
        <StatCard
          title="결과 미입력"
          value={2}
          icon={<AlertCircle className="w-5 h-5" />}
          alert
        />
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayMatches />
        <PendingTeams />
        <RecentNotices />
        <OperationsReport />
      </div>
    </div>
  );
}
```

---

## 4️⃣ 주요 메뉴

### 4.1 리그 관리

**URL**: `/federations/{slug}/admin/leagues`

**기능**:
- 리그 목록 조회
- 리그 생성
- 리그 수정/삭제
- 리그 상태 관리

**UI**:
```typescript
<DataTable
  columns={[
    { key: "name", label: "리그명" },
    { key: "category", label: "카테고리" },
    { key: "ageGroup", label: "연령" },
    { key: "teamCount", label: "팀 수" },
    { key: "status", label: "상태" },
    { key: "actions", label: "작업" },
  ]}
  data={leagues}
  actions={[
    { label: "수정", onClick: handleEdit },
    { label: "삭제", onClick: handleDelete },
  ]}
/>
```

### 4.2 시즌 관리

**URL**: `/federations/{slug}/admin/seasons`

**기능**:
- 시즌 목록 조회
- 시즌 생성
- 시즌별 팀 관리
- 시즌별 경기 일정

**UI**:
```typescript
<SeasonCard
  season={season}
  teamCount={24}
  matchCount={120}
  status="active"
  actions={[
    { label: "팀 관리", onClick: () => router.push(`/seasons/${season.id}/teams`) },
    { label: "일정 관리", onClick: () => router.push(`/seasons/${season.id}/matches`) },
  ]}
/>
```

### 4.3 팀 관리

**URL**: `/federations/{slug}/admin/teams`

**기능**:
- 팀 목록 조회
- 팀 승인/거부
- 팀 정보 수정
- 팀별 선수 관리

**UI**:
```typescript
<TeamTable
  teams={teams}
  filters={[
    { key: "status", label: "상태", options: ["active", "pending", "inactive"] },
    { key: "league", label: "리그", options: leagues },
  ]}
  actions={[
    { label: "승인", onClick: handleApprove, variant: "success" },
    { label: "거부", onClick: handleReject, variant: "danger" },
    { label: "수정", onClick: handleEdit },
  ]}
/>
```

### 4.4 선수 관리

**URL**: `/federations/{slug}/admin/players`

**기능**:
- 선수 목록 조회
- 선수 등록/수정
- 선수 상태 관리
- 팀별 선수 조회

**UI**:
```typescript
<PlayerTable
  players={players}
  filters={[
    { key: "team", label: "팀", options: teams },
    { key: "position", label: "포지션", options: positions },
  ]}
  actions={[
    { label: "수정", onClick: handleEdit },
    { label: "삭제", onClick: handleDelete },
  ]}
/>
```

### 4.5 경기 관리

**URL**: `/federations/{slug}/admin/matches`

**기능**:
- 경기 일정 조회
- 경기 생성
- 경기 일정 수정
- 심판 배정

**UI**:
```typescript
<MatchCalendar
  matches={matches}
  onDateSelect={handleDateSelect}
  onMatchClick={handleMatchClick}
  actions={[
    { label: "경기 생성", onClick: handleCreate },
    { label: "일정 수정", onClick: handleEdit },
  ]}
/>
```

### 4.6 결과 입력

**URL**: `/federations/{slug}/admin/results`

**기능**:
- 경기 결과 입력
- 득점자 기록
- 경고/퇴장 기록
- 교체 기록

**UI**:
```typescript
<ResultEntryForm
  match={match}
  onSubmit={handleSubmit}
  fields={[
    { key: "homeScore", label: "홈 팀 점수", type: "number" },
    { key: "awayScore", label: "원정 팀 점수", type: "number" },
    { key: "scorers", label: "득점자", type: "array" },
    { key: "cards", label: "경고/퇴장", type: "array" },
  ]}
/>
```

### 4.7 순위

**URL**: `/federations/{slug}/admin/standings`

**기능**:
- 리그별 순위 조회
- 순위 자동 계산
- 순위 수동 조정 (필요시)

**UI**:
```typescript
<StandingTable
  standings={standings}
  columns={[
    "rank",
    "team",
    "played",
    "won",
    "drawn",
    "lost",
    "goalsFor",
    "goalsAgainst",
    "goalDifference",
    "points",
  ]}
  sortable
/>
```

### 4.8 대회 관리

**URL**: `/federations/{slug}/admin/tournaments`

**기능**:
- 대회 목록 조회
- 대회 생성
- 조 편성
- 대진표 생성
- 일정 생성

**UI**:
```typescript
<TournamentCard
  tournament={tournament}
  status="active"
  teamCount={16}
  actions={[
    { label: "조 편성", onClick: () => router.push(`/tournaments/${tournament.id}/draw`) },
    { label: "대진표", onClick: () => router.push(`/tournaments/${tournament.id}/bracket`) },
    { label: "일정 생성", onClick: () => router.push(`/tournaments/${tournament.id}/schedule`) },
  ]}
/>
```

### 4.9 공지사항

**URL**: `/federations/{slug}/admin/notices`

**기능**:
- 공지사항 목록 조회
- 공지사항 작성/수정/삭제
- 중요 공지 설정

**UI**:
```typescript
<NoticeTable
  notices={notices}
  actions={[
    { label: "작성", onClick: handleCreate },
    { label: "수정", onClick: handleEdit },
    { label: "삭제", onClick: handleDelete },
  ]}
/>
```

### 4.10 설정

**URL**: `/federations/{slug}/admin/settings`

**기능**:
- 협회 정보 수정
- 브랜딩 설정
- 권한 관리
- 통합 설정

**UI**:
```typescript
<SettingsTabs
  tabs={[
    { id: "general", label: "일반" },
    { id: "branding", label: "브랜딩" },
    { id: "permissions", label: "권한" },
    { id: "integrations", label: "통합" },
  ]}
/>
```

---

## 5️⃣ UI 컴포넌트

### 5.1 AdminLayout

```typescript
// src/app/federations/[slug]/admin/layout.tsx
"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader federationSlug={params.slug} />
      <div className="flex">
        <AdminSidebar federationSlug={params.slug} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 5.2 AdminSidebar

```typescript
// src/components/admin/AdminSidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Users,
  User,
  Clock,
  FileText,
  Settings,
  Megaphone,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "대시보드", path: "/admin" },
  { icon: Trophy, label: "리그 관리", path: "/admin/leagues" },
  { icon: Calendar, label: "시즌 관리", path: "/admin/seasons" },
  { icon: Users, label: "팀 관리", path: "/admin/teams" },
  { icon: User, label: "선수 관리", path: "/admin/players" },
  { icon: Clock, label: "경기 관리", path: "/admin/matches" },
  { icon: FileText, label: "결과 입력", path: "/admin/results" },
  { icon: Trophy, label: "순위", path: "/admin/standings" },
  { icon: Trophy, label: "대회", path: "/admin/tournaments" },
  { icon: Megaphone, label: "공지사항", path: "/admin/notices" },
  { icon: Settings, label: "설정", path: "/admin/settings" },
];

export function AdminSidebar({ federationSlug }: { federationSlug: string }) {
  const pathname = usePathname();
  const basePath = `/federations/${federationSlug}/admin`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          관리자 메뉴
        </h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === `${basePath}${item.path}`;
            
            return (
              <Link
                key={item.path}
                href={`${basePath}${item.path}`}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
```

### 5.3 AdminHeader

```typescript
// src/components/admin/AdminHeader.tsx
"use client";

import { useRouter } from "next/navigation";
import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/shared/Button";

export function AdminHeader({ federationSlug }: { federationSlug: string }) {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            관리자 대시보드
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <User className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/federations/${federationSlug}`)}
          >
            홈페이지 보기
          </Button>
        </div>
      </div>
    </header>
  );
}
```

---

## 6️⃣ 페이지 구조

### 파일 구조

```
src/
├── app/
│   └── federations/
│       └── [slug]/
│           └── admin/
│               ├── layout.tsx
│               ├── page.tsx (Dashboard)
│               ├── leagues/
│               │   └── page.tsx
│               ├── seasons/
│               │   └── page.tsx
│               ├── teams/
│               │   └── page.tsx
│               ├── players/
│               │   └── page.tsx
│               ├── matches/
│               │   └── page.tsx
│               ├── results/
│               │   └── page.tsx
│               ├── standings/
│               │   └── page.tsx
│               ├── tournaments/
│               │   └── page.tsx
│               ├── notices/
│               │   └── page.tsx
│               └── settings/
│                   └── page.tsx
├── components/
│   └── admin/
│       ├── AdminLayout.tsx
│       ├── AdminSidebar.tsx
│       ├── AdminHeader.tsx
│       ├── StatCard.tsx
│       ├── TodayMatches.tsx
│       ├── PendingTeams.tsx
│       ├── RecentNotices.tsx
│       └── OperationsReport.tsx
```

---

## ✅ Federation Admin Dashboard 완료

### 완성된 내용

- ✅ 전체 레이아웃 구조
- ✅ 대시보드 메인 (KPI + 위젯)
- ✅ 10개 주요 메뉴 설계
- ✅ UI 컴포넌트 코드
- ✅ 페이지 구조

### 다음 단계

이제 실제 구현을 시작할 수 있습니다.

---

**작성일**: 2024년  
**상태**: ✅ YAGO Federation Admin Dashboard 완전한 설계 완료
