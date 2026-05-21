# 🏛️ 노원구 축구협회 홈 페이지 UI 구조 + React 컴포넌트 설계

> **실제 개발 바로 시작 가능한 수준의 설계 문서**

---

## 📋 목차

1. [전체 페이지 구조](#1-전체-페이지-구조)
2. [컴포넌트 계층 구조](#2-컴포넌트-계층-구조)
3. [섹션별 상세 설계](#3-섹션별-상세-설계)
4. [React 컴포넌트 구조](#4-react-컴포넌트-구조)
5. [데이터 흐름](#5-데이터-흐름)
6. [라우팅 구조](#6-라우팅-구조)
7. [실제 구현 가이드](#7-실제-구현-가이드)

---

## 1️⃣ 전체 페이지 구조

### URL 구조

```
/a/nowon-football
```

또는 (현재 구조 유지 시)

```
/association/assoc-nowon-football
```

### 페이지 레이아웃

```
┌─────────────────────────────────────────┐
│         Header (Sticky)                 │
│  [로고] 노원구 축구협회  [메뉴]         │
├─────────────────────────────────────────┤
│                                         │
│  🎯 HeroSection                         │
│  ┌─────────────────────────────────┐   │
│  │ 노원구 축구, 여기서 확인하세요   │   │
│  │ 공지 · 대회 · 대관 현황          │   │
│  │ [통계 카드 4개]                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📢 NoticeSection                       │
│  ┌─────────────────────────────────┐   │
│  │ 공지사항                          │   │
│  │ [공지 카드 3-5개]                 │   │
│  │ [더보기 →]                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🏆 TournamentSection                   │
│  ┌─────────────────────────────────┐   │
│  │ 주요 대회                         │   │
│  │ [대회 카드 1-3개]                 │   │
│  │ [더보기 →]                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🏟️ FacilitySection                    │
│  ┌─────────────────────────────────┐   │
│  │ 운동장 대관                       │   │
│  │ [대관 현황 카드]                  │   │
│  │ [대관 신청 →]                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📸 StorySection                        │
│  ┌─────────────────────────────────┐   │
│  │ 스토리 & 기록                     │   │
│  │ [사진/영상 갤러리]                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  👥 ClubSummarySection                  │
│  ┌─────────────────────────────────┐   │
│  │ 가맹 클럽                         │   │
│  │ [클럽 목록 그리드]                │   │
│  │ [더보기 →]                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│         Footer                          │
└─────────────────────────────────────────┘
```

---

## 2️⃣ 컴포넌트 계층 구조

### 전체 컴포넌트 트리

```
AssociationHomePage (페이지 컴포넌트)
├─ AssociationHeader (Sticky Header)
│   ├─ Logo
│   ├─ AssociationName
│   └─ NavigationTabs
│
├─ HeroSection
│   ├─ HeroContent
│   │   ├─ Title
│   │   ├─ Subtitle
│   │   └─ CTAButtons
│   └─ StatsGrid
│       ├─ StatCard (가맹 클럽 수)
│       ├─ StatCard (운영 대회 수)
│       ├─ StatCard (활성 팀 수)
│       └─ StatCard (이번 달 경기 수)
│
├─ NoticeSection
│   ├─ SectionHeader
│   │   ├─ Title
│   │   └─ ViewAllLink
│   └─ NoticeCardList
│       ├─ NoticeCard (고정 공지)
│       ├─ NoticeCard (일반 공지)
│       └─ NoticeCard (시스템 공지)
│
├─ TournamentSection
│   ├─ SectionHeader
│   │   ├─ Title
│   │   └─ ViewAllLink
│   └─ TournamentCardList
│       ├─ TournamentCard (진행 중)
│       ├─ TournamentCard (예정)
│       └─ TournamentCard (최근 완료)
│
├─ FacilitySection
│   ├─ SectionHeader
│   │   ├─ Title
│   │   └─ BookingLink
│   └─ FacilityStatusCard
│       ├─ TodayBookings
│       ├─ AvailableSlots
│       └─ QuickBookingButton
│
├─ StorySection
│   ├─ SectionHeader
│   └─ MediaGallery
│       ├─ PhotoGrid
│       └─ VideoList
│
├─ ClubSummarySection
│   ├─ SectionHeader
│   │   ├─ Title
│   │   └─ ViewAllLink
│   └─ ClubGrid
│       ├─ ClubCard (최신 클럽)
│       └─ ClubCard (인기 클럽)
│
└─ AssociationFooter
    ├─ ContactInfo
    ├─ QuickLinks
    └─ SocialLinks
```

---

## 3️⃣ 섹션별 상세 설계

### 3-1. HeroSection

**역할**: 협회 공식성 강조 + 핵심 지표 한눈에 보기

**UI 구조**:
```
┌─────────────────────────────────────────┐
│  [로고]  노원구 축구협회                 │
│                                         │
│  노원구 축구, 여기서 확인하세요         │
│  공지 · 대회 일정 · 운동장 대관 현황을  │
│  한 화면에서 확인합니다.                │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 45   │ │ 3    │ │ 120  │ │ 28   │   │
│  │ 클럽 │ │ 대회 │ │ 팀   │ │ 경기 │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                         │
│  [대회 일정 보기] [대관 신청하기]       │
└─────────────────────────────────────────┘
```

**데이터 소스**:
```typescript
interface HeroSectionData {
  associationName: string;
  slogan?: string;
  logoUrl?: string;
  stats: {
    clubsCount: number;        // 가맹 클럽 수
    activeTournamentsCount: number; // 운영 대회 수
    activeTeamsCount: number;   // 활성 팀 수
    thisMonthMatchesCount: number; // 이번 달 경기 수
  };
  highlightedTournament?: {
    id: string;
    name: string;
    status: "upcoming" | "ongoing";
  };
}
```

**컴포넌트**:
```typescript
<HeroSection associationId={string} />
```

**쿼리**:
- `associations/{associationId}` (협회 정보)
- `teams` where `associationId == {associationId}` AND `membership == "member"` (클럽 수)
- `tournaments` where `associationId == {associationId}` AND `status == "LIVE"` (대회 수)
- `matches` where `associationId == {associationId}` AND `date >= thisMonth` (경기 수)

---

### 3-2. NoticeSection

**역할**: 최신 공지사항 빠르게 확인

**UI 구조**:
```
┌─────────────────────────────────────────┐
│  📢 공지사항              [더보기 →]    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔴 [고정] 2026 대회 참가 신청   │   │
│  │    2026-01-15                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⚙️ [시스템] 대회 생성됨          │   │
│  │    노원구청장기 축구대회         │   │
│  │    2026-01-14                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📋 일반 공지 제목                │   │
│  │    2026-01-13                   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**데이터 소스**:
```typescript
interface Notice {
  id: string;
  title: string;
  type: "notice" | "announcement" | "system";
  isPinned: boolean;
  publishedAt: Timestamp;
  content?: string; // 미리보기용
  author?: string;
  relatedTournamentId?: string; // 시스템 공지 연동
}
```

**컴포넌트**:
```typescript
<NoticeSection 
  associationId={string} 
  limit={5}
  showSystemNotices={true}
/>
```

**쿼리**:
- `notices` where `associationId == {associationId}` 
  - orderBy `isPinned` desc, `publishedAt` desc
  - limit 5

---

### 3-3. TournamentSection

**역할**: 주요 대회 하이라이트

**UI 구조**:
```
┌─────────────────────────────────────────┐
│  🏆 주요 대회              [더보기 →]    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🟢 진행 중                        │   │
│  │ 2026 노원구청장기 축구대회        │   │
│  │ 📅 2026-01-15 ~ 2026-02-28      │   │
│  │ 📍 마들스타디움                   │   │
│  │ [대진표 보기] [결과 보기]         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔵 예정                           │   │
│  │ 2026 노원구협회장기 축구대회      │   │
│  │ 📅 2026-03-01 ~ 2026-03-31      │   │
│  │ [참가 신청하기]                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**데이터 소스**:
```typescript
interface Tournament {
  id: string;
  name: string;
  status: "PREPARE" | "LIVE" | "END";
  startDate: Timestamp;
  endDate: Timestamp;
  location: string;
  organizer: string;
  divisions?: string[]; // 연령대
  teamsCount?: number;
  matchesCount?: number;
}
```

**컴포넌트**:
```typescript
<TournamentSection 
  associationId={string}
  limit={3}
  highlightOngoing={true}
/>
```

**쿼리**:
- `tournaments` where `associationId == {associationId}`
  - orderBy `status` (LIVE 우선), `startDate` desc
  - limit 3

---

### 3-4. FacilitySection

**역할**: 운동장 대관 현황 및 빠른 신청

**UI 구조**:
```
┌─────────────────────────────────────────┐
│  🏟️ 운동장 대관          [대관 신청 →]  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 오늘 대관 현황                  │   │
│  │ ✅ 예약 완료: 12건              │   │
│  │ ⏰ 대기 중: 3건                 │   │
│  │ 📅 이번 주 예약 가능: 28건      │   │
│  │                                 │   │
│  │ [빠른 대관 신청하기]            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**데이터 소스**:
```typescript
interface FacilityStatus {
  todayBookings: number;
  pendingBookings: number;
  availableThisWeek: number;
  facilities: Array<{
    id: string;
    name: string;
    availableSlots: number;
  }>;
}
```

**컴포넌트**:
```typescript
<FacilitySection 
  associationId={string}
  showQuickBooking={true}
/>
```

**쿼리**:
- `facilities` where `associationId == {associationId}`
- `bookings` where `associationId == {associationId}` AND `date == today`
- `bookings` where `associationId == {associationId}` AND `status == "pending"`

---

### 3-5. StorySection

**역할**: 협회 활동 사진/영상 갤러리

**UI 구조**:
```
┌─────────────────────────────────────────┐
│  📸 스토리 & 기록                       │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ ▶️  │ │ 📷  │ │ 📷  │ │ 📷  │      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│                                         │
│  [갤러리 더보기 →]                      │
└─────────────────────────────────────────┘
```

**데이터 소스**:
```typescript
interface Media {
  id: string;
  type: "photo" | "video";
  url: string;
  thumbnailUrl?: string;
  title?: string;
  createdAt: Timestamp;
  views: number;
  likes: number;
}
```

**컴포넌트**:
```typescript
<StorySection 
  associationId={string}
  limit={8}
  showVideos={true}
/>
```

**쿼리**:
- `media` where `entityType == "association"` AND `entityId == {associationId}`
  - orderBy `createdAt` desc
  - limit 8

---

### 3-6. ClubSummarySection

**역할**: 가맹 클럽 목록 요약

**UI 구조**:
```
┌─────────────────────────────────────────┐
│  👥 가맹 클럽              [더보기 →]    │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ [로고]│ │ [로고]│ │ [로고]│ │ [로고]│   │
│  │ 공릉FC│ │ 노원FC│ │ 상계FC│ │ 중계FC│   │
│  │ 45명  │ │ 38명  │ │ 42명  │ │ 50명  │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ [로고]│ │ [로고]│ │ [로고]│ │ [로고]│   │
│  │ 월계FC│ │ 하계FC│ │ 수락FC│ │ ...  │   │
│  │ 40명  │ │ 35명  │ │ 48명  │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘
```

**데이터 소스**:
```typescript
interface Club {
  id: string;
  name: string;
  logoUrl?: string;
  membersCount: number;
  region: string;
  level?: string;
  joinedAt: Timestamp;
}
```

**컴포넌트**:
```typescript
<ClubSummarySection 
  associationId={string}
  limit={8}
  sortBy="membersCount" | "recent"
/>
```

**쿼리**:
- `teams` where `associationId == {associationId}` AND `membership == "member"`
  - orderBy `membersCount` desc (또는 `joinedAt` desc)
  - limit 8

---

## 4️⃣ React 컴포넌트 구조

### 4-1. 페이지 컴포넌트

**파일**: `src/pages/association/AssociationHomePage.tsx`

```typescript
import { useParams } from "react-router-dom";
import { AssociationHeader } from "@/components/association/AssociationHeader";
import { HeroSection } from "@/components/association/HeroSection";
import { NoticeSection } from "@/components/association/NoticeSection";
import { TournamentSection } from "@/components/association/TournamentSection";
import { FacilitySection } from "@/components/association/FacilitySection";
import { StorySection } from "@/components/association/StorySection";
import { ClubSummarySection } from "@/components/association/ClubSummarySection";
import { AssociationFooter } from "@/components/association/AssociationFooter";

export default function AssociationHomePage() {
  const { associationSlug } = useParams<{ associationSlug: string }>();
  
  // associationSlug → associationId 변환 (또는 직접 사용)
  const associationId = associationSlug || "assoc-nowon-football";

  return (
    <div className="min-h-screen bg-gray-50">
      <AssociationHeader associationId={associationId} />
      
      <main className="space-y-12 pb-16">
        <HeroSection associationId={associationId} />
        <NoticeSection associationId={associationId} limit={5} />
        <TournamentSection associationId={associationId} limit={3} />
        <FacilitySection associationId={associationId} />
        <StorySection associationId={associationId} limit={8} />
        <ClubSummarySection associationId={associationId} limit={8} />
      </main>
      
      <AssociationFooter associationId={associationId} />
    </div>
  );
}
```

---

### 4-2. 섹션 컴포넌트 예시

**파일**: `src/components/association/HeroSection.tsx`

```typescript
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";

interface HeroSectionProps {
  associationId: string;
}

interface AssociationData {
  name: string;
  slogan?: string;
  logoUrl?: string;
}

interface Stats {
  clubsCount: number;
  activeTournamentsCount: number;
  activeTeamsCount: number;
  thisMonthMatchesCount: number;
}

export function HeroSection({ associationId }: HeroSectionProps) {
  const [association, setAssociation] = useState<AssociationData | null>(null);
  const [stats, setStats] = useState<Stats>({
    clubsCount: 0,
    activeTournamentsCount: 0,
    activeTeamsCount: 0,
    thisMonthMatchesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 협회 정보 로드
        const associationRef = doc(db, "associations", associationId);
        const associationSnap = await getDoc(associationRef);
        
        if (associationSnap.exists()) {
          setAssociation(associationSnap.data() as AssociationData);
        }

        // 통계 로드 (실제로는 별도 서비스 함수 사용)
        // const statsData = await getAssociationStats(associationId);
        // setStats(statsData);
        
      } catch (error) {
        console.error("HeroSection 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [associationId]);

  if (loading) {
    return <div className="h-64 bg-gray-200 animate-pulse" />;
  }

  return (
    <section className="bg-gradient-to-br from-blue-50 to-white py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          {association?.logoUrl && (
            <img 
              src={association.logoUrl} 
              alt={association.name}
              className="w-24 h-24 mx-auto mb-4 rounded-full"
            />
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {association?.name || "노원구 축구협회"}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {association?.slogan || "공지 · 대회 일정 · 운동장 대관 현황을 한 화면에서 확인합니다."}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="default" size="lg">
              <Trophy className="w-4 h-4 mr-2" />
              대회 일정 보기
            </Button>
            <Button variant="outline" size="lg">
              <MapPin className="w-4 h-4 mr-2" />
              대관 신청하기
            </Button>
          </div>
        </div>

        {/* 통계 카드 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="가맹 클럽"
            value={stats.clubsCount}
            color="blue"
          />
          <StatCard
            icon={<Trophy className="w-6 h-6" />}
            label="운영 대회"
            value={stats.activeTournamentsCount}
            color="green"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="활성 팀"
            value={stats.activeTeamsCount}
            color="purple"
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            label="이번 달 경기"
            value={stats.thisMonthMatchesCount}
            color="orange"
          />
        </div>
      </div>
    </section>
  );
}
```

---

### 4-3. 공통 UI 컴포넌트

**파일**: `src/components/ui/StatCard.tsx`

```typescript
import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  color?: "blue" | "green" | "purple" | "orange";
}

export function StatCard({ icon, label, value, color = "blue" }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
```

---

## 5️⃣ 데이터 흐름

### 5-1. 데이터 로딩 전략

**TanStack Query 사용** (권장):

```typescript
// src/hooks/useAssociationHome.ts
import { useQuery } from "@tanstack/react-query";
import { getAssociationHomeData } from "@/services/associationService";

export function useAssociationHome(associationId: string) {
  return useQuery({
    queryKey: ["association", associationId, "home"],
    queryFn: () => getAssociationHomeData(associationId),
    staleTime: 5 * 60 * 1000, // 5분
  });
}
```

**서비스 함수**:

```typescript
// src/services/associationService.ts
export async function getAssociationHomeData(associationId: string) {
  // 병렬 로드
  const [association, notices, tournaments, facilities, media, clubs] = await Promise.all([
    getAssociation(associationId),
    getNotices(associationId, { limit: 5 }),
    getTournaments(associationId, { limit: 3 }),
    getFacilityStatus(associationId),
    getMedia(associationId, { limit: 8 }),
    getClubs(associationId, { limit: 8 }),
  ]);

  // 통계 계산
  const stats = await calculateAssociationStats(associationId);

  return {
    association,
    notices,
    tournaments,
    facilities,
    media,
    clubs,
    stats,
  };
}
```

---

## 6️⃣ 라우팅 구조

### 6-1. Next.js App Router 구조 (제안)

```
app/
├─ a/
│   └─ [associationSlug]/
│       ├─ layout.tsx          # 협회 공통 레이아웃
│       ├─ page.tsx            # 홈 페이지 (AssociationHomePage)
│       │
│       ├─ teams/
│       │   ├─ page.tsx        # 팀 목록
│       │   └─ [teamId]/
│       │       └─ page.tsx    # 팀 상세
│       │
│       ├─ tournaments/
│       │   ├─ page.tsx        # 대회 목록
│       │   └─ [tournamentId]/
│       │       ├─ page.tsx    # 대회 상세
│       │       ├─ standings/
│       │       ├─ matches/
│       │       └─ stats/
│       │
│       ├─ matches/
│       │   └─ [matchId]/
│       │       └─ page.tsx    # 경기 상세
│       │
│       ├─ notices/
│       │   ├─ page.tsx        # 공지 목록
│       │   └─ [noticeId]/
│       │       └─ page.tsx    # 공지 상세
│       │
│       ├─ facilities/
│       │   ├─ page.tsx        # 시설 목록
│       │   └─ [facilityId]/
│       │       └─ page.tsx    # 시설 상세
│       │
│       └─ admin/
│           ├─ page.tsx        # 관리자 대시보드
│           ├─ teams/
│           ├─ tournaments/
│           └─ settings/
```

---

### 6-2. React Router 구조 (현재)

```typescript
// src/App.tsx
<Route 
  path="/a/:associationSlug" 
  element={<AssociationHomePage />} 
/>

<Route 
  path="/a/:associationSlug/teams" 
  element={<AssociationTeamsPage />} 
/>

<Route 
  path="/a/:associationSlug/tournaments" 
  element={<AssociationTournamentsPage />} 
/>

// ... 기타 라우트
```

---

## 7️⃣ 실제 구현 가이드

### 7-1. 구현 순서

**Phase 1: 기본 구조**
1. ✅ `AssociationHomePage` 컴포넌트 생성
2. ✅ `AssociationHeader` 컴포넌트 생성
3. ✅ `HeroSection` 컴포넌트 생성
4. ✅ 라우팅 설정

**Phase 2: 데이터 연동**
1. ✅ Firestore 쿼리 함수 작성
2. ✅ TanStack Query 훅 작성
3. ✅ 데이터 로딩 및 에러 처리

**Phase 3: 섹션 구현**
1. ✅ `NoticeSection` 구현
2. ✅ `TournamentSection` 구현
3. ✅ `FacilitySection` 구현
4. ✅ `StorySection` 구현
5. ✅ `ClubSummarySection` 구현

**Phase 4: 최적화**
1. ✅ 이미지 최적화 (lazy loading)
2. ✅ 성능 최적화 (React.memo, useMemo)
3. ✅ SEO 최적화 (메타 태그)
4. ✅ 모바일 반응형

---

### 7-2. 파일 구조

```
src/
├─ pages/
│   └─ association/
│       └─ AssociationHomePage.tsx
│
├─ components/
│   ├─ association/
│   │   ├─ AssociationHeader.tsx
│   │   ├─ AssociationFooter.tsx
│   │   ├─ HeroSection.tsx
│   │   ├─ NoticeSection.tsx
│   │   ├─ TournamentSection.tsx
│   │   ├─ FacilitySection.tsx
│   │   ├─ StorySection.tsx
│   │   └─ ClubSummarySection.tsx
│   │
│   └─ ui/
│       ├─ StatCard.tsx
│       ├─ NoticeCard.tsx
│       ├─ TournamentCard.tsx
│       └─ ClubCard.tsx
│
├─ services/
│   └─ associationService.ts
│
└─ hooks/
    └─ useAssociationHome.ts
```

---

### 7-3. 스타일링 가이드

**TailwindCSS 사용** (현재 프로젝트 기준):

```typescript
// 공통 스타일 클래스
const sectionStyle = "py-12 bg-white";
const containerStyle = "container mx-auto px-4 max-w-7xl";
const cardStyle = "bg-white rounded-lg p-6 shadow-sm border border-gray-200";
```

**반응형 디자인**:
- 모바일: 1열 그리드
- 태블릿: 2열 그리드
- 데스크탑: 3-4열 그리드

---

## ✅ 최종 체크리스트

### 구현 완료 확인

- [ ] `AssociationHomePage` 컴포넌트 생성
- [ ] 6개 섹션 컴포넌트 모두 구현
- [ ] Firestore 쿼리 함수 작성
- [ ] TanStack Query 훅 작성
- [ ] 라우팅 설정 완료
- [ ] 모바일 반응형 테스트
- [ ] 성능 최적화 완료
- [ ] SEO 메타 태그 설정

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
