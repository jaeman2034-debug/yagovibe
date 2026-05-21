# 🔍 YAGO Sports Page Redesign - 팀 탐색 플랫폼

> **작성일**: 2024년  
> **목적**: `/sports` 페이지를 관리 대시보드에서 팀 탐색 플랫폼으로 확장

---

## 📋 목차

1. [현재 상태 분석](#1-현재-상태-분석)
2. [새로운 구조](#2-새로운-구조)
3. [검색 및 필터](#3-검색-및-필터)
4. [팀 카드 디자인](#4-팀-카드-디자인)
5. [React 구현](#5-react-구현)

---

## 1️⃣ 현재 상태 분석

### 현재 `/sports` 페이지

```
스포츠 활동
├─ 이벤트
├─ 선수
├─ 통계
├─ 대회
├─ 유소년
└─ 아카데미
```

**역할**: 관리 메뉴 대시보드

### 변경 목표

```
팀 탐색 플랫폼
├─ 검색 및 필터
├─ 추천 팀 섹션
├─ 팀 그리드
├─ 팀 생성 (FAB)
└─ 관리 메뉴 (하위 메뉴)
```

**역할**: 팀 탐색 + 생성 + 참여 허브

---

## 2️⃣ 새로운 구조

### 페이지 레이아웃

```
┌─────────────────────────────────────┐
│  Header                             │
├─────────────────────────────────────┤
│  Hero Section                       │
│  "스포츠 팀 허브"                   │
├─────────────────────────────────────┤
│  Search Bar + Filters               │
├─────────────────────────────────────┤
│  🔥 인기 팀                         │
│  [팀 카드] [팀 카드] [팀 카드]     │
├─────────────────────────────────────┤
│  ⚽ 최근 등록 팀                     │
│  [팀 카드] [팀 카드] [팀 카드]     │
├─────────────────────────────────────┤
│  🏆 대회 참가 팀                     │
│  [팀 카드] [팀 카드] [팀 카드]     │
├─────────────────────────────────────┤
│  관리 메뉴 (접을 수 있는 섹션)      │
│  [이벤트] [선수] [통계] [대회]     │
└─────────────────────────────────────┘
```

---

## 3️⃣ 검색 및 필터

### Search Bar 컴포넌트

```typescript
// src/components/sports/TeamSearchBar.tsx
"use client";

import { Search, Filter, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/shared/Input";
import { Button } from "@/components/shared/Button";
import { Select } from "@/components/shared/Select";

export function TeamSearchBar({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    region: string;
    sportType: string;
    category: string;
  };
  onFilterChange: (filters: any) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      {/* Search Input */}
      <div className="flex items-center gap-3 mb-4">
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
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          필터
        </Button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex items-center gap-3 pt-4 border-t">
          <Select
            placeholder="지역"
            options={[
              { value: "", label: "전체 지역" },
              { value: "seoul", label: "서울" },
              { value: "gyeonggi", label: "경기" },
              { value: "busan", label: "부산" },
            ]}
            value={filters.region}
            onChange={(value) =>
              onFilterChange({ ...filters, region: value })
            }
            className="flex-1"
          />
          <Select
            placeholder="종목"
            options={[
              { value: "", label: "전체 종목" },
              { value: "football", label: "축구" },
              { value: "basketball", label: "농구" },
              { value: "baseball", label: "야구" },
            ]}
            value={filters.sportType}
            onChange={(value) =>
              onFilterChange({ ...filters, sportType: value })
            }
            className="flex-1"
          />
          <Select
            placeholder="연령"
            options={[
              { value: "", label: "전체" },
              { value: "youth", label: "유소년" },
              { value: "adult", label: "성인" },
              { value: "amateur", label: "아마추어" },
            ]}
            value={filters.category}
            onChange={(value) =>
              onFilterChange({ ...filters, category: value })
            }
            className="flex-1"
          />
          <Button
            variant="ghost"
            onClick={() => {
              onFilterChange({ region: "", sportType: "", category: "" });
              setShowFilters(false);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 4️⃣ 팀 카드 디자인

### TeamCard 컴포넌트

```typescript
// src/components/teams/TeamCard.tsx
"use client";

import Link from "react-router-dom";
import { Users, MapPin, Trophy } from "lucide-react";
import { Card } from "@/components/shared/Card";

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
    <Link to={`/sports/teams/${team.slug}`}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>

          {/* Team Info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {team.name}
            </h3>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-3">
              <MapPin className="w-4 h-4" />
              <span>{team.region}</span>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-3">
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

            {/* Category Badge */}
            {team.category && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded mb-3">
                {team.category}
              </span>
            )}

            {/* View Button */}
            <div className="mt-4">
              <span className="text-primary-600 font-medium text-sm">
                팀 보기 →
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

---

## 5️⃣ React 구현

### Sports Page Redesign

```typescript
// src/pages/sports/SportsActivityPage.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "@/layout/Header";
import { TeamSearchBar } from "@/components/sports/TeamSearchBar";
import { TeamCard } from "@/components/teams/TeamCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SportsModuleCard } from "@/components/sports/SportsModuleCard";
import FabMenu from "@/components/shared/FabMenu";
import {
  TrendingUp,
  Clock,
  Trophy,
  GraduationCap,
  Users,
  Calendar,
  User,
  BarChart,
  Medal,
  Building2,
} from "lucide-react";

export default function SportsActivityPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    region: "",
    sportType: "",
    category: "",
  });
  const [popularTeams, setPopularTeams] = useState<any[]>([]);
  const [recentTeams, setRecentTeams] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [youthTeams, setYouthTeams] = useState<any[]>([]);
  const [showManagementMenu, setShowManagementMenu] = useState(false);

  useEffect(() => {
    // 섹션별 팀 조회
    const loadTeams = async () => {
      try {
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
      } catch (error) {
        console.error("Failed to load teams:", error);
      }
    };
    loadTeams();
  }, []);

  // 관리 메뉴 모듈 (기존 구조 유지)
  const managementModules = [
    {
      title: "이벤트",
      description: "팀 이벤트 관리",
      icon: <Calendar className="w-8 h-8" />,
      links: [
        { label: "이벤트 목록", href: "/sports/events" },
        { label: "이벤트 생성", href: "/sports/events/create" },
      ],
      iconColor: "text-orange-600",
    },
    {
      title: "선수",
      description: "선수 관리",
      icon: <User className="w-8 h-8" />,
      links: [
        { label: "선수 목록", href: "/sports/players" },
        { label: "선수 등록", href: "/sports/players/register" },
      ],
      iconColor: "text-blue-600",
    },
    {
      title: "통계",
      description: "경기 통계 및 분석",
      icon: <BarChart className="w-8 h-8" />,
      links: [
        { label: "통계 대시보드", href: "/sports/stats" },
        { label: "경기 기록", href: "/sports/stats/matches" },
      ],
      iconColor: "text-purple-600",
    },
    {
      title: "대회",
      description: "대회 관리",
      icon: <Medal className="w-8 h-8" />,
      links: [
        { label: "대회 목록", href: "/sports/tournaments" },
        { label: "대회 생성", href: "/sports/tournaments/create" },
      ],
      iconColor: "text-yellow-600",
    },
    {
      title: "유소년",
      description: "유소년 팀 관리",
      icon: <GraduationCap className="w-8 h-8" />,
      links: [
        { label: "유소년 팀", href: "/sports/youth" },
        { label: "아카데미", href: "/sports/youth/academy" },
      ],
      iconColor: "text-green-600",
    },
    {
      title: "협회",
      description: "협회 탐색",
      icon: <Building2 className="w-8 h-8" />,
      links: [
        { label: "협회 목록", href: "/federations" },
        { label: "협회 생성", href: "/platform/federations/create" },
      ],
      iconColor: "text-indigo-600",
    },
  ];

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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <TeamSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFilterChange={setFilters}
        />

        {/* 인기 팀 */}
        <SectionHeader
          icon={<TrendingUp className="w-5 h-5" />}
          title="🔥 인기 팀"
          subtitle="가장 많이 조회된 팀"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {popularTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 최근 등록 팀 */}
        <SectionHeader
          icon={<Clock className="w-5 h-5" />}
          title="⚽ 최근 등록 팀"
          subtitle="새로 가입한 팀"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {recentTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 대회 참가 팀 */}
        <SectionHeader
          icon={<Trophy className="w-5 h-5" />}
          title="🏆 대회 참가 팀"
          subtitle="현재 대회에 참가 중인 팀"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tournamentTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 유소년 팀 */}
        <SectionHeader
          icon={<GraduationCap className="w-5 h-5" />}
          title="🎓 유소년 팀"
          subtitle="유소년 전용 팀"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {youthTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        {/* 관리 메뉴 (접을 수 있는 섹션) */}
        <div className="mt-12">
          <button
            onClick={() => setShowManagementMenu(!showManagementMenu)}
            className="flex items-center justify-between w-full p-4 bg-white rounded-lg shadow mb-4"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              관리 메뉴
            </h2>
            <span className="text-gray-500">
              {showManagementMenu ? "접기" : "펼치기"}
            </span>
          </button>

          {showManagementMenu && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {managementModules.map((module, index) => (
                <SportsModuleCard
                  key={index}
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  links={module.links}
                  iconColor={module.iconColor}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <FabMenu />
    </div>
  );
}
```

---

## ✅ Sports Page Redesign 완료

### 완성된 내용

- ✅ Hero Section 추가
- ✅ 검색 및 필터 시스템
- ✅ 섹션별 팀 표시 (인기, 최근, 대회, 유소년)
- ✅ 팀 카드 디자인
- ✅ 관리 메뉴 (접을 수 있는 섹션)
- ✅ FAB 연결

### 페이지 구조

```
/sports
├─ Hero Section
├─ Search & Filter
├─ 인기 팀
├─ 최근 등록 팀
├─ 대회 참가 팀
├─ 유소년 팀
└─ 관리 메뉴 (접기/펼치기)
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO Sports Page Redesign 완료
