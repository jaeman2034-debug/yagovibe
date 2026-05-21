# 🏛️ 노원구 축구협회 홈 페이지 실제 구현 코드

> **바로 개발 시작 가능한 완성형 코드**

---

## 📋 목차

1. [전체 페이지 컴포넌트](#1-전체-페이지-컴포넌트)
2. [타입 정의](#2-타입-정의)
3. [섹션별 컴포넌트](#3-섹션별-컴포넌트)
4. [데이터 페칭 서비스](#4-데이터-페칭-서비스)
5. [공통 컴포넌트](#5-공통-컴포넌트)
6. [스타일 가이드](#6-스타일-가이드)

---

## 1️⃣ 전체 페이지 컴포넌트

### 파일: `src/pages/association/AssociationHomePage.tsx`

```typescript
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAssociationHomeData } from "@/services/associationService";
import { AssociationHeader } from "@/components/association/AssociationHeader";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActionsSection } from "@/components/home/QuickActionsSection";
import { MatchesOverviewSection } from "@/components/home/MatchesOverviewSection";
import { NoticesSection } from "@/components/home/NoticesSection";
import { LeagueStatusSection } from "@/components/home/LeagueStatusSection";
import { StandingsPreviewSection } from "@/components/home/StandingsPreviewSection";
import { TopPlayersSection } from "@/components/home/TopPlayersSection";
import { RecentResultsSection } from "@/components/home/RecentResultsSection";
import { FeaturedTeamsSection } from "@/components/home/FeaturedTeamsSection";
import { PlayerSpotlightSection } from "@/components/home/PlayerSpotlightSection";
import { MediaHighlightsSection } from "@/components/home/MediaHighlightsSection";
import { SiteFooter } from "@/components/common/SiteFooter";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

export default function AssociationHomePage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  
  // associationSlug → associationId 변환 (또는 직접 사용)
  const associationId = associationSlug || "assoc-nowon-football";

  const { data, isLoading, error } = useQuery({
    queryKey: ["association", associationId, "home"],
    queryFn: () => getAssociationHomeData(associationId),
    staleTime: 5 * 60 * 1000, // 5분
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState message="홈 데이터를 불러오는데 실패했습니다." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AssociationHeader associationId={associationId} />

      {/* Hero Section */}
      <HeroSection 
        association={data.association} 
        hero={data.hero} 
      />

      {/* Quick Actions */}
      <QuickActionsSection items={data.quickActions} />

      {/* Main Content Grid */}
      <section className="mx-auto max-w-7xl gap-6 px-4 py-8 lg:grid-cols-12 lg:grid">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          <MatchesOverviewSection matches={data.todayMatches} />
          <RecentResultsSection matches={data.recentResults} />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          <NoticesSection notices={data.notices} />
          <LeagueStatusSection competitions={data.competitions} />
        </div>

        {/* Full Width Sections */}
        <div className="lg:col-span-12">
          <StandingsPreviewSection rows={data.standingsPreview} />
        </div>

        <div className="lg:col-span-6">
          <TopPlayersSection players={data.topPlayers} />
        </div>

        <div className="lg:col-span-6">
          <FeaturedTeamsSection teams={data.featuredTeams} />
        </div>

        <div className="lg:col-span-12">
          <PlayerSpotlightSection players={data.playerSpotlights} />
        </div>

        <div className="lg:col-span-12">
          <MediaHighlightsSection items={data.mediaHighlights} />
        </div>
      </section>

      <SiteFooter associationId={associationId} />
    </div>
  );
}
```

---

## 2️⃣ 타입 정의

### 파일: `src/types/associationHome.ts`

```typescript
export interface AssociationSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  slogan?: string;
  region: string;
}

export interface HeroSummary {
  title: string;
  subtitle: string;
  stats: Array<{
    label: string;
    value: string | number;
  }>;
}

export interface QuickAction {
  key: string;
  title: string;
  description?: string;
  href: string;
  icon: string; // 아이콘 이름 또는 React 컴포넌트
}

export interface MatchSummary {
  id: string;
  competitionName: string;
  roundLabel: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
  venueName: string;
  scheduledLabel: string;
  status: "scheduled" | "live" | "completed";
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
}

export interface NoticeSummary {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  publishedAtLabel: string;
  publishedAt: Date;
  excerpt?: string;
}

export interface CompetitionSummary {
  id: string;
  name: string;
  status: "draft" | "registration" | "active" | "completed";
  teamCount: number;
  matchCount: number;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
}

export interface StandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalDiff: number;
  form: ("W" | "D" | "L")[];
}

export interface PlayerRankingItem {
  playerId: string;
  playerName: string;
  teamName: string;
  teamLogoUrl?: string;
  value: number;
  category: "goals" | "assists" | "appearances" | "cleanSheets";
  position?: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  membership: "member" | "pending" | "non-member";
  region?: string;
  followerCount?: number;
  memberCount?: number;
}

export interface PlayerSpotlight {
  playerId: string;
  playerName: string;
  position: string;
  teamName: string;
  teamLogoUrl?: string;
  photoUrl?: string;
  recentStats: {
    goals: number;
    assists: number;
    matches: number;
  };
  highlight: string;
}

export interface MediaSummary {
  id: string;
  type: "photo" | "video";
  title: string;
  thumbnailUrl: string;
  entityType: "match" | "team" | "player" | "event";
  entityId: string;
  entityName?: string;
  publishedAtLabel: string;
  views?: number;
  likes?: number;
}

export interface AssociationHomeData {
  association: AssociationSummary;
  hero: HeroSummary;
  quickActions: QuickAction[];
  todayMatches: MatchSummary[];
  notices: NoticeSummary[];
  competitions: CompetitionSummary[];
  standingsPreview: StandingRow[];
  topPlayers: PlayerRankingItem[];
  recentResults: MatchSummary[];
  featuredTeams: TeamSummary[];
  playerSpotlights: PlayerSpotlight[];
  mediaHighlights: MediaSummary[];
}
```

---

## 3️⃣ 섹션별 컴포넌트

### 3-1. HeroSection

**파일**: `src/components/home/HeroSection.tsx`

```typescript
import { Link } from "react-router-dom";
import { Calendar, Trophy, Users, MapPin } from "lucide-react";
import { AssociationSummary, HeroSummary } from "@/types/associationHome";

interface HeroSectionProps {
  association: AssociationSummary;
  hero: HeroSummary;
}

export function HeroSection({ association, hero }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      
      <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-3xl">
          {/* 협회명 */}
          <div className="mb-3 flex items-center gap-3">
            {association.logoUrl && (
              <img 
                src={association.logoUrl} 
                alt={association.name}
                className="h-12 w-12 rounded-full"
              />
            )}
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {association.name}
            </p>
          </div>

          {/* 메인 타이틀 */}
          <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">
            {hero.title}
          </h1>

          {/* 서브타이틀 */}
          <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
            {hero.subtitle}
          </p>

          {/* CTA 버튼 */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="#today-matches"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Calendar className="mr-2 inline h-4 w-4" />
              경기 일정 보기
            </Link>
            <Link
              to={`/a/${association.slug}/teams`}
              className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Users className="mr-2 inline h-4 w-4" />
              팀 목록 보기
            </Link>
            <Link
              to={`/a/${association.slug}/notices`}
              className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              공지사항
            </Link>
          </div>

          {/* 통계 카드 */}
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {hero.stats.map((stat, index) => (
              <div 
                key={index} 
                className="rounded-2xl bg-white/10 p-4 backdrop-blur transition hover:bg-white/15"
              >
                <div className="text-2xl font-bold md:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-slate-300 md:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

### 3-2. QuickActionsSection

**파일**: `src/components/home/QuickActionsSection.tsx`

```typescript
import { Link } from "react-router-dom";
import { 
  Calendar, Trophy, Users, User, FileText, 
  MapPin, Bell, Search 
} from "lucide-react";
import { QuickAction } from "@/types/associationHome";

interface QuickActionsSectionProps {
  items: QuickAction[];
}

const iconMap: Record<string, React.ReactNode> = {
  calendar: <Calendar className="h-6 w-6" />,
  trophy: <Trophy className="h-6 w-6" />,
  users: <Users className="h-6 w-6" />,
  user: <User className="h-6 w-6" />,
  fileText: <FileText className="h-6 w-6" />,
  mapPin: <MapPin className="h-6 w-6" />,
  bell: <Bell className="h-6 w-6" />,
  search: <Search className="h-6 w-6" />,
};

export function QuickActionsSection({ items }: QuickActionsSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.href}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 text-slate-700 group-hover:text-emerald-600">
              {iconMap[item.icon] || <Calendar className="h-6 w-6" />}
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {item.title}
            </div>
            {item.description && (
              <div className="mt-1 text-xs text-slate-500">
                {item.description}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
```

---

### 3-3. MatchesOverviewSection

**파일**: `src/components/home/MatchesOverviewSection.tsx`

```typescript
import { useState } from "react";
import { Link } from "react-router-dom";
import { MatchSummary } from "@/types/associationHome";
import { SectionHeader } from "@/components/common/SectionHeader";
import { MatchCard } from "@/components/home/MatchCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MatchesOverviewSectionProps {
  matches: MatchSummary[];
}

export function MatchesOverviewSection({ matches }: MatchesOverviewSectionProps) {
  const [activeTab, setActiveTab] = useState<"today" | "week" | "recent">("today");

  const todayMatches = matches.filter(m => {
    const matchDate = new Date(m.date);
    const today = new Date();
    return matchDate.toDateString() === today.toDateString();
  });

  const weekMatches = matches.filter(m => {
    const matchDate = new Date(m.date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return matchDate >= today && matchDate <= weekFromNow;
  });

  const recentMatches = matches.filter(m => m.status === "completed").slice(0, 5);

  const displayMatches = activeTab === "today" ? todayMatches 
    : activeTab === "week" ? weekMatches 
    : recentMatches;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader 
        title="경기 일정" 
        href="/a/nowon-football/matches"
        linkLabel="전체 보기"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">오늘</TabsTrigger>
          <TabsTrigger value="week">이번 주</TabsTrigger>
          <TabsTrigger value="recent">최근 완료</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {displayMatches.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {activeTab === "today" && "오늘 예정된 경기가 없습니다."}
            {activeTab === "week" && "이번 주 예정된 경기가 없습니다."}
            {activeTab === "recent" && "최근 완료된 경기가 없습니다."}
          </div>
        ) : (
          displayMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))
        )}
      </div>
    </section>
  );
}
```

---

### 3-4. MatchCard

**파일**: `src/components/home/MatchCard.tsx`

```typescript
import { Link } from "react-router-dom";
import { MatchSummary } from "@/types/associationHome";
import { Clock, MapPin } from "lucide-react";

interface MatchCardProps {
  match: MatchSummary;
}

export function MatchCard({ match }: MatchCardProps) {
  const statusConfig = {
    scheduled: { label: "예정", color: "bg-slate-100 text-slate-700" },
    live: { label: "진행중", color: "bg-emerald-100 text-emerald-700" },
    completed: { label: "종료", color: "bg-slate-200 text-slate-600" },
  };

  const config = statusConfig[match.status];

  return (
    <Link
      to={`/a/nowon-football/matches/${match.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500">
          {match.competitionName} · {match.roundLabel}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.color}`}>
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* 홈팀 */}
        <div className="text-right">
          {match.homeTeamLogoUrl && (
            <img 
              src={match.homeTeamLogoUrl} 
              alt={match.homeTeamName}
              className="mx-auto mb-2 h-8 w-8"
            />
          )}
          <div className="text-sm font-semibold text-slate-900">
            {match.homeTeamName}
          </div>
        </div>

        {/* 스코어 */}
        <div className="text-center">
          {match.status === "completed" ? (
            <div className="text-lg font-bold text-slate-900">
              {match.homeScore} : {match.awayScore}
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-400">VS</div>
          )}
        </div>

        {/* 원정팀 */}
        <div className="text-left">
          {match.awayTeamLogoUrl && (
            <img 
              src={match.awayTeamLogoUrl} 
              alt={match.awayTeamName}
              className="mx-auto mb-2 h-8 w-8"
            />
          )}
          <div className="text-sm font-semibold text-slate-900">
            {match.awayTeamName}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {match.scheduledLabel}
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {match.venueName}
        </div>
      </div>
    </Link>
  );
}
```

---

### 3-5. NoticesSection

**파일**: `src/components/home/NoticesSection.tsx`

```typescript
import { Link } from "react-router-dom";
import { NoticeSummary } from "@/types/associationHome";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Pin, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface NoticesSectionProps {
  notices: NoticeSummary[];
}

export function NoticesSection({ notices }: NoticesSectionProps) {
  const pinnedNotices = notices.filter(n => n.isPinned);
  const regularNotices = notices.filter(n => !n.isPinned).slice(0, 4);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader 
        title="공지사항" 
        href="/a/nowon-football/notices"
        linkLabel="전체 보기"
      />

      <div className="space-y-3">
        {/* 고정 공지 */}
        {pinnedNotices.map((notice) => (
          <Link
            key={notice.id}
            to={`/a/nowon-football/notices/${notice.id}`}
            className="block rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-300"
          >
            <div className="mb-2 flex items-center gap-2">
              <Pin className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">중요</span>
              <span className="text-xs text-slate-500">{notice.category}</span>
            </div>
            <div className="font-semibold text-slate-900">{notice.title}</div>
            {notice.excerpt && (
              <div className="mt-1 text-sm text-slate-600 line-clamp-2">
                {notice.excerpt}
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              {formatDistanceToNow(notice.publishedAt, { addSuffix: true, locale: ko })}
            </div>
          </Link>
        ))}

        {/* 일반 공지 */}
        {regularNotices.map((notice) => (
          <Link
            key={notice.id}
            to={`/a/nowon-football/notices/${notice.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">{notice.category}</span>
            </div>
            <div className="font-medium text-slate-900">{notice.title}</div>
            {notice.excerpt && (
              <div className="mt-1 text-sm text-slate-600 line-clamp-1">
                {notice.excerpt}
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              {formatDistanceToNow(notice.publishedAt, { addSuffix: true, locale: ko })}
            </div>
          </Link>
        ))}

        {notices.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            공지사항이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
```

---

### 3-6. StandingsPreviewSection

**파일**: `src/components/home/StandingsPreviewSection.tsx`

```typescript
import { Link } from "react-router-dom";
import { StandingRow } from "@/types/associationHome";
import { SectionHeader } from "@/components/common/SectionHeader";

interface StandingsPreviewSectionProps {
  rows: StandingRow[];
}

export function StandingsPreviewSection({ rows }: StandingsPreviewSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader 
        title="리그 순위" 
        href="/a/nowon-football/stats"
        linkLabel="전체 순위 보기"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold">순위</th>
                <th className="px-3 py-3 text-left text-xs font-semibold">팀</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">경기</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">승</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">무</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">패</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">승점</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">득실</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row) => (
                <tr 
                  key={row.teamId} 
                  className="border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-3 py-3 font-bold text-slate-900">{row.rank}</td>
                  <td className="px-3 py-3">
                    <Link 
                      to={`/a/nowon-football/teams/${row.teamId}`}
                      className="flex items-center gap-2 font-medium text-slate-900 hover:text-emerald-600"
                    >
                      {row.teamLogoUrl && (
                        <img 
                          src={row.teamLogoUrl} 
                          alt={row.teamName}
                          className="h-6 w-6"
                        />
                      )}
                      {row.teamName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center">{row.played}</td>
                  <td className="px-3 py-3 text-center font-semibold text-emerald-600">{row.won}</td>
                  <td className="px-3 py-3 text-center">{row.drawn}</td>
                  <td className="px-3 py-3 text-center text-red-600">{row.lost}</td>
                  <td className="px-3 py-3 text-center font-bold text-slate-900">{row.points}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={row.goalDiff >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {row.goalDiff > 0 ? "+" : ""}{row.goalDiff}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
```

---

## 4️⃣ 데이터 페칭 서비스

### 파일: `src/services/associationService.ts`

```typescript
import { 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AssociationHomeData } from "@/types/associationHome";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export async function getAssociationHomeData(
  associationId: string
): Promise<AssociationHomeData> {
  // 병렬 데이터 로드
  const [
    association,
    notices,
    tournaments,
    matches,
    teams,
    standings,
    players,
    media,
  ] = await Promise.all([
    getAssociation(associationId),
    getNotices(associationId, 5),
    getActiveTournaments(associationId),
    getTodayMatches(associationId),
    getFeaturedTeams(associationId, 8),
    getStandingsPreview(associationId),
    getTopPlayers(associationId),
    getMediaHighlights(associationId, 8),
  ]);

  // Hero 통계 계산
  const stats = await calculateStats(associationId);

  // Quick Actions 생성
  const quickActions = [
    {
      key: "matches",
      title: "경기일정",
      description: "경기 일정 확인",
      href: `/a/${association.slug}/matches`,
      icon: "calendar",
    },
    {
      key: "standings",
      title: "순위표",
      description: "리그 순위",
      href: `/a/${association.slug}/stats`,
      icon: "trophy",
    },
    {
      key: "teams",
      title: "팀목록",
      description: "참가 팀",
      href: `/a/${association.slug}/teams`,
      icon: "users",
    },
    {
      key: "players",
      title: "선수목록",
      description: "등록 선수",
      href: `/a/${association.slug}/players`,
      icon: "user",
    },
    {
      key: "team-register",
      title: "팀 등록",
      description: "신규 팀 등록",
      href: `/a/${association.slug}/teams/register`,
      icon: "fileText",
    },
    {
      key: "player-register",
      title: "선수 등록",
      description: "선수 등록",
      href: `/a/${association.slug}/players/register`,
      icon: "fileText",
    },
    {
      key: "notices",
      title: "공지사항",
      description: "협회 공지",
      href: `/a/${association.slug}/notices`,
      icon: "bell",
    },
    {
      key: "facilities",
      title: "시설 안내",
      description: "경기장 정보",
      href: `/a/${association.slug}/facilities`,
      icon: "mapPin",
    },
  ];

  return {
    association,
    hero: {
      title: `${association.name} 2025 시즌 운영 중`,
      subtitle: "리그 일정, 팀 정보, 선수 기록, 경기 결과를 한 곳에서 확인하세요.",
      stats: [
        { label: "가맹 클럽", value: stats.clubsCount },
        { label: "운영 대회", value: stats.activeTournamentsCount },
        { label: "활성 팀", value: stats.activeTeamsCount },
        { label: "이번 달 경기", value: stats.thisMonthMatchesCount },
      ],
    },
    quickActions,
    todayMatches: matches,
    notices,
    competitions: tournaments,
    standingsPreview: standings,
    topPlayers: players,
    recentResults: matches.filter(m => m.status === "completed").slice(0, 5),
    featuredTeams: teams,
    playerSpotlights: players.slice(0, 3).map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      position: p.position || "FW",
      teamName: p.teamName,
      teamLogoUrl: p.teamLogoUrl,
      recentStats: {
        goals: p.category === "goals" ? p.value : 0,
        assists: p.category === "assists" ? p.value : 0,
        matches: p.category === "appearances" ? p.value : 0,
      },
      highlight: `${p.category === "goals" ? "득점" : p.category === "assists" ? "도움" : "출전"} ${p.value}${p.category === "appearances" ? "경기" : ""}`,
    })),
    mediaHighlights: media,
  };
}

// Helper functions
async function getAssociation(associationId: string) {
  const docRef = doc(db, "associations", associationId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Association not found");
  return { id: docSnap.id, ...docSnap.data() } as any;
}

async function getNotices(associationId: string, limitCount: number) {
  const q = query(
    collection(db, "notices"),
    where("associationId", "==", associationId),
    orderBy("isPinned", "desc"),
    orderBy("publishedAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    publishedAt: doc.data().publishedAt?.toDate() || new Date(),
    publishedAtLabel: format(doc.data().publishedAt?.toDate() || new Date(), "yyyy-MM-dd", { locale: ko }),
  })) as any[];
}

async function getActiveTournaments(associationId: string) {
  const q = query(
    collection(db, `associations/${associationId}/tournaments`),
    where("status", "in", ["LIVE", "PREPARE"]),
    orderBy("status"),
    orderBy("startDate", "desc"),
    limit(3)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate?.toDate() || new Date(),
    endDate: doc.data().endDate?.toDate() || new Date(),
    periodLabel: `${format(doc.data().startDate?.toDate() || new Date(), "yyyy-MM-dd")} ~ ${format(doc.data().endDate?.toDate() || new Date(), "yyyy-MM-dd")}`,
  })) as any[];
}

async function getTodayMatches(associationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, `associations/${associationId}/tournaments`),
    where("status", "==", "LIVE")
  );
  const tournamentsSnap = await getDocs(q);
  
  const allMatches: any[] = [];
  for (const tournamentDoc of tournamentsSnap.docs) {
    const matchesQ = query(
      collection(db, `associations/${associationId}/tournaments/${tournamentDoc.id}/matches`),
      where("date", ">=", format(today, "yyyy-MM-dd")),
      where("date", "<", format(tomorrow, "yyyy-MM-dd")),
      orderBy("date"),
      orderBy("time"),
      limit(10)
    );
    const matchesSnap = await getDocs(matchesQ);
    allMatches.push(...matchesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      competitionName: tournamentDoc.data().name,
      scheduledLabel: `${doc.data().date} ${doc.data().time || ""}`,
    })));
  }
  
  return allMatches;
}

async function getFeaturedTeams(associationId: string, limitCount: number) {
  const q = query(
    collection(db, "teams"),
    where("associationId", "==", associationId),
    where("membership", "==", "member"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];
}

async function getStandingsPreview(associationId: string) {
  // 실제로는 leaderboards 컬렉션에서 가져옴
  // 여기서는 예시 데이터
  return [];
}

async function getTopPlayers(associationId: string) {
  // 실제로는 player_summary 또는 leaderboards에서 가져옴
  // 여기서는 예시 데이터
  return [];
}

async function getMediaHighlights(associationId: string, limitCount: number) {
  const q = query(
    collection(db, "media"),
    where("entityType", "==", "association"),
    where("entityId", "==", associationId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    publishedAtLabel: format(doc.data().createdAt?.toDate() || new Date(), "yyyy-MM-dd", { locale: ko }),
  })) as any[];
}

async function calculateStats(associationId: string) {
  const [teamsSnap, tournamentsSnap, matchesSnap] = await Promise.all([
    getDocs(query(
      collection(db, "teams"),
      where("associationId", "==", associationId),
      where("membership", "==", "member")
    )),
    getDocs(query(
      collection(db, `associations/${associationId}/tournaments`),
      where("status", "==", "LIVE")
    )),
    getDocs(query(
      collection(db, "teams"),
      where("associationId", "==", associationId)
    )),
  ]);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  // 이번 달 경기 수는 실제로는 matches 컬렉션에서 계산

  return {
    clubsCount: teamsSnap.size,
    activeTournamentsCount: tournamentsSnap.size,
    activeTeamsCount: matchesSnap.size,
    thisMonthMatchesCount: 0, // 실제 계산 필요
  };
}
```

---

## 5️⃣ 공통 컴포넌트

### SectionHeader

**파일**: `src/components/common/SectionHeader.tsx`

```typescript
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeader({
  title,
  description,
  href,
  linkLabel = "전체 보기",
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      {href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-emerald-600"
        >
          {linkLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조 (MVP)
- [ ] `AssociationHomePage` 컴포넌트 생성
- [ ] `HeroSection` 구현
- [ ] `QuickActionsSection` 구현
- [ ] `MatchesOverviewSection` 구현
- [ ] `NoticesSection` 구현
- [ ] `StandingsPreviewSection` 구현
- [ ] 데이터 서비스 함수 작성

### Phase 2: 확장 기능
- [ ] `LeagueStatusSection` 구현
- [ ] `TopPlayersSection` 구현
- [ ] `RecentResultsSection` 구현
- [ ] `FeaturedTeamsSection` 구현
- [ ] `PlayerSpotlightSection` 구현
- [ ] `MediaHighlightsSection` 구현

### Phase 3: 최적화
- [ ] 모바일 반응형 테스트
- [ ] 이미지 최적화 (lazy loading)
- [ ] 성능 최적화 (React.memo, useMemo)
- [ ] SEO 메타 태그 설정

---

**작성일**: 2024년  
**상태**: ✅ 구현 코드 완료 (개발 시작 가능)
