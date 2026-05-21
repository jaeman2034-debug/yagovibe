# 🎯 YAGO Federation Admin Dashboard - 완전한 실무 설계

> **작성일**: 2024년  
> **목적**: 협회 운영자가 대회, 팀, 선수, 일정, 승인, 공지를 관리하는 운영 OS

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [라우팅 구조](#2-라우팅-구조)
3. [전체 레이아웃](#3-전체-레이아웃)
4. [Sidebar 메뉴](#4-sidebar-메뉴)
5. [Topbar 구조](#5-topbar-구조)
6. [Dashboard 메인](#6-dashboard-메인)
7. [주요 페이지 상세](#7-주요-페이지-상세)
8. [권한 구조](#8-권한-구조)
9. [DB 구조](#9-db-구조)
10. [React 구현](#10-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
협회 운영자가 리그와 팀을 관리하는 통합 콘솔
```

### 핵심 기능

```
✓ 대회/리그 관리
✓ 팀 승인 및 관리
✓ 선수 등록 관리
✓ 경기 일정 생성 및 관리
✓ 경기 결과 입력
✓ 공지사항 관리
✓ 이벤트 관리
✓ 승인 요청 처리
✓ 통계 및 리포트
✓ 협회 설정
```

### URL 구조

```
/federations/{slug}/admin
```

예: `/federations/seoul-youth-football/admin`

---

## 2️⃣ 라우팅 구조

### 전체 라우팅

```
/federations/{slug}/admin
 ├─ / (Dashboard)
 ├─ /teams (팀 관리)
 ├─ /players (선수 관리)
 ├─ /leagues (대회/리그 관리)
 ├─ /matches (경기 일정)
 ├─ /events (이벤트)
 ├─ /announcements (공지사항)
 ├─ /approvals (승인 요청)
 ├─ /stats (통계)
 └─ /settings (설정)
```

---

## 3️⃣ 전체 레이아웃

### 레이아웃 구조

```
┌─────────────────────────────────────┐
│  Topbar (협회명 + Quick Actions)    │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │  Main Content            │
│          │                          │
│ - 대시보드                          │
│ - 팀 관리                           │
│ - 선수 관리                         │
│ - 대회/리그                         │
│ - 경기 일정                         │
│ - 이벤트                            │
│ - 공지사항                          │
│ - 승인 요청                         │
│ - 통계                              │
│ - 설정                              │
│          │                          │
└──────────┴──────────────────────────┘
```

### React 구조

```typescript
FederationAdminLayout
 ├─ AdminTopbar
 ├─ AdminSidebar
 └─ AdminContent
    ├─ DashboardPage
    ├─ TeamsPage
    ├─ PlayersPage
    ├─ LeaguesPage
    ├─ MatchesPage
    ├─ EventsPage
    ├─ AnnouncementsPage
    ├─ ApprovalsPage
    ├─ StatsPage
    └─ SettingsPage
```

---

## 4️⃣ Sidebar 메뉴

### 메뉴 구조

```typescript
const menuItems = [
  { icon: LayoutDashboard, label: "대시보드", path: "/admin" },
  { icon: Users, label: "팀 관리", path: "/admin/teams" },
  { icon: User, label: "선수 관리", path: "/admin/players" },
  { icon: Trophy, label: "대회/리그", path: "/admin/leagues" },
  { icon: Calendar, label: "경기 일정", path: "/admin/matches" },
  { icon: PartyPopper, label: "이벤트", path: "/admin/events" },
  { icon: Megaphone, label: "공지사항", path: "/admin/announcements" },
  { icon: CheckCircle, label: "승인 요청", path: "/admin/approvals", badge: 3 },
  { icon: BarChart, label: "통계", path: "/admin/stats" },
  { icon: Settings, label: "설정", path: "/admin/settings" },
];
```

### Sidebar 컴포넌트

```typescript
// src/components/admin/AdminSidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  User,
  Trophy,
  Calendar,
  PartyPopper,
  Megaphone,
  CheckCircle,
  BarChart,
  Settings,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "대시보드", path: "/admin" },
  { icon: Users, label: "팀 관리", path: "/admin/teams" },
  { icon: User, label: "선수 관리", path: "/admin/players" },
  { icon: Trophy, label: "대회/리그", path: "/admin/leagues" },
  { icon: Calendar, label: "경기 일정", path: "/admin/matches" },
  { icon: PartyPopper, label: "이벤트", path: "/admin/events" },
  { icon: Megaphone, label: "공지사항", path: "/admin/announcements" },
  { icon: CheckCircle, label: "승인 요청", path: "/admin/approvals" },
  { icon: BarChart, label: "통계", path: "/admin/stats" },
  { icon: Settings, label: "설정", path: "/admin/settings" },
];

export function AdminSidebar({ federationSlug }: { federationSlug: string }) {
  const pathname = usePathname();
  const basePath = `/federations/${federationSlug}/admin`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
```

---

## 5️⃣ Topbar 구조

### Topbar 컴포넌트

```typescript
// src/components/admin/AdminTopbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { Bell, User, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { DropdownMenu } from "@/components/shared/DropdownMenu";

interface AdminTopbarProps {
  federationSlug: string;
  federationName: string;
  pendingApprovals?: number;
}

export function AdminTopbar({
  federationSlug,
  federationName,
  pendingApprovals = 0,
}: AdminTopbarProps) {
  const router = useRouter();

  const quickActions = [
    {
      label: "대회 만들기",
      onClick: () => router.push(`/federations/${federationSlug}/admin/leagues/new`),
    },
    {
      label: "팀 초대",
      onClick: () => router.push(`/federations/${federationSlug}/admin/teams/invite`),
    },
    {
      label: "공지 작성",
      onClick: () => router.push(`/federations/${federationSlug}/admin/announcements/new`),
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* Left: Federation Info */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {federationName}
          </h1>
          <span className="text-sm text-gray-500">관리자 대시보드</span>
        </div>

        {/* Center: Quick Actions */}
        <div className="flex items-center gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant="outline"
              onClick={action.onClick}
            >
              <Plus className="w-4 h-4 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            {pendingApprovals > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {pendingApprovals}
              </span>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="ghost" size="sm">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item>프로필</DropdownMenu.Item>
              <DropdownMenu.Item>설정</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onClick={() => router.push(`/federations/${federationSlug}`)}>
                홈페이지 보기
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

---

## 6️⃣ Dashboard 메인

### Dashboard 페이지

```typescript
// src/app/federations/[slug]/admin/page.tsx
"use client";

import { StatCard } from "@/components/admin/StatCard";
import { TodayMatches } from "@/components/admin/TodayMatches";
import { PendingApprovals } from "@/components/admin/PendingApprovals";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { Trophy, Users, User, Calendar, Clock, AlertCircle } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="등록 팀"
          value={24}
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 3, isPositive: true }}
        />
        <StatCard
          title="등록 선수"
          value={312}
          icon={<User className="w-5 h-5" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="진행 중 대회"
          value={2}
          icon={<Trophy className="w-5 h-5" />}
        />
        <StatCard
          title="이번주 경기"
          value={18}
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

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayMatches />
        <PendingApprovals />
        <RecentActivity />
      </div>
    </div>
  );
}
```

### StatCard 컴포넌트

```typescript
// src/components/admin/StatCard.tsx
import { Card } from "@/components/shared/Card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  alert?: boolean;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  alert,
}: StatCardProps) {
  return (
    <Card className={alert ? "border-red-200 bg-red-50" : ""}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${alert ? "text-red-600" : "text-gray-900"}`}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-2">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm ml-1 ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "+" : ""}{trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={`${alert ? "text-red-400" : "text-gray-400"}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
```

### PendingApprovals 컴포넌트

```typescript
// src/components/admin/PendingApprovals.tsx
"use client";

import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { CheckCircle, XCircle } from "lucide-react";

interface Approval {
  id: string;
  type: "team" | "player" | "result";
  title: string;
  description: string;
  createdAt: Date;
}

export function PendingApprovals() {
  const approvals: Approval[] = [
    {
      id: "1",
      type: "team",
      title: "노원FC 팀 등록 요청",
      description: "팀 인원 22명, 지역: 노원구",
      createdAt: new Date(),
    },
    {
      id: "2",
      type: "player",
      title: "김민수 선수 등록 요청",
      description: "노원FC, 포지션: FW",
      createdAt: new Date(),
    },
  ];

  const handleApprove = (id: string) => {
    // 승인 로직
  };

  const handleReject = (id: string) => {
    // 거절 로직
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">승인 요청</h3>
        <Button variant="ghost" size="sm">
          전체 보기
        </Button>
      </div>
      <div className="space-y-3">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{approval.title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {approval.description}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {approval.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprove(approval.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  승인
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(approval.id)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  거절
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

---

## 7️⃣ 주요 페이지 상세

### 7.1 팀 관리 페이지

```typescript
// src/app/federations/[slug]/admin/teams/page.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/shared/Card";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Search, Plus, Eye, Edit } from "lucide-react";

export default function TeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const teams = [
    {
      id: "1",
      name: "노원FC",
      playerCount: 24,
      leagueCount: 2,
      status: "active",
      region: "노원구",
    },
    // ...
  ];

  const columns = [
    { key: "name", label: "팀명" },
    { key: "playerCount", label: "선수 수" },
    { key: "leagueCount", label: "참가 대회" },
    { key: "status", label: "상태" },
    { key: "actions", label: "작업" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">팀 관리</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          팀 초대
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="팀명으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Teams Table */}
      <Card>
        <DataTable
          columns={columns}
          data={teams}
          renderRow={(team) => (
            <tr key={team.id}>
              <td className="px-6 py-4">{team.name}</td>
              <td className="px-6 py-4">{team.playerCount}명</td>
              <td className="px-6 py-4">{team.leagueCount}개</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  {team.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          )}
        />
      </Card>
    </div>
  );
}
```

### 7.2 선수 관리 페이지

```typescript
// src/app/federations/[slug]/admin/players/page.tsx
"use client";

import { DataTable } from "@/components/shared/DataTable";
import { Select } from "@/components/shared/Select";

export default function PlayersPage() {
  const players = [
    {
      id: "1",
      name: "김민수",
      team: "노원FC",
      position: "FW",
      age: 15,
      status: "active",
    },
    // ...
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">선수 관리</h1>
      
      {/* Filters */}
      <div className="grid grid-cols-4 gap-4">
        <Select label="팀" options={[]} />
        <Select label="연령" options={[]} />
        <Select label="포지션" options={[]} />
        <Select label="상태" options={[]} />
      </div>

      {/* Players Table */}
      <DataTable
        columns={[
          { key: "name", label: "이름" },
          { key: "team", label: "팀" },
          { key: "position", label: "포지션" },
          { key: "age", label: "나이" },
          { key: "status", label: "상태" },
        ]}
        data={players}
      />
    </div>
  );
}
```

### 7.3 대회/리그 관리 페이지

```typescript
// src/app/federations/[slug]/admin/leagues/page.tsx
"use client";

import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { Trophy, Users, Calendar } from "lucide-react";

export default function LeaguesPage() {
  const leagues = [
    {
      id: "1",
      name: "2026 서울북부 유소년 리그",
      teamCount: 12,
      matchCount: 66,
      status: "active",
    },
    // ...
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대회/리그 관리</h1>
        <Button>
          <Trophy className="w-4 h-4 mr-2" />
          대회 만들기
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leagues.map((league) => (
          <Card key={league.id} hover>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Trophy className="w-8 h-8 text-primary-600" />
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  {league.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {league.name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>팀 {league.teamCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>경기 {league.matchCount}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  관리
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 8️⃣ 권한 구조

### 관리자 Role

```typescript
type AdminRole = "owner" | "admin" | "staff" | "referee";

const permissions: Record<AdminRole, string[]> = {
  owner: [
    "manage-all",
    "manage-admins",
    "manage-settings",
  ],
  admin: [
    "manage-leagues",
    "manage-teams",
    "manage-players",
    "manage-matches",
    "manage-results",
    "manage-announcements",
  ],
  staff: [
    "manage-matches",
    "manage-announcements",
    "view-stats",
  ],
  referee: [
    "manage-results",
    "view-matches",
  ],
};
```

---

## 9️⃣ DB 구조

### 핵심 컬렉션

```typescript
// Firestore 구조
federations/{federationId}
 ├─ admins/{adminId}
 ├─ teams/{teamId}
 ├─ players/{playerId}
 ├─ leagues/{leagueId}
 ├─ matches/{matchId}
 ├─ events/{eventId}
 ├─ announcements/{announcementId}
 ├─ approvalRequests/{requestId}
 └─ settings
```

---

## 🔟 React 구현

### AdminLayout

```typescript
// src/app/federations/[slug]/admin/layout.tsx
"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminTopbar federationSlug={params.slug} />
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

---

## ✅ Federation Admin Dashboard 완료

### 완성된 내용

- ✅ 전체 레이아웃 구조
- ✅ Sidebar 메뉴 (10개)
- ✅ Topbar (빠른 액션)
- ✅ Dashboard 메인 (KPI + 위젯)
- ✅ 주요 페이지 상세 (팀, 선수, 대회)
- ✅ 권한 구조
- ✅ DB 구조
- ✅ React 구현 코드

---

**작성일**: 2024년  
**상태**: ✅ YAGO Federation Admin Dashboard 완전한 실무 설계 완료
