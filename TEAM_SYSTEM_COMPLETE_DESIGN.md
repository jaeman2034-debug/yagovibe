# 🛡️ 노원구 축구협회 팀 시스템 완전 설계

> **실제 서비스 수준 UI + 컴포넌트 + Firestore 구조**

---

## 📋 목차

1. [팀 시스템 전체 구조](#1-팀-시스템-전체-구조)
2. [팀 페이지 UI (Public)](#2-팀-페이지-ui-public)
3. [팀 목록 페이지](#3-팀-목록-페이지)
4. [팀 관리 페이지](#4-팀-관리-페이지)
5. [선수 관리 UI](#5-선수-관리-ui)
6. [Firestore 데이터 구조](#6-firestore-데이터-구조)
7. [React 컴포넌트 구조](#7-react-컴포넌트-구조)
8. [Next.js 라우터 구조](#8-nextjs-라우터-구조)
9. [실제 구현 코드](#9-실제-구현-코드)

---

## 1️⃣ 팀 시스템 전체 구조

### 팀 시스템 모듈

```
Team System
 ├─ Team Profile (팀 프로필)
 ├─ Team Members (팀 멤버)
 ├─ Team Matches (팀 경기)
 ├─ Team Stats (팀 통계)
 └─ Team Media (팀 미디어)
```

### URL 구조

```
/a/[associationSlug]/teams
  ├─ / (팀 목록)
  ├─ /register (팀 등록)
  └─ /[teamId]
      ├─ / (팀 상세 페이지)
      ├─ /members (멤버 목록)
      ├─ /matches (경기 목록)
      ├─ /stats (통계)
      ├─ /media (미디어)
      └─ /manage (팀 관리)
          ├─ /overview
          ├─ /members
          ├─ /players
          ├─ /schedule
          └─ /settings
```

---

## 2️⃣ 팀 페이지 UI (Public)

### 2-1. 팀 페이지 레이아웃

```
┌─────────────────────────────────────────┐
│         Team Header                    │
│  [로고] 팀명 | 지역 | 회원 상태        │
│  팔로우 버튼 | 공유 버튼               │
├─────────────────────────────────────────┤
│         Tabs                           │
│  Overview | Members | Matches | Stats  │
│  Media                                  │
├─────────────────────────────────────────┤
│         Content                         │
│  (탭별 콘텐츠)                         │
└─────────────────────────────────────────┘
```

### 2-2. Team Header 컴포넌트

**파일**: `src/components/teams/TeamHeader.tsx`

```typescript
import { Link } from "react-router-dom";
import { MapPin, Calendar, Users, Trophy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/social/FollowButton";
import { Team } from "@/types/team";

interface TeamHeaderProps {
  team: Team;
  associationSlug: string;
}

export function TeamHeader({ team, associationSlug }: TeamHeaderProps) {
  return (
    <div className="bg-white border-b">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 팀 로고 */}
          <div className="flex-shrink-0">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-2 border-slate-200"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-600">
                  {team.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* 팀 정보 */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {team.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {team.region}
                  </div>
                  
                  {team.foundedYear && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      창단 {team.foundedYear}
                    </div>
                  )}
                  
                  {team.homeVenue && (
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {team.homeVenue}
                    </div>
                  )}
                </div>

                {/* 회원 상태 배지 */}
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      team.membership === "member"
                        ? "bg-emerald-100 text-emerald-700"
                        : team.membership === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {team.membership === "member"
                      ? "정회원"
                      : team.membership === "pending"
                        ? "승인 대기"
                        : "비회원"}
                  </span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2">
                <FollowButton
                  targetType="team"
                  targetId={team.id}
                  initialFollowersCount={team.followerCount || 0}
                />
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  공유
                </Button>
              </div>
            </div>

            {/* 통계 */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {team.memberCount || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">멤버</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {team.matchCount || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">경기</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {team.winCount || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">승</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {team.followerCount || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">팔로워</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2-3. 팀 페이지 메인 컴포넌트

**파일**: `src/pages/teams/TeamPage.tsx`

```typescript
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "@/services/teamService";
import { TeamHeader } from "@/components/teams/TeamHeader";
import { TeamTabs } from "@/components/teams/TeamTabs";
import { TeamOverviewTab } from "@/components/teams/TeamOverviewTab";
import { TeamMembersTab } from "@/components/teams/TeamMembersTab";
import { TeamMatchesTab } from "@/components/teams/TeamMatchesTab";
import { TeamStatsTab } from "@/components/teams/TeamStatsTab";
import { TeamMediaTab } from "@/components/teams/TeamMediaTab";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

export default function TeamPage() {
  const { associationSlug, teamId } = useParams<{
    associationSlug: string;
    teamId: string;
  }>();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", teamId, "public"],
    queryFn: () => getTeam(teamId!),
    enabled: !!teamId,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !team) {
    return <ErrorState message="팀 정보를 불러오는데 실패했습니다." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Team Header */}
      <TeamHeader team={team} associationSlug={associationSlug!} />

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <TeamTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <TeamOverviewTab teamId={teamId!} />
          )}
          {activeTab === "members" && (
            <TeamMembersTab teamId={teamId!} />
          )}
          {activeTab === "matches" && (
            <TeamMatchesTab teamId={teamId!} />
          )}
          {activeTab === "stats" && (
            <TeamStatsTab teamId={teamId!} />
          )}
          {activeTab === "media" && (
            <TeamMediaTab teamId={teamId!} />
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 2-4. TeamTabs 컴포넌트

**파일**: `src/components/teams/TeamTabs.tsx`

```typescript
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TeamTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TeamTabs({ activeTab, onTabChange }: TeamTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">개요</TabsTrigger>
        <TabsTrigger value="members">멤버</TabsTrigger>
        <TabsTrigger value="matches">경기</TabsTrigger>
        <TabsTrigger value="stats">통계</TabsTrigger>
        <TabsTrigger value="media">미디어</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

---

## 3️⃣ 팀 목록 페이지

### 3-1. 팀 목록 페이지 컴포넌트

**파일**: `src/pages/teams/TeamsDirectoryPage.tsx`

```typescript
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeamsByAssociation } from "@/services/teamService";
import { TeamCard } from "@/components/teams/TeamCard";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";

export default function TeamsDirectoryPage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  const associationId = "assoc-nowon-football"; // 실제로는 slug → id 변환

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", associationId, membershipFilter, sortBy],
    queryFn: () => getTeamsByAssociation(associationId, {
      membership: membershipFilter !== "all" ? membershipFilter : undefined,
      sortBy,
    }),
  });

  const filteredTeams = teams?.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeader
          title="팀 목록"
          description="노원구 축구협회 가맹 팀"
        />

        {/* 검색 및 필터 */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="팀명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={membershipFilter}
            onValueChange={setMembershipFilter}
            className="w-full md:w-48"
          >
            <option value="all">전체</option>
            <option value="member">정회원</option>
            <option value="pending">승인 대기</option>
            <option value="non-member">비회원</option>
          </Select>

          <Select
            value={sortBy}
            onValueChange={setSortBy}
            className="w-full md:w-48"
          >
            <option value="recent">최신순</option>
            <option value="name">이름순</option>
            <option value="members">멤버 많은 순</option>
          </Select>
        </div>

        {/* 팀 그리드 */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl bg-slate-200"
              />
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">팀을 찾을 수 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <TeamCard key={team.id} team={team} associationSlug={associationSlug!} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 3-2. TeamCard 컴포넌트

**파일**: `src/components/teams/TeamCard.tsx`

```typescript
import { Link } from "react-router-dom";
import { MapPin, Users, Trophy } from "lucide-react";
import { Team } from "@/types/team";

interface TeamCardProps {
  team: Team;
  associationSlug: string;
}

export function TeamCard({ team, associationSlug }: TeamCardProps) {
  return (
    <Link
      to={`/a/${associationSlug}/teams/${team.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* 팀 로고 */}
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.name}
            className="h-16 w-16 flex-shrink-0 rounded-xl border border-slate-200"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300">
            <span className="text-xl font-bold text-slate-600">
              {team.name.charAt(0)}
            </span>
          </div>
        )}

        {/* 팀 정보 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600">
            {team.name}
          </h3>

          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {team.region}
            </div>

            {team.memberCount !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                멤버 {team.memberCount}명
              </div>
            )}
          </div>

          {/* 회원 상태 배지 */}
          <div className="mt-3">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                team.membership === "member"
                  ? "bg-emerald-100 text-emerald-700"
                  : team.membership === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {team.membership === "member"
                ? "정회원"
                : team.membership === "pending"
                  ? "승인 대기"
                  : "비회원"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

---

## 4️⃣ 팀 관리 페이지

### 4-1. 팀 관리 페이지 컴포넌트

**파일**: `src/pages/teams/TeamManagePage.tsx`

```typescript
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "@/services/teamService";
import { useTeamPermission } from "@/hooks/useTeamPermission";
import { useAuth } from "@/context/AuthProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamOverviewTab } from "@/components/teams/manage/TeamOverviewTab";
import { TeamMembersTab } from "@/components/teams/manage/TeamMembersTab";
import { TeamPlayersTab } from "@/components/teams/manage/TeamPlayersTab";
import { TeamScheduleTab } from "@/components/teams/manage/TeamScheduleTab";
import { TeamSettingsTab } from "@/components/teams/manage/TeamSettingsTab";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";

export default function TeamManagePage() {
  const { associationSlug, teamId } = useParams<{
    associationSlug: string;
    teamId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { canManage, loading: permissionLoading } = useTeamPermission(
    teamId!,
    user?.uid
  );

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", teamId, "manage"],
    queryFn: () => getTeam(teamId!),
    enabled: !!teamId,
  });

  if (isLoading || permissionLoading) {
    return <LoadingState />;
  }

  if (error || !team) {
    return <ErrorState message="팀 정보를 불러오는데 실패했습니다." />;
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">팀 관리 권한이 없습니다.</p>
          <Button
            variant="outline"
            onClick={() => navigate(`/a/${associationSlug}/teams/${teamId}`)}
          >
            팀 페이지로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/a/${associationSlug}/teams/${teamId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              팀 페이지로
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {team.name} 관리
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                팀 정보 및 멤버를 관리하세요
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="members">멤버</TabsTrigger>
            <TabsTrigger value="players">선수</TabsTrigger>
            <TabsTrigger value="schedule">일정</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <TeamOverviewTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="members">
              <TeamMembersTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="players">
              <TeamPlayersTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="schedule">
              <TeamScheduleTab teamId={teamId!} />
            </TabsContent>

            <TabsContent value="settings">
              <TeamSettingsTab teamId={teamId!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
```

---

## 5️⃣ 선수 관리 UI

### 5-1. TeamPlayersTab 컴포넌트

**파일**: `src/components/teams/manage/TeamPlayersTab.tsx`

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeamPlayers, addPlayer, updatePlayer, deletePlayer } from "@/services/playerService";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { PlayerRegisterForm } from "@/components/teams/PlayerRegisterForm";
import { PlayerCard } from "@/components/teams/PlayerCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface TeamPlayersTabProps {
  teamId: string;
}

export function TeamPlayersTab({ teamId }: TeamPlayersTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: players, isLoading } = useQuery({
    queryKey: ["team", teamId, "players"],
    queryFn: () => getTeamPlayers(teamId),
  });

  const addPlayerMutation = useMutation({
    mutationFn: (data: any) => addPlayer(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId, "players"] });
      setIsAddModalOpen(false);
      toast.success("선수가 등록되었습니다!");
    },
    onError: (error: any) => {
      toast.error(error.message || "선수 등록에 실패했습니다.");
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">선수 관리</h2>
          <p className="mt-1 text-sm text-slate-600">
            등록된 선수 {players?.length || 0}명
          </p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              선수 등록
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>선수 등록</DialogTitle>
            </DialogHeader>
            <PlayerRegisterForm
              teamId={teamId}
              onSubmit={(data) => addPlayerMutation.mutate(data)}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Players Grid */}
      {players && players.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={() => {
                // 편집 로직
              }}
              onDelete={() => {
                // 삭제 로직
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500 mb-4">등록된 선수가 없습니다.</p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            첫 선수 등록하기
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### 5-2. PlayerCard 컴포넌트

**파일**: `src/components/teams/PlayerCard.tsx`

```typescript
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Player } from "@/types/player";

interface PlayerCardProps {
  player: Player;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function PlayerCard({
  player,
  onEdit,
  onDelete,
  showActions = false,
}: PlayerCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-4">
        {/* 프로필 사진 */}
        <Avatar className="h-16 w-16">
          <AvatarImage src={player.photoUrl} />
          <AvatarFallback>
            {player.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* 선수 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{player.name}</h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                {player.position && (
                  <span className="rounded bg-slate-100 px-2 py-0.5">
                    {player.position}
                  </span>
                )}
                {player.jerseyNumber && (
                  <span className="font-medium">#{player.jerseyNumber}</span>
                )}
              </div>
            </div>

            {showActions && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* 추가 정보 */}
          {player.birthDate && (
            <div className="mt-2 text-xs text-slate-500">
              {new Date(player.birthDate).getFullYear()}년생
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 6️⃣ Firestore 데이터 구조

### teams 컬렉션

```typescript
// teams/{teamId}
{
  id: string;
  name: string;
  region: string;
  description?: string;
  logoUrl?: string;
  ownerUid: string;
  owners: string[];
  
  // 협회 연동
  associationId?: string;
  membership: "non-member" | "pending" | "member";
  
  // 통계 (Denormalized)
  memberCount: number;
  matchCount: number;
  winCount: number;
  drawCount: number;
  lossCount: number;
  followerCount: number;
  
  // 기타
  foundedYear?: number;
  homeVenue?: string;
  status: "active" | "inactive";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### teams/{teamId}/members 서브컬렉션

```typescript
// teams/{teamId}/members/{uid}
{
  uid: string; // 문서 ID = uid
  role: "owner" | "admin" | "member";
  status: "active" | "inactive";
  joinedAt: Timestamp;
  
  // Denormalized
  userName?: string;
  userPhotoUrl?: string;
}
```

### teams/{teamId}/players 서브컬렉션

```typescript
// teams/{teamId}/players/{playerId}
{
  id: string;
  name: string;
  birthDate: Timestamp;
  position?: "GK" | "DF" | "MF" | "FW";
  jerseyNumber?: number;
  phone?: string;
  email?: string;
  photoUrl?: string;
  status: "active" | "inactive";
  registeredAt: Timestamp;
}
```

---

## 7️⃣ React 컴포넌트 구조

```
components/teams/
├─ TeamHeader.tsx
├─ TeamTabs.tsx
├─ TeamCard.tsx
├─ TeamOverviewTab.tsx
├─ TeamMembersTab.tsx
├─ TeamMatchesTab.tsx
├─ TeamStatsTab.tsx
├─ TeamMediaTab.tsx
├─ PlayerCard.tsx
├─ PlayerRegisterForm.tsx
└─ manage/
    ├─ TeamOverviewTab.tsx
    ├─ TeamMembersTab.tsx
    ├─ TeamPlayersTab.tsx
    ├─ TeamScheduleTab.tsx
    └─ TeamSettingsTab.tsx
```

---

## 8️⃣ Next.js 라우터 구조

```
app/
└─ a/
   └─ [associationSlug]/
      └─ teams/
         ├─ page.tsx                    # 팀 목록
         ├─ register/
         │  └─ page.tsx                 # 팀 등록
         └─ [teamId]/
            ├─ page.tsx                 # 팀 상세 (Public)
            ├─ members/
            │  └─ page.tsx             # 멤버 목록
            ├─ matches/
            │  └─ page.tsx             # 경기 목록
            ├─ stats/
            │  └─ page.tsx             # 통계
            ├─ media/
            │  └─ page.tsx             # 미디어
            └─ manage/
               ├─ page.tsx             # 팀 관리 대시보드
               ├─ overview/
               ├─ members/
               ├─ players/
               ├─ schedule/
               └─ settings/
```

---

## 9️⃣ 실제 구현 코드

### 9-1. 팀 서비스 함수

**파일**: `src/services/teamService.ts`

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Team } from "@/types/team";

export async function getTeam(teamId: string): Promise<Team> {
  const docRef = doc(db, "teams", teamId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Team not found");
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Team;
}

export async function getTeamsByAssociation(
  associationId: string,
  options?: {
    membership?: string;
    sortBy?: string;
    limitCount?: number;
  }
): Promise<Team[]> {
  let q = query(
    collection(db, "teams"),
    where("associationId", "==", associationId),
    where("status", "==", "active")
  );

  if (options?.membership) {
    q = query(q, where("membership", "==", options.membership));
  }

  if (options?.sortBy === "recent") {
    q = query(q, orderBy("createdAt", "desc"));
  } else if (options?.sortBy === "name") {
    q = query(q, orderBy("name", "asc"));
  } else if (options?.sortBy === "members") {
    q = query(q, orderBy("memberCount", "desc"));
  }

  if (options?.limitCount) {
    q = query(q, limit(options.limitCount));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Team[];
}

export async function getTeamMembers(teamId: string) {
  const membersRef = collection(db, `teams/${teamId}/members`);
  const snapshot = await getDocs(membersRef);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    uid: doc.id,
    ...doc.data(),
  }));
}
```

---

### 9-2. 선수 서비스 함수

**파일**: `src/services/playerService.ts`

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { serverTimestamp } from "firebase/firestore";

export async function getTeamPlayers(teamId: string) {
  const playersRef = collection(db, `teams/${teamId}/players`);
  const q = query(playersRef, where("status", "==", "active"), orderBy("jerseyNumber", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function addPlayer(teamId: string, data: {
  name: string;
  birthDate: string;
  position?: string;
  jerseyNumber?: number;
  phone?: string;
  email?: string;
}) {
  const playersRef = collection(db, `teams/${teamId}/players`);
  
  return await addDoc(playersRef, {
    ...data,
    birthDate: new Date(data.birthDate),
    status: "active",
    registeredAt: serverTimestamp(),
  });
}

export async function updatePlayer(
  teamId: string,
  playerId: string,
  data: Partial<{
    name: string;
    position: string;
    jerseyNumber: number;
    phone: string;
    email: string;
  }>
) {
  const playerRef = doc(db, `teams/${teamId}/players`, playerId);
  return await updateDoc(playerRef, data);
}

export async function deletePlayer(teamId: string, playerId: string) {
  const playerRef = doc(db, `teams/${teamId}/players`, playerId);
  return await updateDoc(playerRef, { status: "inactive" });
}
```

---

## ✅ 구현 체크리스트

### Phase 1: 팀 페이지 (Public)
- [ ] `TeamPage` 컴포넌트
- [ ] `TeamHeader` 컴포넌트
- [ ] `TeamTabs` 컴포넌트
- [ ] `TeamOverviewTab` 구현
- [ ] `TeamMembersTab` 구현
- [ ] `TeamMatchesTab` 구현
- [ ] `TeamStatsTab` 구현
- [ ] `TeamMediaTab` 구현

### Phase 2: 팀 목록
- [ ] `TeamsDirectoryPage` 구현
- [ ] `TeamCard` 컴포넌트
- [ ] 검색 및 필터 기능

### Phase 3: 팀 관리
- [ ] `TeamManagePage` 구현
- [ ] 권한 체크 로직
- [ ] 각 탭별 관리 기능

### Phase 4: 선수 관리
- [ ] `TeamPlayersTab` 구현
- [ ] `PlayerRegisterForm` 구현
- [ ] `PlayerCard` 컴포넌트
- [ ] 선수 CRUD 기능

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
