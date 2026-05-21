# 🏟 YAGO VIBE SPORTS - Multi-Sport Architecture (멀티 스포츠 구조) 완전 설계

> **작성일**: 2024년  
> **목적**: 여러 종목을 지원하는 확장 가능한 스포츠 OS 구조

---

## 📋 목차

1. [Multi-Sport Architecture 개념](#1-multi-sport-architecture-개념)
2. [Firestore Sport 구조](#2-firestore-sport-구조)
3. [모든 문서에 Sport 연결](#3-모든-문서에-sport-연결)
4. [종목별 Event Type 구조](#4-종목별-event-type-구조)
5. [종목별 Position 구조](#5-종목별-position-구조)
6. [Sport Context 구현](#6-sport-context-구현)
7. [Sport 기반 라우팅](#7-sport-기반-라우팅)
8. [실제 구현 코드](#8-실제-구현-코드)

---

## 1️⃣ Multi-Sport Architecture 개념

### Multi-Sport Architecture 역할

**한 종목 플랫폼이 아니라 여러 종목을 운영하는 스포츠 OS**입니다.

### 구조

```
SPORT
   ↓
Federation
   ↓
League
   ↓
Team
   ↓
Match
   ↓
Player
```

### 지원 종목

```
⚽ 축구 (Soccer)
⚾ 야구 (Baseball)
🏀 농구 (Basketball)
🏸 배드민턴 (Badminton)
⚽ 풋살 (Futsal)
🏐 배구 (Volleyball)
🎾 테니스 (Tennis)
```

---

## 2️⃣ Firestore Sport 구조

### 2-1. Sports 컬렉션

```
sports/{sportId}
```

**문서 스키마**:
```typescript
{
  id: string; // "soccer", "baseball", "basketball"
  name: string; // "축구", "야구", "농구"
  nameEn: string; // "Soccer", "Baseball", "Basketball"
  key: string; // "soccer" (URL slug)
  icon: string; // "⚽", "⚾", "🏀"
  description?: string;
  createdAt: Timestamp;
}
```

### 2-2. 종목별 예시

#### 축구 (Soccer)

```json
{
  "id": "soccer",
  "name": "축구",
  "nameEn": "Soccer",
  "key": "soccer",
  "icon": "⚽",
  "description": "11명씩 두 팀이 경기하는 구기 종목"
}
```

#### 야구 (Baseball)

```json
{
  "id": "baseball",
  "name": "야구",
  "nameEn": "Baseball",
  "key": "baseball",
  "icon": "⚾",
  "description": "9명씩 두 팀이 경기하는 구기 종목"
}
```

#### 농구 (Basketball)

```json
{
  "id": "basketball",
  "name": "농구",
  "nameEn": "Basketball",
  "key": "basketball",
  "icon": "🏀",
  "description": "5명씩 두 팀이 경기하는 구기 종목"
}
```

---

## 3️⃣ 모든 문서에 Sport 연결

### 3-1. Teams에 Sport 추가

```
teams/{teamId}
```

**문서 스키마**:
```typescript
{
  name: string;
  sport: string; // "soccer", "baseball", "basketball"
  sportId: string; // 참조용
  region: string;
  // ... 기타 필드
}
```

### 3-2. Matches에 Sport 추가

```
matches/{matchId}
```

**문서 스키마**:
```typescript
{
  sport: string; // "soccer"
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  // ... 기타 필드
}
```

### 3-3. Leagues에 Sport 추가

```
leagues/{leagueId}
```

**문서 스키마**:
```typescript
{
  sport: string; // "soccer"
  sportId: string;
  name: string;
  season: string;
  // ... 기타 필드
}
```

### 3-4. Players에 Sport 추가

```
players/{playerId}
```

**문서 스키마**:
```typescript
{
  name: string;
  sport: string; // "soccer"
  sportId: string;
  position: string; // "FW", "MF", "DF", "GK"
  // ... 기타 필드
}
```

### 3-5. Tournaments에 Sport 추가

```
tournaments/{tournamentId}
```

**문서 스키마**:
```typescript
{
  sport: string; // "soccer"
  sportId: string;
  name: string;
  // ... 기타 필드
}
```

---

## 4️⃣ 종목별 Event Type 구조

### 4-1. Event Types 서브컬렉션

```
sports/{sportId}/eventTypes/{eventTypeId}
```

**문서 스키마**:
```typescript
{
  type: string; // "goal", "assist", "yellow_card"
  label: string; // "골", "어시스트", "경고"
  icon?: string; // "⚽", "🎯", "🟨"
  category: "offensive" | "defensive" | "disciplinary" | "substitution";
  points?: number; // 점수에 영향을 주는 경우
}
```

### 4-2. 축구 Event Types

```typescript
// sports/soccer/eventTypes/goal
{
  type: "goal",
  label: "골",
  icon: "⚽",
  category: "offensive",
  points: 1
}

// sports/soccer/eventTypes/assist
{
  type: "assist",
  label: "어시스트",
  icon: "🎯",
  category: "offensive"
}

// sports/soccer/eventTypes/yellow_card
{
  type: "yellow_card",
  label: "경고",
  icon: "🟨",
  category: "disciplinary"
}

// sports/soccer/eventTypes/red_card
{
  type: "red_card",
  label: "퇴장",
  icon: "🟥",
  category: "disciplinary"
}

// sports/soccer/eventTypes/substitution
{
  type: "substitution",
  label: "교체",
  icon: "🔄",
  category: "substitution"
}
```

### 4-3. 야구 Event Types

```typescript
// sports/baseball/eventTypes/hit
{
  type: "hit",
  label: "안타",
  icon: "⚾",
  category: "offensive"
}

// sports/baseball/eventTypes/home_run
{
  type: "home_run",
  label: "홈런",
  icon: "💥",
  category: "offensive",
  points: 1
}

// sports/baseball/eventTypes/strikeout
{
  type: "strikeout",
  label: "삼진",
  icon: "❌",
  category: "defensive"
}

// sports/baseball/eventTypes/walk
{
  type: "walk",
  label: "볼넷",
  icon: "🚶",
  category: "offensive"
}
```

### 4-4. 농구 Event Types

```typescript
// sports/basketball/eventTypes/field_goal
{
  type: "field_goal",
  label: "야투",
  icon: "🏀",
  category: "offensive",
  points: 2
}

// sports/basketball/eventTypes/three_pointer
{
  type: "three_pointer",
  label: "3점슛",
  icon: "🎯",
  category: "offensive",
  points: 3
}

// sports/basketball/eventTypes/free_throw
{
  type: "free_throw",
  label: "자유투",
  icon: "🎲",
  category: "offensive",
  points: 1
}

// sports/basketball/eventTypes/rebound
{
  type: "rebound",
  label: "리바운드",
  icon: "📦",
  category: "defensive"
}

// sports/basketball/eventTypes/assist
{
  type: "assist",
  label: "어시스트",
  icon: "🎯",
  category: "offensive"
}

// sports/basketball/eventTypes/steal
{
  type: "steal",
  label: "스틸",
  icon: "👋",
  category: "defensive"
}

// sports/basketball/eventTypes/block
{
  type: "block",
  label: "블록",
  icon: "🛡️",
  category: "defensive"
}
```

---

## 5️⃣ 종목별 Position 구조

### 5-1. Positions 서브컬렉션

```
sports/{sportId}/positions/{positionId}
```

**문서 스키마**:
```typescript
{
  id: string; // "FW", "MF", "DF", "GK"
  label: string; // "공격수", "미드필더", "수비수", "골키퍼"
  labelEn: string; // "Forward", "Midfielder", "Defender", "Goalkeeper"
  category: "offensive" | "defensive" | "goalkeeper" | "utility";
  order: number; // 표시 순서
}
```

### 5-2. 축구 Positions

```typescript
// sports/soccer/positions/FW
{
  id: "FW",
  label: "공격수",
  labelEn: "Forward",
  category: "offensive",
  order: 1
}

// sports/soccer/positions/MF
{
  id: "MF",
  label: "미드필더",
  labelEn: "Midfielder",
  category: "utility",
  order: 2
}

// sports/soccer/positions/DF
{
  id: "DF",
  label: "수비수",
  labelEn: "Defender",
  category: "defensive",
  order: 3
}

// sports/soccer/positions/GK
{
  id: "GK",
  label: "골키퍼",
  labelEn: "Goalkeeper",
  category: "goalkeeper",
  order: 4
}
```

### 5-3. 야구 Positions

```typescript
// sports/baseball/positions/P
{
  id: "P",
  label: "투수",
  labelEn: "Pitcher",
  category: "defensive",
  order: 1
}

// sports/baseball/positions/C
{
  id: "C",
  label: "포수",
  labelEn: "Catcher",
  category: "defensive",
  order: 2
}

// sports/baseball/positions/1B
{
  id: "1B",
  label: "1루수",
  labelEn: "First Base",
  category: "defensive",
  order: 3
}

// ... 2B, 3B, SS, LF, CF, RF
```

### 5-4. 농구 Positions

```typescript
// sports/basketball/positions/PG
{
  id: "PG",
  label: "포인트 가드",
  labelEn: "Point Guard",
  category: "offensive",
  order: 1
}

// sports/basketball/positions/SG
{
  id: "SG",
  label: "슈팅 가드",
  labelEn: "Shooting Guard",
  category: "offensive",
  order: 2
}

// sports/basketball/positions/SF
{
  id: "SF",
  label: "스몰 포워드",
  labelEn: "Small Forward",
  category: "utility",
  order: 3
}

// sports/basketball/positions/PF
{
  id: "PF",
  label: "파워 포워드",
  labelEn: "Power Forward",
  category: "defensive",
  order: 4
}

// sports/basketball/positions/C
{
  id: "C",
  label: "센터",
  labelEn: "Center",
  category: "defensive",
  order: 5
}
```

---

## 6️⃣ Sport Context 구현

### 6-1. Sport Context 생성

```typescript
// src/context/SportContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getSport, Sport } from "@/services/sportService";

interface SportContextType {
  sport: Sport | null;
  loading: boolean;
  setSport: (sport: Sport | null) => void;
}

const SportContext = createContext<SportContextType>({
  sport: null,
  loading: true,
  setSport: () => {},
});

export function SportProvider({ children }: { children: ReactNode }) {
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
    }).catch((error) => {
      console.error("Sport 로드 실패:", error);
      setLoading(false);
    });
  }, [sportId]);
  
  return (
    <SportContext.Provider value={{ sport, loading, setSport }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error("useSport must be used within SportProvider");
  }
  return context;
}
```

### 6-2. App에 SportProvider 추가

```typescript
// src/App.tsx
import { SportProvider } from "@/context/SportContext";

function App() {
  return (
    <SportProvider>
      <Router>
        {/* 라우트 */}
      </Router>
    </SportProvider>
  );
}
```

---

## 7️⃣ Sport 기반 라우팅

### 7-1. 라우팅 구조

```
/sports
/sports/{sportId}
/sports/{sportId}/teams
/sports/{sportId}/matches
/sports/{sportId}/players
/sports/{sportId}/leagues
```

### 7-2. Sport Selection Page

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
      baseball: "⚾",
      basketball: "🏀",
      badminton: "🏸",
      futsal: "⚽",
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
              onClick={() => navigate(`/sports/${sport.key}`)}
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

### 7-3. Sport Layout

```typescript
// src/pages/sports/[sportId]/SportLayout.tsx
import { Outlet } from "react-router-dom";
import { useSport } from "@/context/SportContext";
import { SportNavigation } from "@/components/sports/SportNavigation";

export default function SportLayout() {
  const { sport, loading } = useSport();
  
  if (loading) return <div>로딩 중...</div>;
  if (!sport) return <div>스포츠를 찾을 수 없습니다</div>;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{sport.icon}</span>
            <h1 className="text-2xl font-bold">{sport.name}</h1>
          </div>
        </div>
      </div>
      
      <SportNavigation sportId={sport.id} />
      
      <div className="container mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}
```

---

## 8️⃣ 실제 구현 코드

### 8-1. Sport Service

```typescript
// src/services/sportService.ts
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Sport {
  id: string;
  name: string;
  nameEn: string;
  key: string;
  icon: string;
  description?: string;
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

export async function getSportByKey(key: string): Promise<Sport | null> {
  const sportsRef = collection(db, "sports");
  const snapshot = await getDocs(sportsRef);
  
  const sport = snapshot.docs.find(doc => doc.data().key === key);
  if (!sport) return null;
  
  return {
    id: sport.id,
    ...sport.data()
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

### 8-2. Sport Navigation 컴포넌트

```typescript
// src/components/sports/SportNavigation.tsx
import { NavLink } from "react-router-dom";
import { useSport } from "@/context/SportContext";

interface SportNavigationProps {
  sportId: string;
}

export function SportNavigation({ sportId }: SportNavigationProps) {
  const { sport } = useSport();
  
  if (!sport) return null;
  
  const navItems = [
    { path: `/sports/${sport.key}`, label: "홈" },
    { path: `/sports/${sport.key}/teams`, label: "팀" },
    { path: `/sports/${sport.key}/matches`, label: "경기" },
    { path: `/sports/${sport.key}/players`, label: "선수" },
    { path: `/sports/${sport.key}/leagues`, label: "리그" },
    { path: `/sports/${sport.key}/stats`, label: "통계" },
  ];
  
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-3 border-b-2 transition ${
                  isActive
                    ? "border-blue-600 text-blue-600 font-semibold"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

### 8-3. Sport 필터 Hook

```typescript
// src/hooks/useSportFilter.ts
import { useSport } from "@/context/SportContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useSportFilter() {
  const { sport } = useSport();
  
  const filterBySport = async <T>(
    collectionPath: string,
    additionalFilters?: any[]
  ): Promise<T[]> => {
    if (!sport) return [];
    
    const collectionRef = collection(db, collectionPath);
    let q = query(collectionRef, where("sport", "==", sport.id));
    
    if (additionalFilters) {
      additionalFilters.forEach(filter => {
        q = query(q, filter);
      });
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  };
  
  return { sport, filterBySport };
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Sports 컬렉션 생성
- [ ] Sport Service 구현
- [ ] Sport Context 구현
- [ ] 모든 문서에 sport 필드 추가
- [ ] 종목 선택 페이지

### Phase 2 (다음)
- [ ] 종목별 Event Types 구조
- [ ] 종목별 Positions 구조
- [ ] Sport 기반 라우팅
- [ ] Sport Navigation

### Phase 3 (확장)
- [ ] 종목별 Match Card
- [ ] 종목별 Stats 컴포넌트
- [ ] 종목별 이벤트 타임라인

---

## 🚀 추천 시작 종목

### 1차 종목

```
⚽ 축구
⚽ 풋살
```

**이유**:
- 생활체육 팀 많음
- 리그 구조 단순
- 데이터 표준화 쉬움

### 2차 종목

```
⚾ 야구
🏀 농구
```

### 3차 종목

```
🏸 배드민턴
🏐 배구
```

---

**작성일**: 2024년  
**상태**: ✅ Multi-Sport Architecture 완전 설계 완료
