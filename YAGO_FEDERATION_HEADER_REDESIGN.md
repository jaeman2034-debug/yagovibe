# 🎨 YAGO Federation Header Redesign - 완전한 설계

> **작성일**: 2024년  
> **목적**: 노원구 축구협회 페이지 헤더 및 Hero 영역을 실제 서비스 수준으로 리디자인

---

## 📋 목차

1. [현재 문제 분석](#1-현재-문제-분석)
2. [리디자인 원칙](#2-리디자인-원칙)
3. [헤더 구조](#3-헤더-구조)
4. [Hero 영역](#4-hero-영역)
5. [React 구현](#5-react-구현)

---

## 1️⃣ 현재 문제 분석

### 현재 메뉴 구조

```
홈 | 협회소개 | 공지 | 대회/리그 | 경기일정 | 팀 | 순위 | 자료실 | 유소년 | 문의
```

**문제점**:
1. 메뉴 과다 (10개)
2. 기능/콘텐츠 혼합
3. 리그 플랫폼 느낌 부족
4. CTA 버튼 없음
5. Hero 영역 없음

---

## 2️⃣ 리디자인 원칙

### 핵심 원칙

```
리그 플랫폼 중심 구조
```

### 사용자 행동 우선순위

```
1. 리그 보기
2. 경기 보기
3. 팀 보기
4. 순위 보기
5. 공지 보기
```

### 메뉴 구조

```
주요 메뉴 (6개)
├─ 홈
├─ 리그
├─ 경기
├─ 팀
├─ 순위
└─ 공지

더보기 메뉴 (⋯)
├─ 협회소개
├─ 자료실
├─ 유소년
└─ 문의
```

---

## 3️⃣ 헤더 구조

### 헤더 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [로고]  노원구 축구협회                                 │
│                                                           │
│  🏠 홈  🏆 리그  ⚽ 경기  👥 팀  📊 순위  📢 공지  ⋯   │
│                                                           │
│                                    [팀 등록] [리그 참가] │
└─────────────────────────────────────────────────────────┘
```

### 헤더 컴포넌트

```typescript
// src/components/federation/FederationHeader.tsx
"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Trophy, 
  Calendar, 
  Users, 
  BarChart3, 
  Bell,
  MoreVertical,
  LogIn
} from "lucide-react";
import { Button } from "@/components/shared/Button";

interface FederationHeaderProps {
  federation: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    region: string;
  };
}

export function FederationHeader({ federation }: FederationHeaderProps) {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainMenuItems = [
    { path: `/federations/${federation.slug}`, label: "홈", icon: Home },
    { path: `/federations/${federation.slug}/leagues`, label: "리그", icon: Trophy },
    { path: `/federations/${federation.slug}/matches`, label: "경기", icon: Calendar },
    { path: `/federations/${federation.slug}/teams`, label: "팀", icon: Users },
    { path: `/federations/${federation.slug}/standings`, label: "순위", icon: BarChart3 },
    { path: `/federations/${federation.slug}/announcements`, label: "공지", icon: Bell },
  ];

  const moreMenuItems = [
    { path: `/federations/${federation.slug}/about`, label: "협회소개" },
    { path: `/federations/${federation.slug}/documents`, label: "자료실" },
    { path: `/federations/${federation.slug}/youth`, label: "유소년" },
    { path: `/federations/${federation.slug}/contact`, label: "문의" },
  ];

  const isActive = (path: string) => {
    if (path === `/federations/${federation.slug}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          {/* Logo & Name */}
          <Link 
            to={`/federations/${federation.slug}`}
            className="flex items-center gap-3"
          >
            {federation.logoUrl ? (
              <img
                src={federation.logoUrl}
                alt={federation.name}
                className="w-10 h-10 rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {federation.name}
              </h1>
              <p className="text-xs text-gray-500">{federation.region}</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive(item.path)
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    showMoreMenu
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <MoreVertical className="w-4 h-4" />
                <span>더보기</span>
              </button>

              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {moreMenuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMoreMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/sports/teams/create?federation=${federation.id}`}
            >
              팀 등록
            </Button>
            <Button
              size="sm"
              onClick={() => window.location.href = `/federations/${federation.slug}/leagues`}
            >
              리그 참가
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {showMoreMenu && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-1">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMoreMenu(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                      ${
                        isActive(item.path)
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-gray-200 pt-2 mt-2">
                {moreMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMoreMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.location.href = `/sports/teams/create?federation=${federation.id}`}
                >
                  팀 등록
                </Button>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => window.location.href = `/federations/${federation.slug}/leagues`}
                >
                  리그 참가
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
```

---

## 4️⃣ Hero 영역

### Hero 컴포넌트

```typescript
// src/components/federation/FederationHero.tsx
"use client";

import { Button } from "@/components/shared/Button";
import { Users, Trophy, Calendar, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";

interface FederationHeroProps {
  federation: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    region: string;
  };
  stats: {
    teamCount: number;
    playerCount: number;
    leagueCount: number;
    matchCount: number;
  };
}

export function FederationHero({ federation, stats }: FederationHeroProps) {
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left: Title & Description */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              {federation.logoUrl && (
                <img
                  src={federation.logoUrl}
                  alt={federation.name}
                  className="w-16 h-16 rounded-lg bg-white p-2"
                />
              )}
              <div>
                <h1 className="text-4xl font-bold mb-2">{federation.name}</h1>
                <p className="text-xl text-primary-100">
                  {federation.description || `${federation.region} 지역 축구 리그 운영`}
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => window.location.href = `/sports/teams/create?federation=${federation.id}`}
              >
                팀 등록
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-primary-700 hover:bg-gray-100"
                onClick={() => window.location.href = `/federations/${federation.slug}/leagues`}
              >
                리그 참가
              </Button>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
            <StatCard
              icon={<Users className="w-6 h-6" />}
              value={stats.teamCount}
              label="팀"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20"
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              value={stats.playerCount}
              label="선수"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20"
            />
            <StatCard
              icon={<Trophy className="w-6 h-6" />}
              value={stats.leagueCount}
              label="리그"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20"
            />
            <StatCard
              icon={<Calendar className="w-6 h-6" />}
              value={stats.matchCount}
              label="경기"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5️⃣ React 구현

### Federation Homepage 통합

```typescript
// src/pages/federations/[slug]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FederationHeader } from "@/components/federation/FederationHeader";
import { FederationHero } from "@/components/federation/FederationHero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { LeagueCard } from "@/components/leagues/LeagueCard";
import { MatchCard } from "@/components/matches/MatchCard";
import { StandingTable } from "@/components/standings/StandingTable";
import { TeamCard } from "@/components/teams/TeamCard";
import { Trophy, Calendar, BarChart3, Users } from "lucide-react";

export default function FederationHomePage() {
  const params = useParams();
  const federationSlug = params.federationId as string;

  const [federation, setFederation] = useState<any>(null);
  const [stats, setStats] = useState({
    teamCount: 0,
    playerCount: 0,
    leagueCount: 0,
    matchCount: 0,
  });
  const [leagues, setLeagues] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Federation 정보
      const fedResponse = await fetch(`/api/federations/${federationSlug}`);
      const fedData = await fedResponse.json();
      setFederation(fedData);

      // 통계
      const statsResponse = await fetch(`/api/federations/${federationSlug}/stats`);
      const statsData = await statsResponse.json();
      setStats(statsData);

      // 리그 목록
      const leaguesResponse = await fetch(`/api/federations/${federationSlug}/leagues?limit=3`);
      const leaguesData = await leaguesResponse.json();
      setLeagues(leaguesData);

      // 다가오는 경기
      const upcomingResponse = await fetch(`/api/federations/${federationSlug}/matches?status=scheduled&limit=5`);
      const upcomingData = await upcomingResponse.json();
      setUpcomingMatches(upcomingData);

      // 최근 경기 결과
      const recentResponse = await fetch(`/api/federations/${federationSlug}/matches?status=finished&limit=5`);
      const recentData = await recentResponse.json();
      setRecentMatches(recentData);

      // 순위 (TOP 5)
      const standingsResponse = await fetch(`/api/federations/${federationSlug}/standings?limit=5`);
      const standingsData = await standingsResponse.json();
      setStandings(standingsData);

      // 소속 팀
      const teamsResponse = await fetch(`/api/federations/${federationSlug}/teams?limit=6`);
      const teamsData = await teamsResponse.json();
      setTeams(teamsData);
    };
    loadData();
  }, [federationSlug]);

  if (!federation) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <FederationHeader federation={federation} />

      {/* Hero */}
      <FederationHero federation={federation} stats={stats} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 진행 중 리그 */}
        <SectionHeader
          icon={<Trophy className="w-5 h-5" />}
          title="진행 중 리그"
          subtitle="현재 진행 중인 리그"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>

        {/* 다가오는 경기 */}
        <SectionHeader
          icon={<Calendar className="w-5 h-5" />}
          title="다가오는 경기"
          subtitle="곧 시작되는 경기 일정"
          className="mb-6"
        />
        <div className="space-y-3 mb-12">
          {upcomingMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>

        {/* 최근 경기 결과 */}
        <SectionHeader
          icon={<Calendar className="w-5 h-5" />}
          title="최근 경기 결과"
          subtitle="최근 종료된 경기"
          className="mb-6"
        />
        <div className="space-y-3 mb-12">
          {recentMatches.map((match) => (
            <MatchCard key={match.id} match={match} showResult />
          ))}
        </div>

        {/* 순위 TOP 5 */}
        <SectionHeader
          icon={<BarChart3 className="w-5 h-5" />}
          title="리그 순위"
          subtitle="현재 리그 순위 TOP 5"
          className="mb-6"
        />
        <div className="mb-12">
          <StandingTable standings={standings} showTopOnly />
        </div>

        {/* 소속 팀 */}
        <SectionHeader
          icon={<Users className="w-5 h-5" />}
          title="소속 팀"
          subtitle="협회에 등록된 팀"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ Federation Header Redesign 완료

### 완성된 내용

- ✅ 헤더 메뉴 정리 (10개 → 6개)
- ✅ 더보기 메뉴 (⋯) 추가
- ✅ CTA 버튼 추가 (팀 등록, 리그 참가)
- ✅ Hero 영역 추가
- ✅ 통계 카드 표시
- ✅ 반응형 디자인
- ✅ 모바일 메뉴
- ✅ React 구현 코드

### 개선 효과

**Before**:
- 메뉴 과다
- CMS 느낌
- CTA 없음
- Hero 없음

**After**:
- 메뉴 정리 (6개)
- 리그 플랫폼 느낌
- CTA 버튼 명확
- Hero 영역으로 브랜딩 강화

---

**작성일**: 2024년  
**상태**: ✅ YAGO Federation Header Redesign 완료
