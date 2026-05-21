# ⚽ YAGO VIBE SPORTS - 멀티 스포츠 아키텍처 설계

> **작성일**: 2024년  
> **목적**: 축구, 농구, 야구, 배드민턴 등 여러 종목을 지원하는 확장 가능한 구조

---

## 📋 목차

1. [멀티 스포츠 개념](#1-멀티-스포츠-개념)
2. [스포츠 종목 구조](#2-스포츠-종목-구조)
3. [Firestore 구조](#3-firestore-구조)
4. [종목별 데이터 구조](#4-종목별-데이터-구조)
5. [UI 구조](#5-ui-구조)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ 멀티 스포츠 개념

### 멀티 스포츠 아키텍처 역할

**여러 스포츠 종목을 하나의 플랫폼에서 지원하는 확장 가능한 구조**입니다.

### 지원 종목

```
⚽ 축구 (Soccer)
🏀 농구 (Basketball)
⚾ 야구 (Baseball)
🏸 배드민턴 (Badminton)
🏐 배구 (Volleyball)
🎾 테니스 (Tennis)
```

### 종목별 차이점

```
리그 구조
선수 기록
경기 이벤트
통계
```

가 **종목마다 다릅니다.**

---

## 2️⃣ 스포츠 종목 구조

### 2-1. Sports 컬렉션

```
sports/{sportId}
```

**문서 스키마**:
```typescript
{
  id: string; // "soccer", "basketball", "baseball"
  name: string; // "축구", "농구", "야구"
  nameEn: string; // "Soccer", "Basketball", "Baseball"
  icon: string; // 아이콘 URL
  positions: string[]; // 포지션 목록
  stats: {
    player: string[]; // 선수 통계 항목
    team: string[]; // 팀 통계 항목
  };
  eventTypes: string[]; // 경기 이벤트 타입
  createdAt: Timestamp;
}
```

### 2-2. 종목별 예시

#### 축구 (Soccer)

```typescript
{
  id: "soccer",
  name: "축구",
  nameEn: "Soccer",
  positions: ["GK", "DF", "MF", "FW"],
  stats: {
    player: ["goals", "assists", "yellowCards", "redCards", "minutesPlayed"],
    team: ["wins", "draws", "losses", "goalsFor", "goalsAgainst", "points"]
  },
  eventTypes: ["goal", "assist", "yellow_card", "red_card", "substitution"]
}
```

#### 농구 (Basketball)

```typescript
{
  id: "basketball",
  name: "농구",
  nameEn: "Basketball",
  positions: ["PG", "SG", "SF", "PF", "C"],
  stats: {
    player: ["points", "rebounds", "assists", "steals", "blocks", "minutesPlayed"],
    team: ["wins", "losses", "pointsFor", "pointsAgainst", "winRate"]
  },
  eventTypes: ["field_goal", "three_pointer", "free_throw", "rebound", "assist", "steal", "block"]
}
```

#### 야구 (Baseball)

```typescript
{
  id: "baseball",
  name: "야구",
  nameEn: "Baseball",
  positions: ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"],
  stats: {
    player: ["atBats", "hits", "homeRuns", "runs", "rbis", "strikeouts"],
    team: ["wins", "losses", "runsFor", "runsAgainst", "winRate"]
  },
  eventTypes: ["single", "double", "triple", "home_run", "strikeout", "walk", "hit_by_pitch"]
}
```

---

## 3️⃣ Firestore 구조

### 3-1. 모든 문서에 sportId 포함

```
모든 문서에 sportId 필드 추가

teams/{teamId}
  sportId: "soccer"

matches/{matchId}
  sportId: "soccer"

players/{playerId}
  sportId: "soccer"
```

### 3-2. 종목별 서브컬렉션 (선택적)

```
sports/{sportId}/leagues/{leagueId}
sports/{sportId}/teams/{teamId}
sports/{sportId}/players/{playerId}
```

---

## 4️⃣ 종목별 데이터 구조

### 4-1. Match Events 구조

#### 축구

```typescript
{
  type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution";
  minute: number;
  playerId: string;
  assistPlayerId?: string;
}
```

#### 농구

```typescript
{
  type: "field_goal" | "three_pointer" | "free_throw" | "rebound" | "assist" | "steal" | "block";
  quarter: number;
  time: string; // "10:30"
  playerId: string;
  assistPlayerId?: string;
  points?: number;
}
```

#### 야구

```typescript
{
  type: "single" | "double" | "triple" | "home_run" | "strikeout" | "walk" | "hit_by_pitch";
  inning: number;
  playerId: string;
  rbis?: number;
}
```

### 4-2. Player Stats 구조

#### 축구

```typescript
{
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}
```

#### 농구

```typescript
{
  games: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  minutesPlayed: number;
}
```

#### 야구

```typescript
{
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  runs: number;
  rbis: number;
  strikeouts: number;
  battingAverage: number;
}
```

---

## 5️⃣ UI 구조

### 5-1. 종목 선택 페이지

```
/sports
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 스포츠 선택                               │
│                                          │
│ ┌──────────┐  ┌──────────┐            │
│ │ ⚽ 축구    │  │ 🏀 농구   │            │
│ │          │  │          │            │
│ │ [선택]    │  │ [선택]    │            │
│ └──────────┘  └──────────┘            │
│                                          │
│ ┌──────────┐  ┌──────────┐            │
│ │ ⚾ 야구    │  │ 🏸 배드민턴│            │
│ │          │  │          │            │
│ │ [선택]    │  │ [선택]    │            │
│ └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

### 5-2. 종목별 라우팅

```
/sports/{sportId}
/sports/{sportId}/teams
/sports/{sportId}/matches
/sports/{sportId}/players
/sports/{sportId}/leagues
```

### 5-3. 종목별 UI 컴포넌트

```
components/sports/soccer/
  ├─ SoccerMatchCard.tsx
  ├─ SoccerStats.tsx
  └─ SoccerEventTimeline.tsx

components/sports/basketball/
  ├─ BasketballMatchCard.tsx
  ├─ BasketballStats.tsx
  └─ BasketballEventTimeline.tsx
```

---

## 6️⃣ 실제 구현 코드

### 6-1. Sport Service

```typescript
// src/services/sportService.ts
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Sport {
  id: string;
  name: string;
  nameEn: string;
  icon?: string;
  positions: string[];
  stats: {
    player: string[];
    team: string[];
  };
  eventTypes: string[];
}

export async function getSport(sportId: string): Promise<Sport | null> {
  const sportRef = doc(db, "sports", sportId);
  const sportSnap = await getDoc(sportRef);
  
  if (!sportSnap.exists()) {
    return null;
  }
  
  return {
    id: sportSnap.id,
    ...sportSnap.data()
  } as Sport;
}

export async function getAllSports(): Promise<Sport[]> {
  const sportsRef = collection(db, "sports");
  const snapshot = await getDocs(sportsRef);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Sport[];
}
```

### 6-2. Sport Context

```typescript
// src/context/SportContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getSport, Sport } from "@/services/sportService";

interface SportContextType {
  sport: Sport | null;
  loading: boolean;
}

const SportContext = createContext<SportContextType>({
  sport: null,
  loading: true,
});

export function SportProvider({ children }: { children: React.ReactNode }) {
  const { sportId } = useParams<{ sportId: string }>();
  const [sport, setSport] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!sportId) {
      setLoading(false);
      return;
    }
    
    getSport(sportId).then((sportData) => {
      setSport(sportData);
      setLoading(false);
    });
  }, [sportId]);
  
  return (
    <SportContext.Provider value={{ sport, loading }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  return useContext(SportContext);
}
```

### 6-3. 종목별 Match Card 컴포넌트

```typescript
// src/components/match/SportMatchCard.tsx
import { useSport } from "@/context/SportContext";
import { SoccerMatchCard } from "@/components/sports/soccer/SoccerMatchCard";
import { BasketballMatchCard } from "@/components/sports/basketball/BasketballMatchCard";
import { BaseballMatchCard } from "@/components/sports/baseball/BaseballMatchCard";

interface SportMatchCardProps {
  match: any;
}

export function SportMatchCard({ match }: SportMatchCardProps) {
  const { sport } = useSport();
  
  if (!sport) return null;
  
  switch (sport.id) {
    case "soccer":
      return <SoccerMatchCard match={match} />;
    case "basketball":
      return <BasketballMatchCard match={match} />;
    case "baseball":
      return <BaseballMatchCard match={match} />;
    default:
      return <div>지원하지 않는 종목입니다</div>;
  }
}
```

### 6-4. 축구 Match Card 예시

```typescript
// src/components/sports/soccer/SoccerMatchCard.tsx
interface SoccerMatchCardProps {
  match: {
    homeTeamName: string;
    awayTeamName: string;
    score: { home: number; away: number };
    status: string;
  };
}

export function SoccerMatchCard({ match }: SoccerMatchCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <div className="font-bold">{match.homeTeamName}</div>
        </div>
        <div className="text-2xl font-bold mx-4">
          {match.score.home} : {match.score.away}
        </div>
        <div className="text-center flex-1">
          <div className="font-bold">{match.awayTeamName}</div>
        </div>
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        {match.status === "live" && "🔴 LIVE"}
      </div>
    </div>
  );
}
```

### 6-5. 농구 Match Card 예시

```typescript
// src/components/sports/basketball/BasketballMatchCard.tsx
interface BasketballMatchCardProps {
  match: {
    homeTeamName: string;
    awayTeamName: string;
    score: { home: number; away: number };
    status: string;
    currentQuarter?: number;
  };
}

export function BasketballMatchCard({ match }: BasketballMatchCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <div className="font-bold">{match.homeTeamName}</div>
        </div>
        <div className="text-2xl font-bold mx-4">
          {match.score.home} : {match.score.away}
        </div>
        <div className="text-center flex-1">
          <div className="font-bold">{match.awayTeamName}</div>
        </div>
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        {match.status === "live" && match.currentQuarter && (
          <span>🔴 LIVE Q{match.currentQuarter}</span>
        )}
      </div>
    </div>
  );
}
```

### 6-6. 종목 선택 페이지

```typescript
// src/pages/sports/SportSelectionPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllSports, Sport } from "@/services/sportService";

export default function SportSelectionPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    getAllSports().then((sportsData) => {
      setSports(sportsData);
      setLoading(false);
    });
  }, []);
  
  if (loading) return <div>로딩 중...</div>;
  
  const getSportIcon = (sportId: string) => {
    const icons: Record<string, string> = {
      soccer: "⚽",
      basketball: "🏀",
      baseball: "⚾",
      badminton: "🏸",
      volleyball: "🏐",
      tennis: "🎾",
    };
    return icons[sportId] || "🏃";
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">스포츠 선택</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => navigate(`/sports/${sport.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
            >
              <div className="text-6xl mb-4 text-center">
                {getSportIcon(sport.id)}
              </div>
              <div className="text-xl font-bold text-center mb-2">
                {sport.name}
              </div>
              <div className="text-sm text-gray-500 text-center">
                {sport.nameEn}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Sports 컬렉션 생성
- [ ] Sport Service 구현
- [ ] Sport Context 구현
- [ ] 종목 선택 페이지

### Phase 2 (다음)
- [ ] 축구 Match Card
- [ ] 농구 Match Card
- [ ] 야구 Match Card
- [ ] 종목별 Stats 컴포넌트

### Phase 3 (확장)
- [ ] 종목별 이벤트 타입
- [ ] 종목별 통계 계산
- [ ] 종목별 랭킹 시스템

---

## 🚀 추천 시작 종목

### 1단계: 축구

```
⚽ 축구

리그 구조: 명확
선수 기록: 표준화됨
경기 이벤트: 단순
통계: 잘 정의됨
```

### 2단계: 풋살

```
⚽ 풋살

축구와 유사한 구조
빠른 확장 가능
```

### 3단계: 농구

```
🏀 농구

통계 구조 명확
경기 이벤트 다양
```

---

**작성일**: 2024년  
**상태**: ✅ 멀티 스포츠 아키텍처 설계 완료
