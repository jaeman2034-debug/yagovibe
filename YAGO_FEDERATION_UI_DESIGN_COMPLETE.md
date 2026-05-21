# 🎨 YAGO VIBE SPORTS - 노원구 축구협회 실제 UI 디자인 (완성형)

> **작성일**: 2024년  
> **목적**: 실제 서비스 수준의 Tailwind CSS 기반 UI 디자인 시안

---

## 📋 목차

1. [홈페이지 메인 UI](#1-홈페이지-메인-ui)
2. [Hero 영역](#2-hero-영역)
3. [진행중 대회 섹션](#3-진행중-대회-섹션)
4. [경기 일정 섹션](#4-경기-일정-섹션)
5. [현재 순위 섹션](#5-현재-순위-섹션)
6. [참가팀/클럽 섹션](#6-참가팀클럽-섹션)
7. [후원사 섹션](#7-후원사-섹션)
8. [AI 협회 도우미](#8-ai-협회-도우미)
9. [전체 페이지 레이아웃](#9-전체-페이지-레이아웃)

---

## 1️⃣ 홈페이지 메인 UI

### 경로: `/federations/nowon-football`

### 전체 레이아웃 코드

```tsx
// src/pages/federations/FederationHomePage.tsx
import { useParams } from "react-router-dom";
import Header from "@/layout/Header";
import { FederationHero } from "@/components/federation/FederationHero";
import { ActiveTournaments } from "@/components/federation/ActiveTournaments";
import { TodayMatches } from "@/components/federation/TodayMatches";
import { CurrentStandings } from "@/components/federation/CurrentStandings";
import { FeaturedClubs } from "@/components/federation/FeaturedClubs";
import { SponsorsBanner } from "@/components/federation/SponsorsBanner";
import { AIChatbot } from "@/components/federation/AIChatbot";
import Footer from "@/layout/Footer";

export default function FederationHomePage() {
  const { federationId } = useParams<{ federationId: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* 협회 헤더 */}
      <FederationHeader federationId={federationId!} />
      
      {/* 탭 메뉴 */}
      <FederationTabs federationId={federationId!} activeTab="home" />
      
      {/* Hero 영역 */}
      <FederationHero federationId={federationId!} />
      
      {/* 진행중 대회 */}
      <ActiveTournaments federationId={federationId!} />
      
      {/* 경기 일정 */}
      <TodayMatches federationId={federationId!} />
      
      {/* 현재 순위 */}
      <CurrentStandings federationId={federationId!} />
      
      {/* 참가팀/클럽 */}
      <FeaturedClubs federationId={federationId!} />
      
      {/* 후원사 */}
      <SponsorsBanner federationId={federationId!} />
      
      {/* AI 챗봇 */}
      <AIChatbot federationId={federationId!} />
      
      <Footer />
    </div>
  );
}
```

---

## 2️⃣ Hero 영역

### 컴포넌트 코드

```tsx
// src/components/federation/FederationHero.tsx
import { useFederation } from "@/hooks/useFederation";
import { Trophy, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";

export function FederationHero({ federationId }: { federationId: string }) {
  const { federation, loading } = useFederation(federationId);

  if (loading) {
    return <div className="h-96 bg-gray-200 animate-pulse" />;
  }

  return (
    <section className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white overflow-hidden">
      {/* 배경 이미지 */}
      <div className="absolute inset-0 bg-black/20">
        <img
          src="/images/football-field.jpg"
          alt="축구 경기장"
          className="w-full h-full object-cover opacity-30"
        />
      </div>
      
      {/* 콘텐츠 */}
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl">
          {/* 협회명 */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            {federation?.name || "노원구 축구협회"}
          </h1>
          
          {/* 설명 */}
          <p className="text-xl md:text-2xl mb-8 text-gray-100 drop-shadow-md">
            지역 축구 리그 및 대회 운영 플랫폼
          </p>
          
          {/* CTA 버튼 */}
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to={`/federations/${federationId}/tournaments`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              <Trophy className="w-5 h-5" />
              대회 보기
            </Link>
            <Link
              to={`/federations/${federationId}/matches`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white border-2 border-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              경기 일정
            </Link>
            <Link
              to={`/federations/${federationId}/docs`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white border-2 border-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
            >
              <FileText className="w-5 h-5" />
              참가 신청
            </Link>
          </div>
          
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="진행중 리그" value={4} />
            <StatCard label="참가 팀" value={24} />
            <StatCard label="총 경기" value={66} />
            <StatCard label="등록 선수" value={312} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-200">{label}</div>
    </div>
  );
}
```

---

## 3️⃣ 진행중 대회 섹션

### 컴포넌트 코드

```tsx
// src/components/federation/ActiveTournaments.tsx
import { useTournaments } from "@/hooks/useTournaments";
import { Trophy, Calendar, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function ActiveTournaments({ federationId }: { federationId: string }) {
  const { tournaments, loading } = useTournaments(federationId, {
    status: "active",
    limit: 3,
  });

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">진행중 대회</h2>
        <Link
          to={`/federations/${federationId}/tournaments`}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          전체 보기
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} federationId={federationId} />
        ))}
      </div>
    </section>
  );
}

function TournamentCard({ tournament, federationId }: { tournament: any; federationId: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
              진행중
            </span>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{tournament.name}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(tournament.startDate).toLocaleDateString()} ~{" "}
              {new Date(tournament.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>참가팀 {tournament.teamCount} · 경기수 {tournament.matchCount}</span>
          </div>
        </div>
        
        <Link
          to={`/federations/${federationId}/tournaments/${tournament.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          대회 보기
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
```

---

## 4️⃣ 경기 일정 섹션

### 컴포넌트 코드

```tsx
// src/components/federation/TodayMatches.tsx
import { useMatches } from "@/hooks/useMatches";
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export function TodayMatches({ federationId }: { federationId: string }) {
  const today = new Date();
  const { matches, loading } = useMatches(federationId, {
    date: format(today, "yyyy-MM-dd"),
    limit: 5,
  });

  if (loading) {
    return (
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">오늘 경기</h2>
          <Link
            to={`/federations/${federationId}/matches`}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            전체 일정 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {matches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            오늘 예정된 경기가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} federationId={federationId} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MatchCard({ match, federationId }: { match: any; federationId: string }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-gray-600 mb-2">{match.tournamentName || "K7 리그"}</div>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="text-lg font-bold text-gray-900">{match.homeTeamName}</div>
            <span className="text-gray-400">vs</span>
            <div className="text-lg font-bold text-gray-900">{match.awayTeamName}</div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{match.scheduledTime || "14:00"}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{match.venueName || "마들 스타디움"}</span>
            </div>
          </div>
        </div>
        
        <Link
          to={`/federations/${federationId}/matches/${match.id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          상세보기
        </Link>
      </div>
    </div>
  );
}
```

---

## 5️⃣ 현재 순위 섹션

### 컴포넌트 코드

```tsx
// src/components/federation/CurrentStandings.tsx
import { useStandings } from "@/hooks/useStandings";
import { Trophy, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CurrentStandings({ federationId }: { federationId: string }) {
  const { standings, loading } = useStandings(federationId, {
    limit: 5,
  });

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">현재 순위</h2>
        <Link
          to={`/federations/${federationId}/results`}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          전체 순위 보기
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  순위
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  팀
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  경기
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  승점
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  득실
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {standings.map((standing, index) => (
                <tr key={standing.teamId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && <Trophy className="w-5 h-5 text-yellow-500 mr-2" />}
                      <span className={`text-sm font-bold ${index < 3 ? "text-blue-600" : "text-gray-900"}`}>
                        {standing.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{standing.teamName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {standing.played}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-bold text-gray-900">{standing.points}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {standing.goalDifference > 0 ? "+" : ""}
                    {standing.goalDifference}
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

## 6️⃣ 참가팀/클럽 섹션

### 컴포넌트 코드

```tsx
// src/components/federation/FeaturedClubs.tsx
import { useClubs } from "@/hooks/useClubs";
import { Users, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function FeaturedClubs({ federationId }: { federationId: string }) {
  const { clubs, loading } = useClubs(federationId, {
    featured: true,
    limit: 6,
  });

  if (loading) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">참가 클럽</h2>
          <Link
            to={`/federations/${federationId}/clubs`}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            전체 클럽 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} federationId={federationId} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ClubCard({ club, federationId }: { club: any; federationId: string }) {
  return (
    <Link
      to={`/federations/${federationId}/clubs/${club.id}`}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow text-center"
    >
      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
        {club.logoUrl ? (
          <img src={club.logoUrl} alt={club.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <Users className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <div className="font-semibold text-gray-900 mb-1">{club.name}</div>
      <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
        <MapPin className="w-3 h-3" />
        <span>{club.region}</span>
      </div>
    </Link>
  );
}
```

---

## 7️⃣ 후원사 섹션

### 컴포넌트 코드

```tsx
// src/components/federation/SponsorsBanner.tsx
import { useSponsors } from "@/hooks/useSponsors";
import { Building2, Heart, ShoppingBag, Utensils } from "lucide-react";

export function SponsorsBanner({ federationId }: { federationId: string }) {
  const { sponsors, loading } = useSponsors(federationId, {
    type: "official",
    limit: 4,
  });

  if (loading) {
    return (
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">공식 후원사</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {sponsors.map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <SponsorCategoryCard
            icon={Heart}
            title="협력 병원"
            description="의료 지원 파트너"
          />
          <SponsorCategoryCard
            icon={ShoppingBag}
            title="스포츠 브랜드"
            description="용품 및 유니폼"
          />
          <SponsorCategoryCard
            icon={Utensils}
            title="지역 상권"
            description="식음 및 서비스"
          />
        </div>
      </div>
    </section>
  );
}

function SponsorCard({ sponsor }: { sponsor: any }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
      {sponsor.logoUrl ? (
        <img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 mx-auto mb-3 object-contain" />
      ) : (
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-3" />
      )}
      <div className="font-semibold text-gray-900">{sponsor.name}</div>
    </div>
  );
}

function SponsorCategoryCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-gray-200 p-6 text-center">
      <Icon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
      <div className="font-semibold text-gray-900 mb-1">{title}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
  );
}
```

---

## 8️⃣ AI 협회 도우미

### 컴포넌트 코드

```tsx
// src/components/federation/AIChatbot.tsx
import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";

export function AIChatbot({ federationId }: { federationId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { messages, sendMessage, loading } = useAIChat(federationId);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    await sendMessage(message);
    setMessage("");
  };

  const quickQuestions = [
    "대회 일정 알려줘",
    "대진표 보여줘",
    "참가 신청 방법",
    "규정 알려줘",
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          {/* 헤더 */}
          <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div>
              <div className="font-semibold">노원구 축구협회 AI 도우미</div>
              <div className="text-sm text-blue-100">무엇을 도와드릴까요?</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-4">빠른 질문:</div>
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(q)}
                    className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 입력 영역 */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
```

---

## 9️⃣ 전체 페이지 레이아웃

### FederationHeader 컴포넌트

```tsx
// src/components/federation/FederationHeader.tsx
import { useFederation } from "@/hooks/useFederation";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsFederationAdmin } from "@/hooks/useIsFederationAdmin";
import { useAuth } from "@/context/AuthProvider";

export function FederationHeader({ federationId }: { federationId: string }) {
  const { federation, loading } = useFederation(federationId);
  const { user } = useAuth();
  const isAdmin = useIsFederationAdmin(federationId, user?.uid);

  if (loading) {
    return (
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{federation?.name}</h1>
            <p className="text-gray-600 mt-1">{federation?.description}</p>
          </div>
          {isAdmin && (
            <Link
              to={`/federations/${federationId}/admin`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              관리자
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
```

### FederationTabs 컴포넌트

```tsx
// src/components/federation/FederationTabs.tsx
import { Link, useLocation } from "react-router-dom";
import { Building2, Bell, Trophy, Calendar, BarChart, Users, FileText, Award, GraduationCap, MessageSquare } from "lucide-react";

export function FederationTabs({ federationId, activeTab }: { federationId: string; activeTab?: string }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { id: "home", label: "홈", icon: Building2, path: `/federations/${federationId}` },
    { id: "about", label: "협회소개", icon: Building2, path: `/federations/${federationId}/about` },
    { id: "notices", label: "공지", icon: Bell, path: `/federations/${federationId}/notices` },
    { id: "tournaments", label: "대회/리그", icon: Trophy, path: `/federations/${federationId}/tournaments` },
    { id: "matches", label: "경기일정", icon: Calendar, path: `/federations/${federationId}/matches` },
    { id: "results", label: "결과/순위", icon: BarChart, path: `/federations/${federationId}/results` },
    { id: "clubs", label: "참가팀/클럽", icon: Users, path: `/federations/${federationId}/clubs` },
    { id: "docs", label: "규정/자료실", icon: FileText, path: `/federations/${federationId}/docs` },
    { id: "sponsors", label: "후원사", icon: Award, path: `/federations/${federationId}/sponsors` },
    { id: "youth", label: "유소년", icon: GraduationCap, path: `/federations/${federationId}/youth` },
    { id: "contact", label: "문의하기", icon: MessageSquare, path: `/federations/${federationId}/contact` },
  ];

  const isActive = (tabPath: string) => {
    if (tabPath === `/federations/${federationId}`) {
      return currentPath === tabPath;
    }
    return currentPath.startsWith(tabPath);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 스타일 가이드

### 컬러 시스템

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        accent: {
          500: "#16a34a",
          600: "#15803d",
        },
      },
    },
  },
};
```

### 타이포그래피

- 제목: `text-3xl font-bold` (30px, 굵게)
- 부제목: `text-xl font-semibold` (20px, 세미볼드)
- 본문: `text-base` (16px)
- 작은 텍스트: `text-sm` (14px)

### 간격

- 섹션 간격: `py-12` (48px)
- 카드 간격: `gap-6` (24px)
- 내부 패딩: `p-6` (24px)

---

**작성일**: 2024년  
**상태**: ✅ 노원구 축구협회 실제 UI 디자인 완료
