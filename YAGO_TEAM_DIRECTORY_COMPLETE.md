# 🔍 YAGO Team Directory - 완전한 설계

> **작성일**: 2024년  
> **목적**: 팀 탐색 플랫폼 - 팀, 선수, 협회, 리그가 서로 연결된 스포츠 네트워크

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [전체 구조](#2-전체-구조)
3. [검색 및 필터](#3-검색-및-필터)
4. [팀 카드 디자인](#4-팀-카드-디자인)
5. [팀 상세 페이지](#5-팀-상세-페이지)
6. [React 구현](#6-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
팀 탐색 플랫폼 - 팀, 선수, 협회, 리그가 서로 연결된 스포츠 네트워크
```

### 핵심 기능

```
✓ 팀 검색 및 필터
✓ 지역별 팀 탐색
✓ 종목별 팀 탐색
✓ 협회별 팀 탐색
✓ 팀 상세 정보
✓ 팀 비교
```

### URL 구조

```
/sports
```

또는

```
/sports/teams
```

---

## 2️⃣ 전체 구조

### 페이지 레이아웃

```
┌─────────────────────────────────────┐
│  Search Bar (검색 + 필터)           │
├─────────────────────────────────────┤
│  Filter Tabs                        │
│  [전체] [지역] [종목] [협회]        │
├─────────────────────────────────────┤
│                                     │
│  Team Grid                          │
│  [팀 카드] [팀 카드] [팀 카드]     │
│  [팀 카드] [팀 카드] [팀 카드]     │
│                                     │
└─────────────────────────────────────┘
```

### 섹션 구성

```typescript
const sections = [
  {
    title: "🔥 인기 팀",
    query: { sortBy: "popular", limit: 6 },
  },
  {
    title: "⚽ 최근 등록 팀",
    query: { sortBy: "recent", limit: 6 },
  },
  {
    title: "🏆 대회 참가 팀",
    query: { hasActiveLeague: true, limit: 6 },
  },
  {
    title: "🎓 유소년 팀",
    query: { category: "youth", limit: 6 },
  },
];
```

---

## 3️⃣ 검색 및 필터

### Search Bar

```typescript
// src/components/teams/TeamSearchBar.tsx
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/shared/Input";
import { Button } from "@/components/shared/Button";

export function TeamSearchBar({
  searchQuery,
  onSearchChange,
  onFilterClick,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="팀명, 지역, 종목으로 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={onFilterClick}>
          <Filter className="w-4 h-4 mr-2" />
          필터
        </Button>
      </div>
    </div>
  );
}
```

### Filter Panel

```typescript
// src/components/teams/TeamFilterPanel.tsx
import { Card } from "@/components/shared/Card";
import { Select } from "@/components/shared/Select";
import { CheckboxGroup, Checkbox } from "@/components/shared/Checkbox";

export function TeamFilterPanel({
  filters,
  onFilterChange,
}: {
  filters: any;
  onFilterChange: (filters: any) => void;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <Select
          label="지역"
          options={[
            { value: "seoul", label: "서울" },
            { value: "gyeonggi", label: "경기" },
            { value: "busan", label: "부산" },
          ]}
          value={filters.region}
          onChange={(value) =>
            onFilterChange({ ...filters, region: value })
          }
        />

        <Select
          label="종목"
          options={[
            { value: "football", label: "축구" },
            { value: "basketball", label: "농구" },
            { value: "baseball", label: "야구" },
          ]}
          value={filters.sportType}
          onChange={(value) =>
            onFilterChange({ ...filters, sportType: value })
          }
        />

        <CheckboxGroup
          label="카테고리"
          value={filters.categories}
          onChange={(values) =>
            onFilterChange({ ...filters, categories: values })
          }
        >
          <Checkbox value="youth">유소년</Checkbox>
          <Checkbox value="adult">성인</Checkbox>
          <Checkbox value="amateur">아마추어</Checkbox>
        </CheckboxGroup>
      </div>
    </Card>
  );
}
```

---

## 4️⃣ 팀 카드 디자인

### TeamCard 컴포넌트

```typescript
// src/components/teams/TeamCard.tsx
import { Card } from "@/components/shared/Card";
import { Users, MapPin, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    region: string;
    playerCount: number;
    activeLeagueCount: number;
    category?: string;
  };
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={`/sports/teams/${team.slug}`}>
      <Card hover className="cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Team Logo */}
          <div className="flex-shrink-0">
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={64}
                height={64}
                className="rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {team.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{team.region}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>선수 {team.playerCount}명</span>
              </div>
              {team.activeLeagueCount > 0 && (
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  <span>리그 {team.activeLeagueCount}개</span>
                </div>
              )}
            </div>
            {team.category && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                {team.category}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

---

## 5️⃣ 팀 상세 페이지

### 팀 페이지 구조

```typescript
// src/pages/sports/teams/[slug]/page.tsx
"use client";

import { useParams } from "react-router-dom";
import { TeamHero } from "@/components/team/TeamHero";
import { TeamTabs } from "@/components/team/TeamTabs";
import { QuickStats } from "@/components/team/QuickStats";
import { ParticipatingLeagues } from "@/components/team/ParticipatingLeagues";
import { RecentMatches } from "@/components/team/RecentMatches";
import { PlayersSection } from "@/components/team/PlayersSection";

export default function TeamPage() {
  const params = useParams();
  const teamSlug = params.slug as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <TeamHero team={team} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamTabs teamSlug={teamSlug} />
        
        <div className="mt-8 space-y-6">
          <QuickStats stats={stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ParticipatingLeagues leagues={leagues} />
            <RecentMatches matches={matches} />
          </div>
          
          <PlayersSection players={players} />
        </div>
      </div>
    </div>
  );
}
```

---

## 6️⃣ React 구현

### Team Directory Page

```typescript
// src/pages/sports/teams/page.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "@/layout/Header";
import { TeamSearchBar } from "@/components/teams/TeamSearchBar";
import { TeamFilterPanel } from "@/components/teams/TeamFilterPanel";
import { TeamCard } from "@/components/teams/TeamCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TrendingUp, Clock, Trophy, GraduationCap } from "lucide-react";
import FabMenu from "@/components/shared/FabMenu";

export default function TeamDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    region: "",
    sportType: "",
    categories: [] as string[],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [popularTeams, setPopularTeams] = useState<any[]>([]);
  const [recentTeams, setRecentTeams] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [youthTeams, setYouthTeams] = useState<any[]>([]);

  useEffect(() => {
    // 팀 목록 조회
    const loadTeams = async () => {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: searchQuery,
          ...filters,
        }),
      });
      const data = await response.json();
      setTeams(data);
    };
    loadTeams();
  }, [searchQuery, filters]);

  useEffect(() => {
    // 섹션별 팀 조회
    const loadSectionTeams = async () => {
      // 인기 팀
      const popular = await fetch("/api/teams?sortBy=popular&limit=6");
      setPopularTeams(await popular.json());

      // 최근 등록 팀
      const recent = await fetch("/api/teams?sortBy=recent&limit=6");
      setRecentTeams(await recent.json());

      // 대회 참가 팀
      const tournament = await fetch(
        "/api/teams?hasActiveLeague=true&limit=6"
      );
      setTournamentTeams(await tournament.json());

      // 유소년 팀
      const youth = await fetch("/api/teams?category=youth&limit=6");
      setYouthTeams(await youth.json());
    };
    loadSectionTeams();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">스포츠 팀 허브</h1>
          <p className="text-xl text-primary-100">
            지역 스포츠 팀을 찾고 연결하세요
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <TeamSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setShowFilters(!showFilters)}
        />
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <TeamFilterPanel
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 인기 팀 */}
        <SectionHeader
          icon={<TrendingUp className="w-5 h-5" />}
          title="🔥 인기 팀"
          subtitle="가장 많이 조회된 팀"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {popularTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 최근 등록 팀 */}
        <SectionHeader
          icon={<Clock className="w-5 h-5" />}
          title="⚽ 최근 등록 팀"
          subtitle="새로 가입한 팀"
          className="mt-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {recentTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 대회 참가 팀 */}
        <SectionHeader
          icon={<Trophy className="w-5 h-5" />}
          title="🏆 대회 참가 팀"
          subtitle="현재 대회에 참가 중인 팀"
          className="mt-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {tournamentTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 유소년 팀 */}
        <SectionHeader
          icon={<GraduationCap className="w-5 h-5" />}
          title="🎓 유소년 팀"
          subtitle="유소년 전용 팀"
          className="mt-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {youthTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </div>

      {/* FAB */}
      <FabMenu />
    </div>
  );
}
```

---

## ✅ Team Directory 완료

### 완성된 내용

- ✅ 검색 및 필터 시스템
- ✅ 섹션별 팀 표시 (인기, 최근, 대회, 유소년)
- ✅ 팀 카드 디자인
- ✅ 팀 상세 페이지 연결
- ✅ React 구현 코드

### 플랫폼 완성도

이제 YAGO는:

```
Sports Social Platform
  └─ 팀 디렉토리 ✅
  └─ 팀 홈페이지 ✅

League Operating System
  └─ 리그 자동 운영 ✅

Federation Platform
  └─ 협회 홈페이지 ✅
  └─ 협회 관리자 ✅

Team Join Flow
  └─ 리그 참가 시스템 ✅
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO Team Directory 완전한 설계 완료
