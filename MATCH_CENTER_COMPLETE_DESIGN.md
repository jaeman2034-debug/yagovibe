# ⚽ 노원구 축구협회 Match Center 완전 설계

> **경기 페이지 전체 설계 + 실제 구현 코드**

---

## 📋 목차

1. [Match Center 전체 구조](#1-match-center-전체-구조)
2. [경기 페이지 UI](#2-경기-페이지-ui)
3. [Match Header](#3-match-header)
4. [탭별 컴포넌트](#4-탭별-컴포넌트)
5. [Firestore 데이터 구조](#5-firestore-데이터-구조)
6. [React 컴포넌트 구조](#6-react-컴포넌트-구조)
7. [Next.js 라우터 구조](#7-nextjs-라우터-구조)
8. [실제 구현 코드](#8-실제-구현-코드)

---

## 1️⃣ Match Center 전체 구조

### Match Center 모듈

```
Match Center
 ├─ Overview (경기 개요)
 ├─ Lineup (출전 명단)
 ├─ Timeline (경기 타임라인)
 ├─ Stats (경기 통계)
 ├─ Media (경기 미디어)
 └─ Comments (댓글)
```

### URL 구조

```
/a/[associationSlug]/matches/[matchId]
```

예:
```
/a/nowon-football/matches/match-2026-03-15-nowon-vs-sanggye
```

---

## 2️⃣ 경기 페이지 UI

### 페이지 레이아웃

```
┌─────────────────────────────────────────┐
│         Match Header                    │
│  대회명 | 라운드 | 경기장 | 시간        │
│  홈팀 2 : 1 원정팀                      │
│  [경기 상태 배지]                       │
├─────────────────────────────────────────┤
│         Match Tabs                      │
│  Overview | Lineup | Timeline | Stats  │
│  Media | Comments                      │
├─────────────────────────────────────────┤
│         Content Area                    │
│  (탭별 콘텐츠)                          │
└─────────────────────────────────────────┘
```

---

## 3️⃣ Match Header

### 3-1. Match Header 컴포넌트

**파일**: `src/components/match/MatchHeader.tsx`

```typescript
import { Link } from "react-router-dom";
import { Calendar, MapPin, Clock, Trophy } from "lucide-react";
import { Match } from "@/types/match";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface MatchHeaderProps {
  match: Match;
  associationSlug: string;
}

export function MatchHeader({ match, associationSlug }: MatchHeaderProps) {
  const statusConfig = {
    scheduled: { label: "예정", color: "bg-slate-100 text-slate-700" },
    live: { label: "진행중", color: "bg-emerald-100 text-emerald-700" },
    completed: { label: "종료", color: "bg-slate-200 text-slate-600" },
    cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
  };

  const config = statusConfig[match.status] || statusConfig.scheduled;

  return (
    <div className="bg-white border-b">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* 대회 정보 */}
        <div className="mb-4">
          <Link
            to={`/a/${associationSlug}/tournaments/${match.tournamentId}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            {match.tournamentName}
          </Link>
          {match.roundLabel && (
            <span className="ml-2 text-sm text-slate-500">
              · {match.roundLabel}
            </span>
          )}
        </div>

        {/* 경기 정보 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* 팀 vs 팀 */}
          <div className="flex-1">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
              {/* 홈팀 */}
              <div className="text-right">
                {match.homeTeamLogoUrl && (
                  <img
                    src={match.homeTeamLogoUrl}
                    alt={match.homeTeamName}
                    className="mx-auto mb-3 h-16 w-16 rounded-xl border-2 border-slate-200"
                  />
                )}
                <h2 className="text-xl font-bold text-slate-900">
                  {match.homeTeamName}
                </h2>
                <Link
                  to={`/a/${associationSlug}/teams/${match.homeTeamId}`}
                  className="text-sm text-slate-500 hover:text-emerald-600"
                >
                  팀 페이지 →
                </Link>
              </div>

              {/* 스코어 */}
              <div className="text-center">
                {match.status === "completed" && match.homeScore !== undefined ? (
                  <div>
                    <div className="text-4xl font-bold text-slate-900">
                      {match.homeScore} : {match.awayScore}
                    </div>
                    <div className="mt-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                ) : match.status === "live" ? (
                  <div>
                    <div className="text-4xl font-bold text-emerald-600">
                      {match.homeScore || 0} : {match.awayScore || 0}
                    </div>
                    <div className="mt-2">
                      <span className="flex items-center justify-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                        LIVE
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold text-slate-400">VS</div>
                    <div className="mt-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 원정팀 */}
              <div className="text-left">
                {match.awayTeamLogoUrl && (
                  <img
                    src={match.awayTeamLogoUrl}
                    alt={match.awayTeamName}
                    className="mx-auto mb-3 h-16 w-16 rounded-xl border-2 border-slate-200"
                  />
                )}
                <h2 className="text-xl font-bold text-slate-900">
                  {match.awayTeamName}
                </h2>
                <Link
                  to={`/a/${associationSlug}/teams/${match.awayTeamId}`}
                  className="text-sm text-slate-500 hover:text-emerald-600"
                >
                  팀 페이지 →
                </Link>
              </div>
            </div>
          </div>

          {/* 경기장 및 시간 정보 */}
          <div className="w-full md:w-auto">
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {match.venueName}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {match.date
                  ? format(new Date(match.date), "yyyy년 MM월 dd일", { locale: ko })
                  : "-"}
              </div>
              {match.time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {match.time}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4️⃣ 탭별 컴포넌트

### 4-1. Match Page 메인 컴포넌트

**파일**: `src/pages/matches/MatchPage.tsx`

```typescript
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMatch } from "@/services/matchService";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchTabs } from "@/components/match/MatchTabs";
import { MatchOverviewTab } from "@/components/match/MatchOverviewTab";
import { MatchLineupTab } from "@/components/match/MatchLineupTab";
import { MatchTimelineTab } from "@/components/match/MatchTimelineTab";
import { MatchStatsTab } from "@/components/match/MatchStatsTab";
import { MatchMediaTab } from "@/components/match/MatchMediaTab";
import { MatchCommentsTab } from "@/components/match/MatchCommentsTab";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

export default function MatchPage() {
  const { associationSlug, matchId } = useParams<{
    associationSlug: string;
    matchId: string;
  }>();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: match, isLoading, error } = useQuery({
    queryKey: ["match", matchId, "public"],
    queryFn: () => getMatch(matchId!),
    enabled: !!matchId,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !match) {
    return <ErrorState message="경기 정보를 불러오는데 실패했습니다." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Match Header */}
      <MatchHeader match={match} associationSlug={associationSlug!} />

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <MatchTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <MatchOverviewTab matchId={matchId!} />
          )}
          {activeTab === "lineup" && (
            <MatchLineupTab matchId={matchId!} />
          )}
          {activeTab === "timeline" && (
            <MatchTimelineTab matchId={matchId!} />
          )}
          {activeTab === "stats" && (
            <MatchStatsTab matchId={matchId!} />
          )}
          {activeTab === "media" && (
            <MatchMediaTab matchId={matchId!} />
          )}
          {activeTab === "comments" && (
            <MatchCommentsTab matchId={matchId!} />
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 4-2. MatchTabs 컴포넌트

**파일**: `src/components/match/MatchTabs.tsx`

```typescript
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MatchTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MatchTabs({ activeTab, onTabChange }: MatchTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview">개요</TabsTrigger>
        <TabsTrigger value="lineup">라인업</TabsTrigger>
        <TabsTrigger value="timeline">타임라인</TabsTrigger>
        <TabsTrigger value="stats">통계</TabsTrigger>
        <TabsTrigger value="media">미디어</TabsTrigger>
        <TabsTrigger value="comments">댓글</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

---

### 4-3. MatchOverviewTab 컴포넌트

**파일**: `src/components/match/MatchOverviewTab.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { getMatchEvents, getMatchScorers } from "@/services/matchService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Whistle, Users2 } from "lucide-react";

interface MatchOverviewTabProps {
  matchId: string;
}

export function MatchOverviewTab({ matchId }: MatchOverviewTabProps) {
  const { data: events } = useQuery({
    queryKey: ["match", matchId, "events"],
    queryFn: () => getMatchEvents(matchId),
  });

  const { data: scorers } = useQuery({
    queryKey: ["match", matchId, "scorers"],
    queryFn: () => getMatchScorers(matchId),
  });

  const goals = events?.filter((e) => e.type === "goal") || [];
  const cards = events?.filter((e) => e.type === "yellow_card" || e.type === "red_card") || [];
  const substitutions = events?.filter((e) => e.type === "substitution") || [];

  return (
    <div className="space-y-6">
      {/* 득점자 */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              득점
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals.map((goal, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚽</span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {goal.playerName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {goal.teamName}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    {goal.minute}'
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 경고/퇴장 */}
      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-600" />
              경고/퇴장
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {card.type === "red_card" ? "🟥" : "🟨"}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {card.playerName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {card.teamName}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    {card.minute ? `${card.minute}'` : "-"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 교체 */}
      {substitutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-blue-600" />
              교체
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {substitutions.map((sub, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔄</span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {sub.playerOutName} → {sub.playerInName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {sub.teamName}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    {sub.minute}'
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 심판 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Whistle className="h-5 w-5 text-slate-600" />
            심판
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>주심: {events?.referees?.main || "-"}</div>
            <div>부심1: {events?.referees?.assistant1 || "-"}</div>
            <div>부심2: {events?.referees?.assistant2 || "-"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 4-4. MatchTimelineTab 컴포넌트

**파일**: `src/components/match/MatchTimelineTab.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { getMatchEvents } from "@/services/matchService";
import { TimelineItem } from "@/components/match/TimelineItem";
import { Card, CardContent } from "@/components/ui/card";

interface MatchTimelineTabProps {
  matchId: string;
}

export function MatchTimelineTab({ matchId }: MatchTimelineTabProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["match", matchId, "events"],
    queryFn: () => getMatchEvents(matchId),
  });

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          경기 이벤트가 없습니다.
        </CardContent>
      </Card>
    );
  }

  // 시간순 정렬
  const sortedEvents = [...events].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => (
        <TimelineItem key={index} event={event} />
      ))}
    </div>
  );
}
```

---

### 4-5. TimelineItem 컴포넌트

**파일**: `src/components/match/TimelineItem.tsx`

```typescript
import { MatchEvent } from "@/types/match";

interface TimelineItemProps {
  event: MatchEvent;
}

export function TimelineItem({ event }: TimelineItemProps) {
  const eventConfig = {
    goal: { icon: "⚽", color: "text-emerald-600", bg: "bg-emerald-50" },
    assist: { icon: "🎯", color: "text-blue-600", bg: "bg-blue-50" },
    yellow_card: { icon: "🟨", color: "text-yellow-600", bg: "bg-yellow-50" },
    red_card: { icon: "🟥", color: "text-red-600", bg: "bg-red-50" },
    substitution: { icon: "🔄", color: "text-purple-600", bg: "bg-purple-50" },
    penalty: { icon: "⚽", color: "text-emerald-600", bg: "bg-emerald-50" },
  };

  const config = eventConfig[event.type] || {
    icon: "•",
    color: "text-slate-600",
    bg: "bg-slate-50",
  };

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
      {/* 시간 */}
      <div className="flex-shrink-0">
        <div className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {event.minute || 0}'
        </div>
      </div>

      {/* 이벤트 아이콘 */}
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
        <span className="text-xl">{config.icon}</span>
      </div>

      {/* 이벤트 정보 */}
      <div className="flex-1">
        <div className="font-semibold text-slate-900">{event.playerName}</div>
        <div className="text-sm text-slate-600">{event.teamName}</div>
        {event.description && (
          <div className="mt-1 text-sm text-slate-500">{event.description}</div>
        )}
      </div>
    </div>
  );
}
```

---

### 4-6. MatchLineupTab 컴포넌트

**파일**: `src/components/match/MatchLineupTab.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { getMatchLineup } from "@/services/matchService";
import { LineupField } from "@/components/match/LineupField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface MatchLineupTabProps {
  matchId: string;
}

export function MatchLineupTab({ matchId }: MatchLineupTabProps) {
  const { data: lineup, isLoading } = useQuery({
    queryKey: ["match", matchId, "lineup"],
    queryFn: () => getMatchLineup(matchId),
  });

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (!lineup) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          출전 명단 정보가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 포메이션 필드 */}
      <LineupField
        homeTeam={lineup.homeTeam}
        awayTeam={lineup.awayTeam}
        homeFormation={lineup.homeFormation}
        awayFormation={lineup.awayFormation}
      />

      {/* 선발 명단 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {lineup.homeTeam.name} 선발
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lineup.homeTeam.starters.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">
                      #{player.jerseyNumber}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {player.name}
                      </div>
                      {player.position && (
                        <div className="text-xs text-slate-500">
                          {player.position}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {lineup.awayTeam.name} 선발
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lineup.awayTeam.starters.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">
                      #{player.jerseyNumber}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {player.name}
                      </div>
                      {player.position && (
                        <div className="text-xs text-slate-500">
                          {player.position}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 교체 명단 */}
      {(lineup.homeTeam.substitutes.length > 0 ||
        lineup.awayTeam.substitutes.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>교체 명단</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lineup.homeTeam.substitutes.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm"
                  >
                    <span className="font-medium">#{player.jerseyNumber}</span>
                    <span>{player.name}</span>
                    {player.position && (
                      <span className="text-xs text-slate-500">
                        {player.position}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>교체 명단</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lineup.awayTeam.substitutes.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm"
                  >
                    <span className="font-medium">#{player.jerseyNumber}</span>
                    <span>{player.name}</span>
                    {player.position && (
                      <span className="text-xs text-slate-500">
                        {player.position}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

### 4-7. MatchStatsTab 컴포넌트

**파일**: `src/components/match/MatchStatsTab.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { getMatchStats } from "@/services/matchService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MatchStatsTabProps {
  matchId: string;
}

export function MatchStatsTab({ matchId }: MatchStatsTabProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["match", matchId, "stats"],
    queryFn: () => getMatchStats(matchId),
  });

  if (isLoading) {
    return <div className="text-center py-12">로딩 중...</div>;
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          경기 통계 정보가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 점유율 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            점유율
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{stats.homeTeam.name}</span>
                <span className="font-bold">{stats.possession.home}%</span>
              </div>
              <Progress value={stats.possession.home} className="h-3" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{stats.awayTeam.name}</span>
                <span className="font-bold">{stats.possession.away}%</span>
              </div>
              <Progress value={stats.possession.away} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 슛 */}
      <Card>
        <CardHeader>
          <CardTitle>슛</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.shots.home}
              </div>
              <div className="text-xs text-slate-500 mt-1">홈팀</div>
            </div>
            <div className="text-slate-400">vs</div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.shots.away}
              </div>
              <div className="text-xs text-slate-500 mt-1">원정팀</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 유효슛 */}
      <Card>
        <CardHeader>
          <CardTitle>유효슛</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.shotsOnTarget.home}
              </div>
              <div className="text-xs text-slate-500 mt-1">홈팀</div>
            </div>
            <div className="text-slate-400">vs</div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.shotsOnTarget.away}
              </div>
              <div className="text-xs text-slate-500 mt-1">원정팀</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 코너킥 */}
      <Card>
        <CardHeader>
          <CardTitle>코너킥</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.corners.home}
              </div>
              <div className="text-xs text-slate-500 mt-1">홈팀</div>
            </div>
            <div className="text-slate-400">vs</div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.corners.away}
              </div>
              <div className="text-xs text-slate-500 mt-1">원정팀</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 파울 */}
      <Card>
        <CardHeader>
          <CardTitle>파울</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.fouls.home}
              </div>
              <div className="text-xs text-slate-500 mt-1">홈팀</div>
            </div>
            <div className="text-slate-400">vs</div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.fouls.away}
              </div>
              <div className="text-xs text-slate-500 mt-1">원정팀</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 4-8. MatchMediaTab 컴포넌트

**파일**: `src/components/match/MatchMediaTab.tsx`

```typescript
import { MediaGallery } from "@/components/media/MediaGallery";

interface MatchMediaTabProps {
  matchId: string;
}

export function MatchMediaTab({ matchId }: MatchMediaTabProps) {
  return (
    <div>
      <MediaGallery
        entityType="match"
        entityId={matchId}
        showUpload={false}
      />
    </div>
  );
}
```

---

### 4-9. MatchCommentsTab 컴포넌트

**파일**: `src/components/match/MatchCommentsTab.tsx`

```typescript
import { CommentDialog } from "@/components/social/CommentDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface MatchCommentsTabProps {
  matchId: string;
}

export function MatchCommentsTab({ matchId }: MatchCommentsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">댓글</h3>
        <Button onClick={() => setIsDialogOpen(true)}>
          <MessageCircle className="h-4 w-4 mr-2" />
          댓글 작성
        </Button>
      </div>

      <CommentDialog
        entityType="match"
        entityId={matchId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCommentAdded={() => {}}
      />
    </div>
  );
}
```

---

## 5️⃣ Firestore 데이터 구조

### matches 컬렉션

```typescript
// matches/{matchId}
// 또는 associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}
{
  id: string;
  associationId: string;
  tournamentId: string;
  tournamentName: string;
  
  // 팀 정보
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogoUrl?: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogoUrl?: string;
  
  // 경기 정보
  date: string; // "2026-03-15"
  time: string; // "15:00"
  venueId: string;
  venueName: string;
  roundLabel?: string; // "3R", "결승"
  
  // 경기 결과
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "completed" | "cancelled";
  
  // 심판
  referees?: {
    main?: string;
    assistant1?: string;
    assistant2?: string;
  };
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}
```

### match_events 컬렉션

```typescript
// match_events/{eventId}
// 또는 associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}/events/{eventId}
{
  id: string;
  matchId: string;
  
  // 이벤트 정보
  type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution" | "penalty";
  minute: number;
  
  // 선수 정보
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  
  // 추가 정보
  description?: string;
  assistPlayerId?: string; // 골일 경우 어시스트 선수
  assistPlayerName?: string;
  playerOutId?: string; // 교체일 경우
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  
  createdAt: Timestamp;
}
```

### match_lineups 컬렉션

```typescript
// match_lineups/{lineupId}
// 또는 associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}/lineups/{teamId}
{
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  
  // 포메이션
  formation?: string; // "4-4-2", "4-3-3"
  
  // 선발 명단
  starters: Array<{
    id: string;
    playerId: string;
    name: string;
    position: string;
    jerseyNumber: number;
  }>;
  
  // 교체 명단
  substitutes: Array<{
    id: string;
    playerId: string;
    name: string;
    position: string;
    jerseyNumber: number;
  }>;
  
  createdAt: Timestamp;
}
```

### match_stats 컬렉션

```typescript
// match_stats/{matchId}
{
  id: string;
  matchId: string;
  
  // 점유율
  possession: {
    home: number; // 55
    away: number; // 45
  };
  
  // 슛
  shots: {
    home: number;
    away: number;
  };
  
  // 유효슛
  shotsOnTarget: {
    home: number;
    away: number;
  };
  
  // 코너킥
  corners: {
    home: number;
    away: number;
  };
  
  // 파울
  fouls: {
    home: number;
    away: number;
  };
  
  // 오프사이드
  offsides: {
    home: number;
    away: number;
  };
  
  updatedAt: Timestamp;
}
```

---

## 6️⃣ React 컴포넌트 구조

```
components/match/
├─ MatchHeader.tsx
├─ MatchTabs.tsx
├─ MatchOverviewTab.tsx
├─ MatchLineupTab.tsx
├─ MatchTimelineTab.tsx
├─ MatchStatsTab.tsx
├─ MatchMediaTab.tsx
├─ MatchCommentsTab.tsx
├─ TimelineItem.tsx
├─ LineupField.tsx
└─ MatchStatsCard.tsx
```

---

## 7️⃣ Next.js 라우터 구조

```
app/
└─ a/
   └─ [associationSlug]/
      └─ matches/
         └─ [matchId]/
            ├─ page.tsx              # Match Center 메인
            ├─ lineup/
            │  └─ page.tsx           # 라인업 전용 페이지
            ├─ timeline/
            │  └─ page.tsx           # 타임라인 전용 페이지
            ├─ stats/
            │  └─ page.tsx           # 통계 전용 페이지
            ├─ media/
            │  └─ page.tsx           # 미디어 전용 페이지
            └─ comments/
               └─ page.tsx           # 댓글 전용 페이지
```

---

## 8️⃣ 실제 구현 코드

### 8-1. Match 서비스 함수

**파일**: `src/services/matchService.ts`

```typescript
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match, MatchEvent, MatchLineup, MatchStats } from "@/types/match";

export async function getMatch(matchId: string): Promise<Match> {
  // 먼저 matches 컬렉션에서 찾기
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (matchSnap.exists()) {
    return {
      id: matchSnap.id,
      ...matchSnap.data(),
    } as Match;
  }

  // 없으면 associations 하위에서 찾기
  const allMatchesRef = collectionGroup(db, "matches");
  const q = query(allMatchesRef, where("__name__", "==", matchId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("Match not found");
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as Match;
}

export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
  // match_events 컬렉션에서 찾기
  const eventsRef = collection(db, "match_events");
  const q = query(
    eventsRef,
    where("matchId", "==", matchId),
    orderBy("minute", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MatchEvent[];
}

export async function getMatchScorers(matchId: string) {
  const events = await getMatchEvents(matchId);
  return events.filter((e) => e.type === "goal");
}

export async function getMatchLineup(matchId: string): Promise<MatchLineup | null> {
  const lineupRef = collection(db, "match_lineups");
  const q = query(lineupRef, where("matchId", "==", matchId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const lineups = snapshot.docs.map((doc) => doc.data());
  
  // 홈팀과 원정팀 분리
  const homeLineup = lineups.find((l) => l.teamId === lineups[0].homeTeamId);
  const awayLineup = lineups.find((l) => l.teamId === lineups[0].awayTeamId);

  return {
    homeTeam: homeLineup || { name: "", starters: [], substitutes: [] },
    awayTeam: awayLineup || { name: "", starters: [], substitutes: [] },
    homeFormation: homeLineup?.formation,
    awayFormation: awayLineup?.formation,
  };
}

export async function getMatchStats(matchId: string): Promise<MatchStats | null> {
  const statsRef = doc(db, "match_stats", matchId);
  const statsSnap = await getDoc(statsRef);

  if (!statsSnap.exists()) {
    return null;
  }

  return {
    id: statsSnap.id,
    ...statsSnap.data(),
  } as MatchStats;
}
```

---

### 8-2. Match 타입 정의

**파일**: `src/types/match.ts`

```typescript
import { Timestamp } from "firebase/firestore";

export interface Match {
  id: string;
  associationId: string;
  tournamentId: string;
  tournamentName: string;
  
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogoUrl?: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogoUrl?: string;
  
  date: string;
  time?: string;
  venueId: string;
  venueName: string;
  roundLabel?: string;
  
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "completed" | "cancelled";
  
  referees?: {
    main?: string;
    assistant1?: string;
    assistant2?: string;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}

export type MatchEventType =
  | "goal"
  | "assist"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | "penalty";

export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  minute: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  description?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  playerOutId?: string;
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  createdAt: Timestamp;
}

export interface MatchLineup {
  homeTeam: {
    name: string;
    starters: Array<{
      id: string;
      playerId: string;
      name: string;
      position: string;
      jerseyNumber: number;
    }>;
    substitutes: Array<{
      id: string;
      playerId: string;
      name: string;
      position: string;
      jerseyNumber: number;
    }>;
  };
  awayTeam: {
    name: string;
    starters: Array<{
      id: string;
      playerId: string;
      name: string;
      position: string;
      jerseyNumber: number;
    }>;
    substitutes: Array<{
      id: string;
      playerId: string;
      name: string;
      position: string;
      jerseyNumber: number;
    }>;
  };
  homeFormation?: string;
  awayFormation?: string;
}

export interface MatchStats {
  id: string;
  matchId: string;
  possession: {
    home: number;
    away: number;
  };
  shots: {
    home: number;
    away: number;
  };
  shotsOnTarget: {
    home: number;
    away: number;
  };
  corners: {
    home: number;
    away: number;
  };
  fouls: {
    home: number;
    away: number;
  };
  offsides: {
    home: number;
    away: number;
  };
  updatedAt: Timestamp;
}
```

---

### 8-3. LineupField 컴포넌트

**파일**: `src/components/match/LineupField.tsx`

```typescript
interface LineupFieldProps {
  homeTeam: {
    name: string;
    starters: Array<{
      position: string;
      jerseyNumber: number;
      name: string;
    }>;
  };
  awayTeam: {
    name: string;
    starters: Array<{
      position: string;
      jerseyNumber: number;
      name: string;
    }>;
  };
  homeFormation?: string;
  awayFormation?: string;
}

export function LineupField({
  homeTeam,
  awayTeam,
  homeFormation,
  awayFormation,
}: LineupFieldProps) {
  // 포메이션 파싱 (예: "4-4-2" → [4, 4, 2])
  const parseFormation = (formation?: string) => {
    if (!formation) return null;
    return formation.split("-").map(Number);
  };

  const homeFormationArray = parseFormation(homeFormation);
  const awayFormationArray = parseFormation(awayFormation);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 text-center text-sm font-semibold text-slate-600">
        포메이션
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* 홈팀 */}
        <div>
          <div className="mb-2 text-center text-sm font-semibold text-slate-900">
            {homeTeam.name}
          </div>
          {homeFormationArray && (
            <div className="mb-2 text-center text-xs text-slate-500">
              {homeFormation}
            </div>
          )}
          <div className="relative h-64 rounded-lg bg-gradient-to-b from-emerald-50 to-emerald-100">
            {/* 간단한 포메이션 시각화 */}
            <div className="absolute inset-0 flex flex-col justify-around p-4">
              {homeFormationArray?.map((count, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex justify-center gap-2"
                >
                  {Array.from({ length: count }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center text-xs font-bold"
                    >
                      {homeTeam.starters[rowIndex * count + i]?.jerseyNumber || ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 원정팀 */}
        <div>
          <div className="mb-2 text-center text-sm font-semibold text-slate-900">
            {awayTeam.name}
          </div>
          {awayFormationArray && (
            <div className="mb-2 text-center text-xs text-slate-500">
              {awayFormation}
            </div>
          )}
          <div className="relative h-64 rounded-lg bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="absolute inset-0 flex flex-col justify-around p-4">
              {awayFormationArray?.map((count, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex justify-center gap-2"
                >
                  {Array.from({ length: count }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center text-xs font-bold"
                    >
                      {awayTeam.starters[rowIndex * count + i]?.jerseyNumber || ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1: Match Center 기본 (MVP)
- [ ] `MatchPage` 컴포넌트 생성
- [ ] `MatchHeader` 구현
- [ ] `MatchTabs` 구현
- [ ] `MatchOverviewTab` 구현
- [ ] `MatchTimelineTab` 구현
- [ ] 데이터 서비스 함수 작성

### Phase 2: 확장 기능
- [ ] `MatchLineupTab` 구현
- [ ] `MatchStatsTab` 구현
- [ ] `MatchMediaTab` 구현 (기존 MediaGallery 활용)
- [ ] `MatchCommentsTab` 구현 (기존 CommentDialog 활용)

### Phase 3: 실시간 기능
- [ ] Live Match 업데이트
- [ ] Real-time Timeline
- [ ] Live Score 업데이트

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
