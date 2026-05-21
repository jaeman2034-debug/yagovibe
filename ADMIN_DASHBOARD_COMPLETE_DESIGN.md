# ⚙️ 노원구 축구협회 Admin Dashboard 완전 설계

> **협회 관리자 시스템 - 실제 운영 가능한 수준 설계**

---

## 📋 목차

1. [Admin Dashboard 전체 구조](#1-admin-dashboard-전체-구조)
2. [Admin Router 구조](#2-admin-router-구조)
3. [Admin Layout](#3-admin-layout)
4. [Dashboard 메인 화면](#4-dashboard-메인-화면)
5. [팀 승인 시스템](#5-팀-승인-시스템)
6. [선수 승인 시스템](#6-선수-승인-시스템)
7. [리그/경기 관리](#7-리그경기-관리)
8. [공지 작성 시스템](#8-공지-작성-시스템)
9. [미디어 승인 시스템](#9-미디어-승인-시스템)
10. [Analytics Dashboard](#10-analytics-dashboard)
11. [권한 체크 시스템](#11-권한-체크-시스템)
12. [실제 구현 코드](#12-실제-구현-코드)

---

## 1️⃣ Admin Dashboard 전체 구조

### Admin 모듈

```
Admin Dashboard System
 ├─ Dashboard (대시보드)
 │   ├─ Stats Cards (통계 카드)
 │   ├─ Recent Activity (최근 활동)
 │   ├─ Pending Approvals (승인 대기)
 │   └─ Upcoming Matches (예정 경기)
 ├─ Teams Management (팀 관리)
 │   ├─ Team List (팀 목록)
 │   ├─ Team Approval (팀 승인)
 │   └─ Team Details (팀 상세)
 ├─ Players Management (선수 관리)
 │   ├─ Player List (선수 목록)
 │   ├─ Player Approval (선수 승인)
 │   └─ Player Details (선수 상세)
 ├─ Tournaments Management (리그 관리)
 │   ├─ Tournament List (리그 목록)
 │   ├─ Tournament Create (리그 생성)
 │   └─ Tournament Details (리그 상세)
 ├─ Matches Management (경기 관리)
 │   ├─ Match List (경기 목록)
 │   ├─ Match Create (경기 생성)
 │   └─ Live Match Recording (Live 기록)
 ├─ Approvals (승인 관리)
 │   ├─ Team Approvals (팀 승인)
 │   ├─ Player Approvals (선수 승인)
 │   └─ Media Approvals (미디어 승인)
 ├─ Notices (공지 관리)
 │   ├─ Notice List (공지 목록)
 │   ├─ Notice Create (공지 작성)
 │   └─ Notice Edit (공지 수정)
 ├─ Media Management (미디어 관리)
 │   ├─ Media List (미디어 목록)
 │   └─ Media Approval (미디어 승인)
 └─ Analytics (통계)
     ├─ Platform Stats (플랫폼 통계)
     ├─ Growth Charts (성장 차트)
     └─ Insights (인사이트)
```

### URL 구조

```
/a/[associationSlug]/admin
```

예:
```
/a/nowon-football/admin
```

---

## 2️⃣ Admin Router 구조

### Next.js App Router 구조

```
app/
└─ a/
   └─ [associationSlug]/
      └─ admin/
         ├─ layout.tsx              # Admin Layout
         ├─ page.tsx                # Dashboard
         ├─ teams/
         │   ├─ page.tsx            # 팀 목록
         │   ├─ [teamId]/
         │   │   └─ page.tsx        # 팀 상세
         │   └─ approvals/
         │       └─ page.tsx        # 팀 승인
         ├─ players/
         │   ├─ page.tsx            # 선수 목록
         │   ├─ [playerId]/
         │   │   └─ page.tsx        # 선수 상세
         │   └─ approvals/
         │       └─ page.tsx        # 선수 승인
         ├─ tournaments/
         │   ├─ page.tsx            # 리그 목록
         │   ├─ create/
         │   │   └─ page.tsx        # 리그 생성
         │   └─ [tournamentId]/
         │       └─ page.tsx        # 리그 상세
         ├─ matches/
         │   ├─ page.tsx            # 경기 목록
         │   ├─ create/
         │   │   └─ page.tsx        # 경기 생성
         │   └─ [matchId]/
         │       ├─ page.tsx        # 경기 상세
         │       └─ live/
         │           └─ page.tsx    # Live 기록
         ├─ approvals/
         │   └─ page.tsx            # 승인 대시보드
         ├─ notices/
         │   ├─ page.tsx            # 공지 목록
         │   ├─ create/
         │   │   └─ page.tsx        # 공지 작성
         │   └─ [noticeId]/
         │       └─ page.tsx        # 공지 수정
         ├─ media/
         │   ├─ page.tsx            # 미디어 목록
         │   └─ approvals/
         │       └─ page.tsx        # 미디어 승인
         └─ analytics/
            └─ page.tsx             # 통계 대시보드
```

---

## 3️⃣ Admin Layout

### Admin Layout 컴포넌트

**파일**: `src/layouts/AdminLayout.tsx`

```typescript
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

export default function AdminLayout() {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  const { isAdmin, loading } = useIsAssociationAdmin(associationSlug);

  if (loading) {
    return <LoadingState />;
  }

  if (!isAdmin) {
    return (
      <ErrorState
        title="접근 권한이 없습니다"
        message="협회 관리자만 접근할 수 있습니다."
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <AdminSidebar associationSlug={associationSlug!} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <AdminHeader associationSlug={associationSlug!} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

---

### Admin Sidebar 컴포넌트

**파일**: `src/components/admin/AdminSidebar.tsx`

```typescript
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Trophy,
  Calendar,
  CheckCircle,
  FileText,
  Image,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  associationSlug: string;
}

const menuItems = [
  {
    name: "대시보드",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "팀 관리",
    href: "/admin/teams",
    icon: Users,
  },
  {
    name: "선수 관리",
    href: "/admin/players",
    icon: UserCheck,
  },
  {
    name: "리그 관리",
    href: "/admin/tournaments",
    icon: Trophy,
  },
  {
    name: "경기 관리",
    href: "/admin/matches",
    icon: Calendar,
  },
  {
    name: "승인 관리",
    href: "/admin/approvals",
    icon: CheckCircle,
  },
  {
    name: "공지 관리",
    href: "/admin/notices",
    icon: FileText,
  },
  {
    name: "미디어 관리",
    href: "/admin/media",
    icon: Image,
  },
  {
    name: "통계",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    name: "설정",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar({ associationSlug }: AdminSidebarProps) {
  const location = useLocation();

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">관리자 콘솔</h2>
        <p className="text-xs text-slate-500 mt-1">노원구 축구협회</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const href = `/a/${associationSlug}${item.href}`;
          const isActive = location.pathname === href;

          return (
            <Link
              key={item.name}
              to={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <Link
          to={`/a/${associationSlug}`}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← 공개 페이지로
        </Link>
      </div>
    </div>
  );
}
```

---

### Admin Header 컴포넌트

**파일**: `src/components/admin/AdminHeader.tsx`

```typescript
import { useAuth } from "@/context/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
  associationSlug: string;
}

export function AdminHeader({ associationSlug }: AdminHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            관리자 대시보드
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ""} />
                  <AvatarFallback>
                    {user?.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700">
                  {user?.displayName || "관리자"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <a href={`/a/${associationSlug}`}>공개 페이지</a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <a href="/settings">설정</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

---

## 4️⃣ Dashboard 메인 화면

### Admin Dashboard Page

**파일**: `src/pages/admin/AdminDashboardPage.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getAssociationStats } from "@/services/adminService";
import { StatCard } from "@/components/admin/StatCard";
import { PendingApprovals } from "@/components/admin/PendingApprovals";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { UpcomingMatches } from "@/components/admin/UpcomingMatches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["adminStats", associationSlug],
    queryFn: () => getAssociationStats(associationSlug!),
  });

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="등록 팀 수"
          value={stats?.teamCount || 0}
          icon="🛡"
          trend={stats?.teamCountTrend}
        />
        <StatCard
          label="등록 선수 수"
          value={stats?.playerCount || 0}
          icon="👤"
          trend={stats?.playerCountTrend}
        />
        <StatCard
          label="오늘 경기"
          value={stats?.todayMatchCount || 0}
          icon="⚽"
        />
        <StatCard
          label="진행 중 리그"
          value={stats?.activeTournamentCount || 0}
          icon="🏆"
        />
      </div>

      {/* Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingApprovals associationSlug={associationSlug!} />
        <UpcomingMatches associationSlug={associationSlug!} />
      </div>

      {/* Recent Activity */}
      <RecentActivity associationSlug={associationSlug!} />
    </div>
  );
}
```

---

### Stat Card 컴포넌트

**파일**: `src/components/admin/StatCard.tsx`

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
            {trend && (
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="text-4xl opacity-20">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 5️⃣ 팀 승인 시스템

### Team Approval Page

**파일**: `src/pages/admin/teams/TeamApprovalPage.tsx`

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingTeams, approveTeam, rejectTeam } from "@/services/adminService";
import { TeamApprovalRow } from "@/components/admin/TeamApprovalRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

export default function TeamApprovalPage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  const queryClient = useQueryClient();

  const { data: pendingTeams, isLoading } = useQuery({
    queryKey: ["pendingTeams", associationSlug],
    queryFn: () => getPendingTeams(associationSlug!),
  });

  const approveMutation = useMutation({
    mutationFn: (teamId: string) => approveTeam(associationSlug!, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingTeams", associationSlug] });
      toast.success("팀이 승인되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`승인 실패: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ teamId, reason }: { teamId: string; reason?: string }) =>
      rejectTeam(associationSlug!, teamId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingTeams", associationSlug] });
      toast.success("팀이 거절되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`거절 실패: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">팀 승인 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          승인 대기 중인 팀: {pendingTeams?.length || 0}개
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>승인 대기 팀</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTeams && pendingTeams.length > 0 ? (
            <div className="space-y-4">
              {pendingTeams.map((team) => (
                <TeamApprovalRow
                  key={team.id}
                  team={team}
                  onApprove={() => approveMutation.mutate(team.id)}
                  onReject={(reason) =>
                    rejectMutation.mutate({ teamId: team.id, reason })
                  }
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              승인 대기 중인 팀이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Team Approval Row 컴포넌트

**파일**: `src/components/admin/TeamApprovalRow.tsx`

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MapPin, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Team } from "@/types/team";

interface TeamApprovalRowProps {
  team: Team;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export function TeamApprovalRow({
  team,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: TeamApprovalRowProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleReject = () => {
    onReject(rejectReason || undefined);
    setShowRejectDialog(false);
    setRejectReason("");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Team Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {team.name}
              </h3>
              <Badge variant="outline">승인 대기</Badge>
            </div>

            <div className="space-y-1 text-sm text-slate-600">
              {team.region && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {team.region}
                </div>
              )}
              {team.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(team.createdAt.toDate(), "yyyy년 MM월 dd일", {
                    locale: ko,
                  })}
                </div>
              )}
              {team.sportType && (
                <div className="text-xs text-slate-500 mt-2">
                  종목: {team.sportType}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onApprove}
              disabled={isApproving || isRejecting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isApproving ? "승인 중..." : "승인"}
            </Button>

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isApproving || isRejecting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  거절
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>팀 승인 거절</DialogTitle>
                  <DialogDescription>
                    거절 사유를 입력해주세요. (선택사항)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">거절 사유</Label>
                    <Textarea
                      id="reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="거절 사유를 입력하세요..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(false)}
                  >
                    취소
                  </Button>
                  <Button variant="destructive" onClick={handleReject}>
                    거절
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6️⃣ 선수 승인 시스템

### Player Approval Page

**파일**: `src/pages/admin/players/PlayerApprovalPage.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingPlayers, approvePlayer, rejectPlayer } from "@/services/adminService";
import { PlayerApprovalRow } from "@/components/admin/PlayerApprovalRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

export default function PlayerApprovalPage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  const queryClient = useQueryClient();

  const { data: pendingPlayers, isLoading } = useQuery({
    queryKey: ["pendingPlayers", associationSlug],
    queryFn: () => getPendingPlayers(associationSlug!),
  });

  const approveMutation = useMutation({
    mutationFn: (playerId: string) => approvePlayer(associationSlug!, playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPlayers", associationSlug] });
      toast.success("선수가 승인되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`승인 실패: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ playerId, reason }: { playerId: string; reason?: string }) =>
      rejectPlayer(associationSlug!, playerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPlayers", associationSlug] });
      toast.success("선수가 거절되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`거절 실패: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">선수 승인 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          승인 대기 중인 선수: {pendingPlayers?.length || 0}명
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>승인 대기 선수</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPlayers && pendingPlayers.length > 0 ? (
            <div className="space-y-4">
              {pendingPlayers.map((player) => (
                <PlayerApprovalRow
                  key={player.id}
                  player={player}
                  onApprove={() => approveMutation.mutate(player.id)}
                  onReject={(reason) =>
                    rejectMutation.mutate({ playerId: player.id, reason })
                  }
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              승인 대기 중인 선수가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Player Approval Row 컴포넌트

**파일**: `src/components/admin/PlayerApprovalRow.tsx`

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Player } from "@/types/player";

interface PlayerApprovalRowProps {
  player: Player;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export function PlayerApprovalRow({
  player,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: PlayerApprovalRowProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleReject = () => {
    onReject(rejectReason || undefined);
    setShowRejectDialog(false);
    setRejectReason("");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Player Info */}
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={player.photoUrl} />
              <AvatarFallback>
                {player.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {player.name}
                </h3>
                <Badge variant="outline">승인 대기</Badge>
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                {player.teamName && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {player.teamName}
                  </div>
                )}
                {player.position && (
                  <div className="text-xs text-slate-500">
                    포지션: {player.position}
                  </div>
                )}
                {player.jerseyNumber && (
                  <div className="text-xs text-slate-500">
                    등번호: #{player.jerseyNumber}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onApprove}
              disabled={isApproving || isRejecting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isApproving ? "승인 중..." : "승인"}
            </Button>

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isApproving || isRejecting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  거절
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>선수 승인 거절</DialogTitle>
                  <DialogDescription>
                    거절 사유를 입력해주세요. (선택사항)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">거절 사유</Label>
                    <Textarea
                      id="reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="거절 사유를 입력하세요..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(false)}
                  >
                    취소
                  </Button>
                  <Button variant="destructive" onClick={handleReject}>
                    거절
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 7️⃣ 리그/경기 관리

### Tournament Create Page

**파일**: `src/pages/admin/tournaments/TournamentCreatePage.tsx`

```typescript
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { createTournament } from "@/services/tournamentService";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function TournamentCreatePage() {
  const navigate = useNavigate();
  const { associationSlug } = useParams<{ associationSlug: string }>();

  const createMutation = useMutation({
    mutationFn: (data: any) => createTournament(associationSlug!, data),
    onSuccess: (tournamentId) => {
      toast.success("리그가 생성되었습니다.");
      navigate(`/a/${associationSlug}/admin/tournaments/${tournamentId}`);
    },
    onError: (error: any) => {
      toast.error(`리그 생성 실패: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">리그 생성</h1>
        <p className="text-sm text-slate-500 mt-1">
          새로운 리그를 생성합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>리그 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <TournamentForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Match Create Page

**파일**: `src/pages/admin/matches/MatchCreatePage.tsx`

```typescript
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { createMatch } from "@/services/matchService";
import { MatchForm } from "@/components/admin/MatchForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function MatchCreatePage() {
  const navigate = useNavigate();
  const { associationSlug } = useParams<{ associationSlug: string }>();

  const createMutation = useMutation({
    mutationFn: (data: any) => createMatch(associationSlug!, data),
    onSuccess: (matchId) => {
      toast.success("경기가 생성되었습니다.");
      navigate(`/a/${associationSlug}/admin/matches/${matchId}`);
    },
    onError: (error: any) => {
      toast.error(`경기 생성 실패: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">경기 생성</h1>
        <p className="text-sm text-slate-500 mt-1">
          새로운 경기를 생성합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>경기 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 8️⃣ 공지 작성 시스템

### Notice Create Page

**파일**: `src/pages/admin/notices/NoticeCreatePage.tsx`

```typescript
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { createNotice } from "@/services/noticeService";
import { NoticeEditor } from "@/components/admin/NoticeEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NoticeCreatePage() {
  const navigate = useNavigate();
  const { associationSlug } = useParams<{ associationSlug: string }>();

  const createMutation = useMutation({
    mutationFn: (data: any) => createNotice(associationSlug!, data),
    onSuccess: (noticeId) => {
      toast.success("공지가 작성되었습니다.");
      navigate(`/a/${associationSlug}/admin/notices`);
    },
    onError: (error: any) => {
      toast.error(`공지 작성 실패: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">공지 작성</h1>
        <p className="text-sm text-slate-500 mt-1">
          새로운 공지를 작성합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공지 내용</CardTitle>
        </CardHeader>
        <CardContent>
          <NoticeEditor
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 9️⃣ 미디어 승인 시스템

### Media Approval Page

**파일**: `src/pages/admin/media/MediaApprovalPage.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingMedia, approveMedia, rejectMedia } from "@/services/adminService";
import { MediaApprovalRow } from "@/components/admin/MediaApprovalRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

export default function MediaApprovalPage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  const queryClient = useQueryClient();

  const { data: pendingMedia, isLoading } = useQuery({
    queryKey: ["pendingMedia", associationSlug],
    queryFn: () => getPendingMedia(associationSlug!),
  });

  const approveMutation = useMutation({
    mutationFn: (mediaId: string) => approveMedia(associationSlug!, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingMedia", associationSlug] });
      toast.success("미디어가 승인되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`승인 실패: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ mediaId, reason }: { mediaId: string; reason?: string }) =>
      rejectMedia(associationSlug!, mediaId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingMedia", associationSlug] });
      toast.success("미디어가 거절되었습니다.");
    },
    onError: (error: any) => {
      toast.error(`거절 실패: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">미디어 승인 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          승인 대기 중인 미디어: {pendingMedia?.length || 0}개
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>승인 대기 미디어</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMedia && pendingMedia.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingMedia.map((media) => (
                <MediaApprovalRow
                  key={media.id}
                  media={media}
                  onApprove={() => approveMutation.mutate(media.id)}
                  onReject={(reason) =>
                    rejectMutation.mutate({ mediaId: media.id, reason })
                  }
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              승인 대기 중인 미디어가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🔟 Analytics Dashboard

### Analytics Page

**파일**: `src/pages/admin/analytics/AnalyticsPage.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getAssociationAnalytics } from "@/services/adminService";
import { GrowthCharts } from "@/components/admin/GrowthCharts";
import { TopEntitiesTable } from "@/components/admin/TopEntitiesTable";
import { InsightsCard } from "@/components/admin/InsightsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", associationSlug],
    queryFn: () => getAssociationAnalytics(associationSlug!),
  });

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">통계 대시보드</h1>
        <p className="text-sm text-slate-500 mt-1">
          협회 운영 통계를 확인하세요.
        </p>
      </div>

      {/* Growth Charts */}
      <GrowthCharts data={analytics?.growth} />

      {/* Top Entities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopEntitiesTable
          title="인기 팀"
          entities={analytics?.topTeams || []}
        />
        <TopEntitiesTable
          title="인기 선수"
          entities={analytics?.topPlayers || []}
        />
      </div>

      {/* Insights */}
      <InsightsCard insights={analytics?.insights || []} />
    </div>
  );
}
```

---

## 11️⃣ 권한 체크 시스템

### Admin Route Guard

**파일**: `src/components/admin/AdminRouteGuard.tsx`

```typescript
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAssociationAdmin(associationSlug);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate(`/a/${associationSlug}`);
    }
  }, [isAdmin, loading, navigate, associationSlug]);

  if (loading) {
    return <LoadingState />;
  }

  if (!isAdmin) {
    return (
      <ErrorState
        title="접근 권한이 없습니다"
        message="협회 관리자만 접근할 수 있습니다."
      />
    );
  }

  return <>{children}</>;
}
```

---

## 12️⃣ 실제 구현 코드

### 12-1. Admin Service

**파일**: `src/services/adminService.ts`

```typescript
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team, Player, Media } from "@/types";

/**
 * 협회 통계 조회
 */
export async function getAssociationStats(associationSlug: string) {
  // Association ID 조회
  const associationsRef = collection(db, "associations");
  const q = query(associationsRef, where("slug", "==", associationSlug));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("Association not found");
  }

  const associationId = snapshot.docs[0].id;

  // 통계 조회
  const [teamsSnap, playersSnap, matchesSnap, tournamentsSnap] = await Promise.all([
    getDocs(query(collection(db, "teams"), where("associationId", "==", associationId))),
    getDocs(query(collection(db, "players"), where("associationId", "==", associationId))),
    getDocs(query(collection(db, "matches"), where("associationId", "==", associationId))),
    getDocs(query(collection(db, "tournaments"), where("associationId", "==", associationId))),
  ]);

  // 오늘 경기 수
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMatches = matchesSnap.docs.filter((doc) => {
    const match = doc.data();
    const matchDate = match.date?.toDate?.() || new Date(match.date);
    return matchDate >= today;
  });

  return {
    teamCount: teamsSnap.size,
    playerCount: playersSnap.size,
    todayMatchCount: todayMatches.length,
    activeTournamentCount: tournamentsSnap.docs.filter(
      (doc) => doc.data().status === "active"
    ).length,
  };
}

/**
 * 승인 대기 팀 목록 조회
 */
export async function getPendingTeams(associationSlug: string): Promise<Team[]> {
  const associationsRef = collection(db, "associations");
  const q = query(associationsRef, where("slug", "==", associationSlug));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }

  const associationId = snapshot.docs[0].id;

  const teamsRef = collection(db, "teams");
  const teamsQuery = query(
    teamsRef,
    where("associationId", "==", associationId),
    where("membership", "==", "pending")
  );

  const teamsSnap = await getDocs(teamsQuery);
  return teamsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Team[];
}

/**
 * 팀 승인
 */
export async function approveTeam(
  associationSlug: string,
  teamId: string
): Promise<void> {
  const teamRef = doc(db, "teams", teamId);
  await updateDoc(teamRef, {
    membership: "member",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 팀 거절
 */
export async function rejectTeam(
  associationSlug: string,
  teamId: string,
  reason?: string
): Promise<void> {
  const teamRef = doc(db, "teams", teamId);
  await updateDoc(teamRef, {
    membership: "non-member",
    rejectionReason: reason,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 승인 대기 선수 목록 조회
 */
export async function getPendingPlayers(associationSlug: string): Promise<Player[]> {
  const associationsRef = collection(db, "associations");
  const q = query(associationsRef, where("slug", "==", associationSlug));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }

  const associationId = snapshot.docs[0].id;

  const playersRef = collection(db, "players");
  const playersQuery = query(
    playersRef,
    where("associationId", "==", associationId),
    where("status", "==", "pending")
  );

  const playersSnap = await getDocs(playersQuery);
  return playersSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Player[];
}

/**
 * 선수 승인
 */
export async function approvePlayer(
  associationSlug: string,
  playerId: string
): Promise<void> {
  const playerRef = doc(db, "players", playerId);
  await updateDoc(playerRef, {
    status: "approved",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 선수 거절
 */
export async function rejectPlayer(
  associationSlug: string,
  playerId: string,
  reason?: string
): Promise<void> {
  const playerRef = doc(db, "players", playerId);
  await updateDoc(playerRef, {
    status: "rejected",
    rejectionReason: reason,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 승인 대기 미디어 목록 조회
 */
export async function getPendingMedia(associationSlug: string): Promise<Media[]> {
  const associationsRef = collection(db, "associations");
  const q = query(associationsRef, where("slug", "==", associationSlug));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }

  const associationId = snapshot.docs[0].id;

  const mediaRef = collection(db, "media");
  const mediaQuery = query(
    mediaRef,
    where("associationId", "==", associationId),
    where("status", "==", "pending")
  );

  const mediaSnap = await getDocs(mediaQuery);
  return mediaSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Media[];
}

/**
 * 미디어 승인
 */
export async function approveMedia(
  associationSlug: string,
  mediaId: string
): Promise<void> {
  const mediaRef = doc(db, "media", mediaId);
  await updateDoc(mediaRef, {
    status: "approved",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 미디어 거절
 */
export async function rejectMedia(
  associationSlug: string,
  mediaId: string,
  reason?: string
): Promise<void> {
  const mediaRef = doc(db, "media", mediaId);
  await updateDoc(mediaRef, {
    status: "rejected",
    rejectionReason: reason,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

---

## ✅ 구현 체크리스트

### Phase 1: Admin Dashboard 기본 (MVP)
- [ ] `AdminLayout` 구현
- [ ] `AdminSidebar` 구현
- [ ] `AdminHeader` 구현
- [ ] `AdminDashboardPage` 구현
- [ ] `StatCard` 컴포넌트 구현
- [ ] `adminService.ts` 작성

### Phase 2: 승인 시스템
- [ ] `TeamApprovalPage` 구현
- [ ] `PlayerApprovalPage` 구현
- [ ] `MediaApprovalPage` 구현
- [ ] 승인/거절 함수 구현

### Phase 3: 관리 기능
- [ ] `TournamentCreatePage` 구현
- [ ] `MatchCreatePage` 구현
- [ ] `NoticeCreatePage` 구현
- [ ] 각종 Form 컴포넌트 구현

### Phase 4: Analytics
- [ ] `AnalyticsPage` 구현
- [ ] `GrowthCharts` 컴포넌트 구현
- [ ] `TopEntitiesTable` 컴포넌트 구현
- [ ] `InsightsCard` 컴포넌트 구현

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
