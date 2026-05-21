# 🏛️ YAGO Federation Public Homepage - 완전한 설계

> **작성일**: 2024년  
> **목적**: 노원구 축구협회 실제 홈페이지 UI - 협회 자동 생성 후 표시되는 공개 홈페이지

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [라우팅 구조](#2-라우팅-구조)
3. [전체 레이아웃](#3-전체-레이아웃)
4. [Hero Section](#4-hero-section)
5. [주요 섹션](#5-주요-섹션)
6. [React 구현](#6-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
협회 공개 홈페이지 - 협회 소개, 공지, 대회, 경기, 순위, 팀을 한 페이지에
```

### 핵심 기능

```
✓ 협회 소개 및 정보
✓ 공지사항
✓ 진행중 대회
✓ 경기 일정 및 결과
✓ 순위표
✓ 참가 팀 목록
✓ 후원사
✓ AI 도우미
```

### URL 구조

```
/federations/{slug}
```

예: `/federations/nowon-football`

---

## 2️⃣ 라우팅 구조

### 전체 라우팅

```
/federations/{slug}
 ├─ / (Federation Home)
 ├─ /about (협회소개)
 ├─ /notices (공지사항)
 ├─ /tournaments (대회)
 ├─ /matches (경기)
 ├─ /standings (순위)
 ├─ /clubs (팀)
 ├─ /docs (자료실)
 ├─ /sponsors (후원사)
 └─ /contact (문의)
```

---

## 3️⃣ 전체 레이아웃

### 레이아웃 구조

```
┌─────────────────────────────────────┐
│  Federation Header (로고, 이름)    │
├─────────────────────────────────────┤
│  Navigation Tabs                    │
│  [홈] [소개] [공지] [대회] [경기]  │
├─────────────────────────────────────┤
│                                     │
│  Hero Section                       │
│  - 협회 이름                        │
│  - 한 줄 소개                       │
│  - 대표 배너 문구                   │
│                                     │
│  Main Content                       │
│  - 공지사항 (최신 3개)              │
│  - 진행중 대회                      │
│  - 오늘 경기                        │
│  - 현재 순위                        │
│  - 참가 팀                          │
│  - 후원사                           │
│                                     │
└─────────────────────────────────────┘
```

---

## 4️⃣ Hero Section

### Hero 컴포넌트

```typescript
// src/components/federation/FederationHero.tsx
import Image from "next/image";
import { MapPin, Trophy, Users, Calendar } from "lucide-react";

interface FederationHeroProps {
  federation: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    tagline: string;
    bannerText?: string;
    region: string;
    sportType: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export function FederationHero({ federation }: FederationHeroProps) {
  return (
    <div
      className="text-white py-16"
      style={{
        background: `linear-gradient(135deg, ${federation.primaryColor} 0%, ${federation.secondaryColor} 100%)`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          {/* Federation Logo */}
          <div className="flex-shrink-0">
            {federation.logoUrl ? (
              <Image
                src={federation.logoUrl}
                alt={federation.name}
                width={120}
                height={120}
                className="rounded-lg bg-white p-2"
              />
            ) : (
              <div className="w-30 h-30 rounded-lg bg-white/20 flex items-center justify-center">
                <Trophy className="w-16 h-16 text-white" />
              </div>
            )}
          </div>

          {/* Federation Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{federation.name}</h1>
            <p className="text-xl text-white/90 mb-4">{federation.tagline}</p>
            {federation.bannerText && (
              <p className="text-lg text-white/80">{federation.bannerText}</p>
            )}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{federation.region}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                <span>{getSportLabel(federation.sportType)}</span>
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

## 5️⃣ 주요 섹션

### 5.1 공지사항 섹션

```typescript
// src/components/federation/NoticesSection.tsx
import { Card } from "@/components/shared/Card";
import { NoticeCard } from "@/components/federation/NoticeCard";
import { Megaphone } from "lucide-react";

export function NoticesSection({ notices }: { notices: any[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">공지사항</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/notices")}>
          전체 보기
        </Button>
      </div>
      <div className="space-y-3">
        {notices.slice(0, 3).map((notice) => (
          <NoticeCard key={notice.id} notice={notice} />
        ))}
      </div>
    </Card>
  );
}
```

### 5.2 진행중 대회 섹션

```typescript
// src/components/federation/ActiveTournamentsSection.tsx
import { Card } from "@/components/shared/Card";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { Trophy } from "lucide-react";

export function ActiveTournamentsSection({ tournaments }: { tournaments: any[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">진행중 대회</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/tournaments")}>
          전체 보기
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </Card>
  );
}
```

### 5.3 오늘 경기 섹션

```typescript
// src/components/federation/TodayMatchesSection.tsx
import { Card } from "@/components/shared/Card";
import { MatchCard } from "@/components/matches/MatchCard";
import { Calendar } from "lucide-react";

export function TodayMatchesSection({ matches }: { matches: any[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">오늘 경기</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/matches")}>
          전체 보기
        </Button>
      </div>
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </Card>
  );
}
```

### 5.4 현재 순위 섹션

```typescript
// src/components/federation/CurrentStandingsSection.tsx
import { Card } from "@/components/shared/Card";
import { StandingTable } from "@/components/shared/StandingTable";
import { BarChart } from "lucide-react";

export function CurrentStandingsSection({ standings }: { standings: any[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">현재 순위</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/standings")}>
          전체 보기
        </Button>
      </div>
      <StandingTable standings={standings.slice(0, 10)} />
    </Card>
  );
}
```

### 5.5 참가 팀 섹션

```typescript
// src/components/federation/ParticipatingTeamsSection.tsx
import { Card } from "@/components/shared/Card";
import { TeamCard } from "@/components/teams/TeamCard";
import { Users } from "lucide-react";

export function ParticipatingTeamsSection({ teams }: { teams: any[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">참가 팀</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/clubs")}>
          전체 보기
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </Card>
  );
}
```

### 5.6 후원사 섹션

```typescript
// src/components/federation/SponsorsSection.tsx
import { Card } from "@/components/shared/Card";
import { Heart } from "lucide-react";

export function SponsorsSection({ sponsors }: { sponsors: any[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">후원사</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sponsors.map((sponsor) => (
          <div key={sponsor.id} className="text-center">
            {sponsor.logoUrl && (
              <Image
                src={sponsor.logoUrl}
                alt={sponsor.name}
                width={120}
                height={80}
                className="mx-auto"
              />
            )}
            <p className="text-sm text-gray-600 mt-2">{sponsor.name}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

---

## 6️⃣ React 구현

### Federation Homepage

```typescript
// src/pages/federations/FederationHomePage.tsx
"use client";

import { useParams } from "react-router-dom";
import { FederationHero } from "@/components/federation/FederationHero";
import { FederationTabs } from "@/components/federation/FederationTabs";
import { NoticesSection } from "@/components/federation/NoticesSection";
import { ActiveTournamentsSection } from "@/components/federation/ActiveTournamentsSection";
import { TodayMatchesSection } from "@/components/federation/TodayMatchesSection";
import { CurrentStandingsSection } from "@/components/federation/CurrentStandingsSection";
import { ParticipatingTeamsSection } from "@/components/federation/ParticipatingTeamsSection";
import { SponsorsSection } from "@/components/federation/SponsorsSection";
import { AIChatbot } from "@/components/federation/AIChatbot";

export default function FederationHomePage() {
  const params = useParams();
  const federationSlug = params.federationId as string;

  // 데이터 페칭
  const federation = {
    id: "1",
    name: "노원구 축구협회",
    slug: "nowon-football",
    logoUrl: "/logos/nowon-football.png",
    tagline: "서울 북부 지역 유소년 축구 리그 운영",
    bannerText: "미래를 키우는 유소년 축구 플랫폼",
    region: "서울 노원구",
    sportType: "football",
    primaryColor: "#0F172A",
    secondaryColor: "#16A34A",
  };

  const notices = [];
  const tournaments = [];
  const matches = [];
  const standings = [];
  const teams = [];
  const sponsors = [];

  return (
    <div className="min-h-screen bg-gray-50">
      <FederationHero federation={federation} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FederationTabs federationSlug={federationSlug} />
        
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NoticesSection notices={notices} />
            <ActiveTournamentsSection tournaments={tournaments} />
          </div>
          
          <TodayMatchesSection matches={matches} />
          
          <CurrentStandingsSection standings={standings} />
          
          <ParticipatingTeamsSection teams={teams} />
          
          <SponsorsSection sponsors={sponsors} />
        </div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot federationId={federation.id} />
    </div>
  );
}
```

### FederationTabs 컴포넌트

```typescript
// src/components/federation/FederationTabs.tsx
"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { Home, Info, Megaphone, Trophy, Calendar, BarChart, Users, FileText, Heart, Mail } from "lucide-react";

const tabs = [
  { icon: Home, label: "홈", path: "" },
  { icon: Info, label: "협회소개", path: "/about" },
  { icon: Megaphone, label: "공지사항", path: "/notices" },
  { icon: Trophy, label: "대회", path: "/tournaments" },
  { icon: Calendar, label: "경기", path: "/matches" },
  { icon: BarChart, label: "순위", path: "/standings" },
  { icon: Users, label: "팀", path: "/clubs" },
  { icon: FileText, label: "자료실", path: "/docs" },
  { icon: Heart, label: "후원사", path: "/sponsors" },
  { icon: Mail, label: "문의", path: "/contact" },
];

export function FederationTabs({ federationSlug }: { federationSlug: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/federations/${federationSlug}`;

  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <nav className="flex space-x-1 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const href = `${basePath}${tab.path}`;
          const isActive = location.pathname === href || (tab.path === "" && location.pathname === basePath);
          
          return (
            <button
              key={tab.path}
              onClick={() => navigate(href)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary-600 text-primary-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

---

## ✅ Federation Public Homepage 완료

### 완성된 내용

- ✅ 전체 레이아웃 구조
- ✅ Hero Section (협회 로고, 이름, 소개)
- ✅ Navigation Tabs (10개)
- ✅ 주요 섹션 (공지, 대회, 경기, 순위, 팀, 후원사)
- ✅ AI Chatbot
- ✅ React 구현 코드

### 플랫폼 완성도

이제 YAGO 플랫폼 구조는:

```
Sports Hub (/sports)
  └─ FAB (Create Center)

Federation Hub (/federations)
  ├─ Federation List
  ├─ Federation Create (/platform/federations/create)
  ├─ Federation Home (/federations/{slug}) ✅
  └─ Federation Admin (/federations/{slug}/admin)
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO Federation Public Homepage 완전한 설계 완료
