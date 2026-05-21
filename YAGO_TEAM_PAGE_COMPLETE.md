# ⚽ YAGO Team Page - 완전한 설계

> **작성일**: 2024년  
> **목적**: 팀 홈페이지 + 선수 + 경기 + 통계 - 플랫폼에서 가장 트래픽이 많은 페이지

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [라우팅 구조](#2-라우팅-구조)
3. [전체 레이아웃](#3-전체-레이아웃)
4. [Hero Section](#4-hero-section)
5. [주요 섹션](#5-주요-섹션)
6. [팀 관리 페이지](#6-팀-관리-페이지)
7. [DB 구조](#7-db-구조)
8. [React 구현](#8-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
팀 = 미니 클럽 홈페이지
```

### 핵심 기능

```
✓ 팀 소개 및 정보
✓ 선수 명단 및 프로필
✓ 경기 일정 및 결과
✓ 통계 및 기록
✓ 팀 공지사항
✓ 팀 갤러리
✓ 팀 관리 (팀장/관리자)
```

### URL 구조

```
/sports/teams/{teamSlug}
```

예: `/sports/teams/nowon-fc`

---

## 2️⃣ 라우팅 구조

### 전체 라우팅

```
/sports/teams/{teamSlug}
 ├─ / (Team Home)
 ├─ /players (선수 명단)
 ├─ /matches (경기 일정/결과)
 ├─ /stats (통계)
 ├─ /notices (공지사항)
 ├─ /gallery (갤러리)
 └─ /manage (팀 관리 - 팀장/관리자만)
```

---

## 3️⃣ 전체 레이아웃

### 레이아웃 구조

```
┌─────────────────────────────────────┐
│  Team Header (로고, 이름, 지역)     │
├─────────────────────────────────────┤
│  Team Tabs                          │
│  [홈] [선수] [경기] [통계] [공지]  │
├─────────────────────────────────────┤
│                                     │
│  Main Content                       │
│                                     │
│  - Hero Section                     │
│  - Quick Stats                      │
│  - Recent Matches                   │
│  - Players                          │
│  - Upcoming Matches                 │
│                                     │
└─────────────────────────────────────┘
```

---

## 4️⃣ Hero Section

### Hero 컴포넌트

```typescript
// src/components/team/TeamHero.tsx
import Image from "next/image";
import { MapPin, Users, Trophy, Calendar } from "lucide-react";

interface TeamHeroProps {
  team: {
    id: string;
    name: string;
    logoUrl?: string;
    region: string;
    playerCount: number;
    leagueCount: number;
    nextMatch?: {
      date: Date;
      opponent: string;
    };
  };
}

export function TeamHero({ team }: TeamHeroProps) {
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          {/* Team Logo */}
          <div className="flex-shrink-0">
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={120}
                height={120}
                className="rounded-lg bg-white p-2"
              />
            ) : (
              <div className="w-30 h-30 rounded-lg bg-white/20 flex items-center justify-center">
                <Users className="w-16 h-16 text-white" />
              </div>
            )}
          </div>

          {/* Team Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{team.name}</h1>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{team.region}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>선수 {team.playerCount}명</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                <span>리그 {team.leagueCount}개</span>
              </div>
            </div>
            {team.nextMatch && (
              <div className="mt-4 p-4 bg-white/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>
                    다음 경기: {team.nextMatch.date.toLocaleDateString()} vs{" "}
                    {team.nextMatch.opponent}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5️⃣ 주요 섹션

### 5.1 Quick Stats

```typescript
// src/components/team/QuickStats.tsx
import { Card } from "@/components/shared/Card";
import { Trophy, Target, TrendingUp } from "lucide-react";

export function QuickStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary-600" />
          <div>
            <p className="text-sm text-gray-600">승률</p>
            <p className="text-2xl font-bold">{stats.winRate}%</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-sm text-gray-600">총 득점</p>
            <p className="text-2xl font-bold">{stats.totalGoals}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">순위</p>
            <p className="text-2xl font-bold">{stats.rank}위</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-purple-600" />
          <div>
            <p className="text-sm text-gray-600">경기 수</p>
            <p className="text-2xl font-bold">{stats.matchCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

### 5.2 Recent Matches

```typescript
// src/components/team/RecentMatches.tsx
import { Card } from "@/components/shared/Card";
import { MatchCard } from "@/components/matches/MatchCard";

export function RecentMatches({ matches }: { matches: any[] }) {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 경기</h2>
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </Card>
  );
}
```

### 5.3 Players Section

```typescript
// src/components/team/PlayersSection.tsx
import { Card } from "@/components/shared/Card";
import { PlayerCard } from "@/components/players/PlayerCard";

export function PlayersSection({ players }: { players: any[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">선수 명단</h2>
        <Button variant="outline" size="sm">
          전체 보기
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </Card>
  );
}
```

### 5.4 Upcoming Matches

```typescript
// src/components/team/UpcomingMatches.tsx
import { Card } from "@/components/shared/Card";
import { Calendar } from "lucide-react";

export function UpcomingMatches({ matches }: { matches: any[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">다가오는 경기</h2>
      </div>
      <div className="space-y-3">
        {matches.map((match) => (
          <div
            key={match.id}
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {match.date.toLocaleDateString()} {match.time}
                </p>
                <p className="text-gray-600 mt-1">
                  vs {match.opponent} @ {match.venue}
                </p>
              </div>
              <Button variant="outline" size="sm">
                상세 보기
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

---

## 6️⃣ 팀 관리 페이지

### Team Manage Page

```typescript
// src/app/sports/teams/[slug]/manage/page.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/shared/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/Tabs";
import { TeamInfoForm } from "@/components/team/TeamInfoForm";
import { TeamPlayersManage } from "@/components/team/TeamPlayersManage";
import { TeamMatchesManage } from "@/components/team/TeamMatchesManage";
import { TeamSettings } from "@/components/team/TeamSettings";

export default function TeamManagePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">팀 관리</h1>
      
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">팀 정보</TabsTrigger>
          <TabsTrigger value="players">선수 관리</TabsTrigger>
          <TabsTrigger value="matches">경기 관리</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info">
          <TeamInfoForm />
        </TabsContent>
        
        <TabsContent value="players">
          <TeamPlayersManage />
        </TabsContent>
        
        <TabsContent value="matches">
          <TeamMatchesManage />
        </TabsContent>
        
        <TabsContent value="settings">
          <TeamSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 7️⃣ DB 구조

### Firestore 구조

```typescript
teams/{teamId}
 ├─ name: string
 ├─ slug: string
 ├─ logoUrl?: string
 ├─ region: string
 ├─ description?: string
 ├─ managerId: string
 ├─ createdAt: Timestamp
 │
 ├─ players/{playerId}
 │   ├─ name: string
 │   ├─ position: string
 │   ├─ jerseyNumber: number
 │   └─ ...
 │
 ├─ matches/{matchId}
 │   ├─ date: Timestamp
 │   ├─ opponent: string
 │   ├─ result?: string
 │   └─ ...
 │
 ├─ stats
 │   ├─ wins: number
 │   ├─ draws: number
 │   ├─ losses: number
 │   ├─ goalsFor: number
 │   └─ goalsAgainst: number
 │
 └─ notices/{noticeId}
     ├─ title: string
     ├─ content: string
     └─ ...
```

---

## 8️⃣ React 구현

### Team Page

```typescript
// src/app/sports/teams/[slug]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { TeamHero } from "@/components/team/TeamHero";
import { TeamTabs } from "@/components/team/TeamTabs";
import { QuickStats } from "@/components/team/QuickStats";
import { RecentMatches } from "@/components/team/RecentMatches";
import { PlayersSection } from "@/components/team/PlayersSection";
import { UpcomingMatches } from "@/components/team/UpcomingMatches";

export default function TeamPage() {
  const params = useParams();
  const teamSlug = params.slug as string;

  // 데이터 페칭
  const team = {
    id: "1",
    name: "노원FC",
    logoUrl: "/logos/nowon-fc.png",
    region: "서울 노원구",
    playerCount: 24,
    leagueCount: 2,
    nextMatch: {
      date: new Date("2026-03-20"),
      opponent: "강북FC",
    },
  };

  const stats = {
    winRate: 65,
    totalGoals: 42,
    rank: 3,
    matchCount: 20,
  };

  const recentMatches = [];
  const players = [];
  const upcomingMatches = [];

  return (
    <div className="min-h-screen bg-gray-50">
      <TeamHero team={team} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamTabs teamSlug={teamSlug} />
        
        <div className="mt-8 space-y-6">
          <QuickStats stats={stats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentMatches matches={recentMatches} />
            <UpcomingMatches matches={upcomingMatches} />
          </div>
          <PlayersSection players={players} />
        </div>
      </div>
    </div>
  );
}
```

### TeamTabs 컴포넌트

```typescript
// src/components/team/TeamTabs.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Users, Calendar, BarChart, Megaphone } from "lucide-react";

const tabs = [
  { icon: Home, label: "홈", path: "" },
  { icon: Users, label: "선수", path: "/players" },
  { icon: Calendar, label: "경기", path: "/matches" },
  { icon: BarChart, label: "통계", path: "/stats" },
  { icon: Megaphone, label: "공지", path: "/notices" },
];

export function TeamTabs({ teamSlug }: { teamSlug: string }) {
  const pathname = usePathname();
  const basePath = `/sports/teams/${teamSlug}`;

  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const href = `${basePath}${tab.path}`;
          const isActive = pathname === href || (tab.path === "" && pathname === basePath);
          
          return (
            <Link
              key={tab.path}
              href={href}
              className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-colors ${
                isActive
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

---

## ✅ Team Page 완료

### 완성된 내용

- ✅ 전체 레이아웃 구조
- ✅ Hero Section
- ✅ Quick Stats
- ✅ Recent Matches
- ✅ Players Section
- ✅ Upcoming Matches
- ✅ 팀 관리 페이지
- ✅ DB 구조
- ✅ React 구현 코드

### 플랫폼 완성도

이제 YAGO 플랫폼 구조는:

```
Sports Hub (/sports)
  └─ Team Directory
  └─ Team Page (/sports/teams/{slug})

Federation Hub (/federations)
  └─ Federation Home (/federations/{slug})
  └─ Federation Admin (/federations/{slug}/admin)
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO Team Page 완전한 설계 완료
