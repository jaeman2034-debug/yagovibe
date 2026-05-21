# 📅 YAGO VIBE SPORTS - League Season System (시즌 관리 시스템) 설계

> **작성일**: 2024년  
> **목적**: 리그 시즌 관리, 시즌별 기록/통계/랭킹 분리

---

## 📋 목차

1. [League Season System 개념](#1-league-season-system-개념)
2. [시즌 구조](#2-시즌-구조)
3. [Firestore 구조](#3-firestore-구조)
4. [시즌별 데이터 분리](#4-시즌별-데이터-분리)
5. [UI 구조](#5-ui-구조)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ League Season System 개념

### League Season System 역할

**리그 시즌을 관리하고, 시즌별 기록/통계/랭킹을 분리하는 시스템**입니다.

### 시즌 관리의 필요성

```
2024 Season
2025 Season
2026 Season
```

각 시즌마다:
- 기록 분리
- 통계 분리
- 랭킹 분리

### 시즌 구조

```
League
  ├─ 2024 Season
  │     ├─ Teams
  │     ├─ Matches
  │     ├─ Standings
  │     └─ Stats
  │
  ├─ 2025 Season
  │     ├─ Teams
  │     ├─ Matches
  │     ├─ Standings
  │     └─ Stats
  │
  └─ 2026 Season
        └─ ...
```

---

## 2️⃣ 시즌 구조

### 2-1. Season 문서

```
leagues/{leagueId}/seasons/{seasonId}
```

**문서 스키마**:
```typescript
{
  seasonId: string; // "2024", "2025", "2024-spring"
  name: string; // "2024 Season", "2025 Spring Season"
  startDate: Timestamp;
  endDate: Timestamp;
  status: "draft" | "registration" | "active" | "completed";
  teamCount: number;
  matchCount: number;
  createdAt: Timestamp;
}
```

### 2-2. 시즌별 팀

```
leagues/{leagueId}/seasons/{seasonId}/teams/{teamId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  teamName: string;
  joinedAt: Timestamp;
  status: "active" | "withdrawn";
}
```

### 2-3. 시즌별 경기

```
leagues/{leagueId}/seasons/{seasonId}/matches/{matchId}
```

**문서 스키마**:
```typescript
{
  matchId: string; // matches/{matchId} 참조
  round: number;
  scheduledDate: Timestamp;
  status: "scheduled" | "live" | "finished";
}
```

### 2-4. 시즌별 순위

```
leagues/{leagueId}/seasons/{seasonId}/standings/{teamId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  rank: number;
  updatedAt: Timestamp;
}
```

### 2-5. 시즌별 선수 통계

```
players/{playerId}/stats/{seasonId}
```

**문서 스키마**:
```typescript
{
  seasonId: string;
  leagueId: string;
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  updatedAt: Timestamp;
}
```

---

## 3️⃣ Firestore 구조

### 3-1. 모든 시즌 관련 문서에 seasonId 포함

```
matches/{matchId}
  seasonId: "2025"

standings/{standingId}
  seasonId: "2025"

player_stats/{statId}
  seasonId: "2025"
```

### 3-2. 시즌별 쿼리

```
시즌별 경기 조회
matches where leagueId == X and seasonId == "2025"

시즌별 순위 조회
standings where leagueId == X and seasonId == "2025"
```

---

## 4️⃣ 시즌별 데이터 분리

### 4-1. 시즌 생성 시 자동 처리

```
시즌 생성
  ↓
시즌 문서 생성
  ↓
팀 등록 시작
  ↓
경기 일정 생성
  ↓
시즌 시작
```

### 4-2. 시즌별 통계 분리

```
2024 Season Stats
2025 Season Stats
```

각 시즌의 통계는 완전히 분리됩니다.

---

## 5️⃣ UI 구조

### 5-1. 시즌 선택 UI

```
┌─────────────────────────────────────────┐
│ 시즌 선택                                 │
│                                          │
│ [ 2024 Season ]                         │
│ [ 2025 Season ] ← 현재                   │
│ [ 2026 Season ]                         │
└─────────────────────────────────────────┘
```

### 5-2. 시즌 대시보드

```
┌─────────────────────────────────────────┐
│ 2025 Season                              │
│                                          │
│ Teams: 12                                │
│ Matches: 66                              │
│ Status: In Progress                     │
│                                          │
│ [ 팀 ] [ 경기 일정 ] [ 순위 ] [ 통계 ]   │
└─────────────────────────────────────────┘
```

### 5-3. 시즌 생성 UI

```
┌─────────────────────────────────────────┐
│ 시즌 생성                                 │
│                                          │
│ 시즌명: [2025 Season]                   │
│ 시작일: [2025-03-01]                    │
│ 종료일: [2025-10-31]                    │
│                                          │
│ [ 시즌 생성 ]                            │
└─────────────────────────────────────────┘
```

---

## 6️⃣ 실제 구현 코드

### 6-1. Season Service

```typescript
// src/services/seasonService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  serverTimestamp,
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

interface CreateSeasonParams {
  leagueId: string;
  seasonId: string; // "2025"
  name: string; // "2025 Season"
  startDate: Date;
  endDate: Date;
}

export async function createSeason(params: CreateSeasonParams): Promise<string> {
  const { leagueId, seasonId, name, startDate, endDate } = params;
  
  // 시즌 문서 생성
  const seasonRef = doc(db, "leagues", leagueId, "seasons", seasonId);
  await setDoc(seasonRef, {
    seasonId,
    name,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    status: "draft",
    teamCount: 0,
    matchCount: 0,
    createdAt: serverTimestamp(),
  });
  
  return seasonId;
}

export async function getSeasons(leagueId: string): Promise<any[]> {
  const seasonsRef = collection(db, "leagues", leagueId, "seasons");
  const q = query(seasonsRef, orderBy("seasonId", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getCurrentSeason(leagueId: string): Promise<any | null> {
  const seasonsRef = collection(db, "leagues", leagueId, "seasons");
  const q = query(
    seasonsRef,
    where("status", "in", ["registration", "active"]),
    orderBy("startDate", "desc"),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  };
}
```

### 6-2. Season Selector 컴포넌트

```typescript
// src/components/league/SeasonSelector.tsx
import { useState, useEffect } from "react";
import { getSeasons } from "@/services/seasonService";

interface SeasonSelectorProps {
  leagueId: string;
  currentSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
}

export function SeasonSelector({ 
  leagueId, 
  currentSeasonId, 
  onSeasonChange 
}: SeasonSelectorProps) {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const seasonsData = await getSeasons(leagueId);
        setSeasons(seasonsData);
      } catch (error) {
        console.error("시즌 목록 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSeasons();
  }, [leagueId]);
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <label className="block text-sm font-semibold mb-2">시즌 선택</label>
      <select
        value={currentSeasonId}
        onChange={(e) => onSeasonChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.seasonId}>
            {season.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 6-3. Season Dashboard 컴포넌트

```typescript
// src/components/league/SeasonDashboard.tsx
import { useState, useEffect } from "react";
import { getCurrentSeason } from "@/services/seasonService";
import { useLeagueTeams } from "@/hooks/useLeagueTeams";
import { useLeagueMatches } from "@/hooks/useLeagueMatches";
import { useLeagueStandings } from "@/hooks/useLeagueStandings";

interface SeasonDashboardProps {
  leagueId: string;
  seasonId: string;
}

export function SeasonDashboard({ leagueId, seasonId }: SeasonDashboardProps) {
  const { teams, loading: teamsLoading } = useLeagueTeams(leagueId, seasonId);
  const { matches, loading: matchesLoading } = useLeagueMatches(leagueId, seasonId);
  const { standings, loading: standingsLoading } = useLeagueStandings(leagueId, seasonId);
  
  if (teamsLoading || matchesLoading || standingsLoading) {
    return <div>로딩 중...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* 시즌 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-2xl font-bold">{teams.length}</div>
          <div className="text-sm text-gray-500">참가 팀</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-2xl font-bold">{matches.length}</div>
          <div className="text-sm text-gray-500">총 경기</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-2xl font-bold">
            {matches.filter(m => m.status === "finished").length}
          </div>
          <div className="text-sm text-gray-500">완료 경기</div>
        </div>
      </div>
      
      {/* 순위 상위 5팀 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">순위 상위 5팀</h3>
        <div className="space-y-2">
          {standings.slice(0, 5).map((team, index) => (
            <div key={team.teamId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="font-bold w-6">{index + 1}</span>
                <span className="font-semibold">{team.teamName}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>{team.played}경기</span>
                <span className="font-bold">{team.points}점</span>
              </div>
            </div>
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
- [ ] Season Service
- [ ] Season Selector 컴포넌트
- [ ] Season Dashboard 컴포넌트
- [ ] 모든 문서에 seasonId 추가

### Phase 2 (다음)
- [ ] 시즌별 통계 분리
- [ ] 시즌별 랭킹 분리
- [ ] 시즌 전환 기능

### Phase 3 (확장)
- [ ] 시즌 아카이브
- [ ] 시즌 비교
- [ ] 시즌 리포트

---

**작성일**: 2024년  
**상태**: ✅ League Season System 설계 완료
