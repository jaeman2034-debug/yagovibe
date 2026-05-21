# 🗺️ YAGO SPORTS 전체 UI 화면 지도 (실제 서비스 구조)

> **작성일**: 2024년  
> **목적**: 개발자가 바로 구현할 수 있는 실제 서비스 수준의 UI/UX 구조

---

## 📋 목차

1. [플랫폼 전체 구조](#1-플랫폼-전체-구조)
2. [페이지별 상세 설계](#2-페이지별-상세-설계)
3. [컴포넌트 구조](#3-컴포넌트-구조)
4. [데이터 흐름](#4-데이터-흐름)
5. [실제 구현 코드 예시](#5-실제-구현-코드-예시)

---

## 1️⃣ 플랫폼 전체 구조

### YAGO SPORTS = Sports Operating System

```
YAGO SPORTS PLATFORM
│
├─ HOME (/home)
│   ├─ Quick Start (빠른 시작)
│   │   ├─ 거래 (Trading)
│   │   ├─ 경기 활동 (Sports Activity)
│   │   └─ 이벤트 (Events)
│   ├─ Activity Feed (활동 피드)
│   └─ Personal Stats (개인 통계)
│
├─ SPORTS HUB (/sports)
│   ├─ 내 팀 (Teams)
│   ├─ 경기 (Matches)
│   ├─ 팀 이벤트 (Team Events)
│   ├─ 선수 (Players)
│   ├─ 통계 (Statistics)
│   ├─ 대회 (Tournaments)
│   └─ 유소년 아카데미 (Academy)
│
├─ MARKETPLACE (/sports/:sport/market)
│   ├─ 상품 목록
│   ├─ 상품 상세
│   └─ 글쓰기
│
└─ COMMUNITY
    ├─ Activity Feed
    ├─ Social Features
    └─ Media Gallery
```

---

## 2️⃣ 페이지별 상세 설계

### 2-1. Sports Hub (/sports)

**파일**: `src/pages/sports/SportsActivityPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ Header (YAGO SPORTS)                    │
├─────────────────────────────────────────┤
│ 스포츠 활동                              │
│ 팀, 경기, 선수, 통계 및 대회를 관리하세요 │
├─────────────────────────────────────────┤
│ [ 내 팀 ]    [ 경기 ]    [ 팀 이벤트 ]   │
│ [ 선수 ]     [ 통계 ]    [ 대회 ]       │
│ [ 유소년 아카데미 ]                      │
└─────────────────────────────────────────┘
```

**구현 코드**:
```typescript
// src/pages/sports/SportsActivityPage.tsx
export default function SportsActivityPage() {
  const modules = [
    {
      title: "내 팀",
      description: "팀 관리 및 생성",
      icon: Users,
      links: [
        { label: "내 팀 보기", path: "/teams" },
        { label: "팀 생성", path: "/team/create" },
        { label: "팀 찾기", path: "/teams/search" },
      ],
    },
    // ... 나머지 모듈
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            스포츠 활동
          </h1>
          <p className="text-gray-500 text-lg">
            팀, 경기, 선수, 통계 및 대회를 관리하세요
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <SportsModuleCard key={index} {...module} />
          ))}
        </div>
      </main>
    </div>
  );
}
```

---

### 2-2. Teams Entry Page (/teams)

**파일**: `src/pages/teams/TeamsDirectoryPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ Header                                  │
├─────────────────────────────────────────┤
│ 팀                                      │
│                                         │
│ [ 내 팀 보기 ]  [ 팀 생성 ]  [ 팀 찾기 ] │
├─────────────────────────────────────────┤
│ 최근 활동                                │
│ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 팀1 │ │ 팀2 │ │ 팀3 │               │
│ └─────┘ └─────┘ └─────┘               │
├─────────────────────────────────────────┤
│ 추천 팀                                  │
│ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 팀4 │ │ 팀5 │ │ 팀6 │               │
│ └─────┘ └─────┘ └─────┘               │
├─────────────────────────────────────────┤
│ 지역 팀                                  │
│ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 팀7 │ │ 팀8 │ │ 팀9 │               │
│ └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────┘
```

**구현 코드**:
```typescript
// src/pages/teams/TeamsDirectoryPage.tsx
export default function TeamsDirectoryPage() {
  const { user } = useAuth();
  const { teamMembers } = useMyTeams();
  const [recentTeams, setRecentTeams] = useState<Team[]>([]);
  const [recommendedTeams, setRecommendedTeams] = useState<Team[]>([]);
  const [regionalTeams, setRegionalTeams] = useState<Team[]>([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">팀</h1>
          <div className="flex gap-4 mt-4">
            <Link
              to="/teams"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              내 팀 보기
            </Link>
            <Link
              to="/team/create"
              className="px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              팀 생성
            </Link>
            <Link
              to="/teams/search"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              팀 찾기
            </Link>
          </div>
        </div>

        {/* 최근 활동 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">최근 활동</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>

        {/* 추천 팀 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">추천 팀</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>

        {/* 지역 팀 */}
        <section>
          <h2 className="text-xl font-bold mb-4">지역 팀</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {regionalTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

---

### 2-3. Team Workspace (/sports/:type/team/*)

**파일**: `src/pages/team/MyTeamPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ Team Header                              │
│ [로고] 팀명  지역  팔로우                │
├─────────────────────────────────────────┤
│ [ 일정 ] [ 멤버 ] [ 기록 ] [ 공지 ]     │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (일정/멤버/기록/공지 내용)                │
└─────────────────────────────────────────┘
```

**탭 구조**:
- 일정 (Schedule): `/sports/:type/team/schedule`
- 멤버 (Members): `/sports/:type/team/members`
- 기록 (Records): `/sports/:type/team/records`
- 공지 (Notices): `/sports/:type/team/notices`

---

### 2-4. Matches Page (/matches)

**파일**: `src/pages/matches/MatchListPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ 경기                                     │
│                                         │
│ [ 경기 생성 ]  [ 경기 일정 ]  [ 경기 결과 ] │
├─────────────────────────────────────────┤
│ 오늘 경기                                │
│ ┌─────────────────────────────────┐    │
│ │ 노원FC 2 : 1 상계FC              │    │
│ │ 2024-03-15 15:00                │    │
│ └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│ 예정 경기                                │
│ ┌─────────────────────────────────┐    │
│ │ 노원FC vs 상계FC                │    │
│ │ 2024-03-20 15:00                │    │
│ └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│ 최근 결과                                │
│ ┌─────────────────────────────────┐    │
│ │ 노원FC 2 : 1 상계FC              │    │
│ │ 2024-03-10 15:00                │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### 2-5. Tournament Page (/tournaments)

**파일**: `src/pages/tournaments/TournamentListPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ 대회                                     │
│                                         │
│ [ 대회 목록 ]  [ 리그 ]  [ 토너먼트 ]    │
├─────────────────────────────────────────┤
│ 진행 중인 대회                           │
│ ┌─────────────────────────────────┐    │
│ │ 2024 노원구 리그                 │    │
│ │ 12팀 / 36경기 / 진행중          │    │
│ └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│ 예정 대회                                │
│ ┌─────────────────────────────────┐    │
│ │ 2024 노원구 컵                   │    │
│ │ 모집중 / 3월 시작                │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### 2-6. Players Page (/players)

**파일**: `src/pages/players/PlayerListPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ 선수                                     │
│                                         │
│ [ 선수 목록 ]  [ 선수 검색 ]            │
├─────────────────────────────────────────┤
│ 선수 목록                                │
│ ┌─────────────────────────────────┐    │
│ │ 홍길동 (FW) - 노원FC             │    │
│ │ 10골 5도움                        │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### 2-7. Stats Page (/stats)

**파일**: `src/pages/stats/StatsPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ 통계                                     │
│                                         │
│ [ 팀 통계 ]  [ 선수 통계 ]  [ 랭킹 ]    │
├─────────────────────────────────────────┤
│ 득점 랭킹                                │
│ 1. 홍길동 (노원FC) - 10골               │
│ 2. 김철수 (상계FC) - 8골                │
│ 3. 박민수 (노원FC) - 7골                │
├─────────────────────────────────────────┤
│ 도움 랭킹                                │
│ 1. 이영희 (노원FC) - 12도움             │
│ 2. 정수진 (상계FC) - 9도움              │
└─────────────────────────────────────────┘
```

---

### 2-8. Academy Page (/academy)

**파일**: `src/pages/academy/AcademyListPage.tsx`

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ 유소년 아카데미                           │
│                                         │
│ [ 아카데미 ]  [ 프로그램 ]  [ 코치 ]    │
├─────────────────────────────────────────┤
│ 아카데미 목록                            │
│ ┌─────────────────────────────────┐    │
│ │ 노원FC 유소년 아카데미            │    │
│ │ 축구 / 노원구 / 50명             │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 3️⃣ 컴포넌트 구조

### 3-1. 공통 컴포넌트

```typescript
// src/components/ui/
├─ Button.tsx
├─ Card.tsx
├─ Badge.tsx
├─ Avatar.tsx
├─ Tabs.tsx
├─ Modal.tsx
├─ Input.tsx
└─ Select.tsx
```

### 3-2. 도메인 컴포넌트

```typescript
// src/components/
├─ sports/
│   └─ SportsModuleCard.tsx
├─ team/
│   ├─ TeamCard.tsx
│   ├─ TeamHeader.tsx
│   └─ TeamTabs.tsx
├─ match/
│   ├─ MatchCard.tsx
│   └─ MatchHeader.tsx
├─ tournament/
│   ├─ TournamentCard.tsx
│   └─ TournamentHeader.tsx
├─ player/
│   ├─ PlayerCard.tsx
│   └─ PlayerHeader.tsx
└─ stats/
    ├─ StatsCard.tsx
    └─ RankingList.tsx
```

---

## 4️⃣ 데이터 흐름

### 4-1. Sports Hub → Teams

```
/sports
  ↓
"내 팀" 클릭
  ↓
/teams
  ↓
팀 선택
  ↓
/sports/:type/team/*
```

### 4-2. Teams → Team Workspace

```
/teams
  ↓
팀 클릭
  ↓
/sports/:type/team/*
  ↓
탭 선택 (일정/멤버/기록/공지)
```

### 4-3. Team Workspace → Events

```
/sports/:type/team/*
  ↓
"이벤트" 탭 또는 "팀 이벤트" 모듈
  ↓
/teams/:teamId/events
  ↓
이벤트 생성/관리
```

---

## 5️⃣ 실제 구현 코드 예시

### 5-1. Teams Directory Page

```typescript
// src/pages/teams/TeamsDirectoryPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import Header from "@/layout/Header";
import TeamCard from "@/components/team/TeamCard";

export default function TeamsDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentTeams, setRecentTeams] = useState<any[]>([]);
  const [recommendedTeams, setRecommendedTeams] = useState<any[]>([]);
  const [regionalTeams, setRegionalTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // 최근 활동 팀
        const recentQuery = query(
          collection(db, "teams"),
          where("visibility", "==", "public"),
          where("status", "==", "active"),
          orderBy("lastActivityAt", "desc"),
          limit(6)
        );
        const recentSnap = await getDocs(recentQuery);
        setRecentTeams(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 추천 팀 (사용자 지역 기반)
        if (user?.region) {
          const recommendedQuery = query(
            collection(db, "teams"),
            where("region", "==", user.region),
            where("visibility", "==", "public"),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
            limit(6)
          );
          const recommendedSnap = await getDocs(recommendedQuery);
          setRecommendedTeams(recommendedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        // 지역 팀
        if (user?.region) {
          const regionalQuery = query(
            collection(db, "teams"),
            where("region", "==", user.region),
            where("visibility", "==", "public"),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
            limit(9)
          );
          const regionalSnap = await getDocs(regionalQuery);
          setRegionalTeams(regionalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error("팀 목록 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [user]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">팀</h1>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => navigate("/teams")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              내 팀 보기
            </button>
            <button
              onClick={() => navigate("/team/create")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              팀 생성
            </button>
            <button
              onClick={() => navigate("/teams/search")}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              팀 찾기
            </button>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">최근 활동</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">추천 팀</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">지역 팀</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {regionalTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

---

## 6️⃣ 페이지 구현 우선순위

### Phase 1 (즉시 구현)
1. ✅ Sports Hub (/sports) - 완료
2. ⚠️ Teams Entry (/teams) - 구현 필요
3. ⚠️ Team Workspace (/sports/:type/team/*) - 부분 구현

### Phase 2 (다음 단계)
4. ⚠️ Matches (/matches) - 구현 필요
5. ⚠️ Tournaments (/tournaments) - 부분 구현
6. ⚠️ Players (/players) - 부분 구현

### Phase 3 (확장)
7. ⚠️ Stats (/stats) - 구현 필요
8. ⚠️ Academy (/academy) - 구현 필요

---

**작성일**: 2024년  
**상태**: ✅ 개발 수준 UI 지도 완료
