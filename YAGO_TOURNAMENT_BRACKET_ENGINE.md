# 🏆 YAGO VIBE SPORTS - Tournament Bracket Engine (토너먼트 자동 생성 엔진) 설계

> **작성일**: 2024년  
> **목적**: 리그 + 토너먼트 시스템 완성을 위한 플레이오프 브라켓 생성

---

## 📋 목차

1. [Tournament Bracket 개념](#1-tournament-bracket-개념)
2. [Bracket 타입](#2-bracket-타입)
3. [Bracket 알고리즘](#3-bracket-알고리즘)
4. [Firestore 구조](#4-firestore-구조)
5. [UI 구조](#5-ui-구조)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ Tournament Bracket 개념

### Tournament Bracket 역할

**리그 상위 팀들이 토너먼트 형식으로 경기하는 플레이오프 시스템**입니다.

### 예시

```
리그 상위 4팀

Semi Final
1 vs 4
2 vs 3

Final
Winner vs Winner
```

### 리그 + 토너먼트 구조

```
Round Robin League
      ↓
상위 팀 선정
      ↓
Tournament Bracket
      ↓
Champion
```

---

## 2️⃣ Bracket 타입

### 2-1. Single Elimination (단일 탈락)

```
8팀 토너먼트

Quarter Final
1 vs 8
2 vs 7
3 vs 6
4 vs 5

Semi Final
Winner vs Winner
Winner vs Winner

Final
Winner vs Winner
```

### 2-2. Double Elimination (복수 탈락)

```
8팀 토너먼트

Winner Bracket
1 vs 8
2 vs 7
...

Loser Bracket
(패자들 경기)

Grand Final
Winner Bracket Winner vs Loser Bracket Winner
```

### 2-3. Round Robin + Playoff (하이브리드)

```
리그 상위 4팀

Semi Final
1 vs 4
2 vs 3

Final
Winner vs Winner
```

---

## 3️⃣ Bracket 알고리즘

### 3-1. Single Elimination 생성

```typescript
// src/services/tournamentBracketService.ts

interface BracketMatch {
  round: string; // "quarter_final", "semi_final", "final"
  roundNumber: number;
  matchNumber: number;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  winnerTeamId?: string;
  scheduledDate?: Date;
}

export function generateSingleEliminationBracket(teams: Team[]): BracketMatch[] {
  const teamCount = teams.length;
  const rounds = Math.ceil(Math.log2(teamCount));
  const bracket: BracketMatch[] = [];
  
  // 시드 배정 (1번 시드가 가장 강한 팀)
  const seededTeams = [...teams].sort((a, b) => {
    // 리그 순위 기준으로 정렬 (이미 정렬되어 있다고 가정)
    return 0;
  });
  
  // 첫 라운드 매칭 (1 vs 마지막, 2 vs 마지막-1, ...)
  let currentRound = 1;
  let currentTeams = seededTeams;
  let matchNumber = 1;
  
  while (currentTeams.length > 1) {
    const roundName = getRoundName(currentRound, rounds);
    const roundMatches: BracketMatch[] = [];
    
    // 팀을 두 개씩 매칭
    for (let i = 0; i < currentTeams.length; i += 2) {
      if (i + 1 < currentTeams.length) {
        roundMatches.push({
          round: roundName,
          roundNumber: currentRound,
          matchNumber: matchNumber++,
          homeTeamId: currentTeams[i].id,
          homeTeamName: currentTeams[i].name,
          awayTeamId: currentTeams[i + 1].id,
          awayTeamName: currentTeams[i + 1].name,
        });
      } else {
        // 홀수인 경우 부전승
        roundMatches.push({
          round: roundName,
          roundNumber: currentRound,
          matchNumber: matchNumber++,
          homeTeamId: currentTeams[i].id,
          homeTeamName: currentTeams[i].name,
        });
      }
    }
    
    bracket.push(...roundMatches);
    
    // 다음 라운드를 위해 승자만 남김 (실제로는 경기 결과 후)
    currentTeams = roundMatches.map(m => {
      // 승자는 나중에 업데이트
      return { id: m.homeTeamId!, name: m.homeTeamName! };
    });
    
    currentRound++;
  }
  
  return bracket;
}

function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return "final";
  if (round === totalRounds - 1) return "semi_final";
  if (round === totalRounds - 2) return "quarter_final";
  return `round_${round}`;
}
```

### 3-2. Playoff Bracket 생성 (리그 상위 팀)

```typescript
export function generatePlayoffBracket(
  topTeams: Team[], // 리그 상위 팀들
  format: "top4" | "top8" = "top4"
): BracketMatch[] {
  if (format === "top4") {
    // Semi Final + Final
    return [
      {
        round: "semi_final",
        roundNumber: 1,
        matchNumber: 1,
        homeTeamId: topTeams[0].id,
        homeTeamName: topTeams[0].name,
        awayTeamId: topTeams[3].id,
        awayTeamName: topTeams[3].name,
      },
      {
        round: "semi_final",
        roundNumber: 1,
        matchNumber: 2,
        homeTeamId: topTeams[1].id,
        homeTeamName: topTeams[1].name,
        awayTeamId: topTeams[2].id,
        awayTeamName: topTeams[2].name,
      },
      {
        round: "final",
        roundNumber: 2,
        matchNumber: 1,
        // 승자는 경기 결과 후 업데이트
      },
    ];
  } else {
    // Top 8: Quarter Final + Semi Final + Final
    return generateSingleEliminationBracket(topTeams);
  }
}
```

---

## 4️⃣ Firestore 구조

### 4-1. Tournament 컬렉션

```
tournaments/{tournamentId}
```

**문서 스키마**:
```typescript
{
  leagueId: string; // 연결된 리그 ID
  name: string; // "2025 Seoul League Playoff"
  format: "single_elimination" | "double_elimination" | "playoff";
  teamCount: number; // 참가 팀 수
  status: "draft" | "active" | "completed";
  startDate: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
}
```

### 4-2. Tournament Bracket 서브컬렉션

```
tournaments/{tournamentId}/bracket/{matchId}
```

**문서 스키마**:
```typescript
{
  round: string; // "quarter_final", "semi_final", "final"
  roundNumber: number;
  matchNumber: number;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  winnerTeamId?: string;
  scheduledDate?: Timestamp;
  status: "scheduled" | "live" | "finished";
  createdAt: Timestamp;
}
```

---

## 5️⃣ UI 구조

### 5-1. Bracket 생성 UI

```
┌─────────────────────────────────────────┐
│ Tournament Bracket 생성                   │
│                                          │
│ 리그: Seoul Futsal League 2025          │
│                                          │
│ 포맷: [ Playoff (Top 4) ]               │
│                                          │
│ 상위 팀 (4팀)                            │
│ ┌─────────────────────────────────────┐ │
│ │ 1. Tigers (20 pts)                  │ │
│ │ 2. Lions (18 pts)                   │ │
│ │ 3. Eagles (16 pts)                  │ │
│ │ 4. Wolves (14 pts)                  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 시작일: [2025-05-20]                     │
│                                          │
│ [ Bracket 생성 ]                         │
└─────────────────────────────────────────┘
```

### 5-2. Bracket View UI

```
┌─────────────────────────────────────────┐
│ Tournament Bracket                       │
│                                          │
│ Semi Final                               │
│ ┌──────────┐      ┌──────────┐         │
│ │ Tigers   │      │ Lions    │         │
│ │ (1)      │      │ (2)      │         │
│ └──────────┘      └──────────┘         │
│      │                  │               │
│      └────────┬─────────┘               │
│               │                         │
│            Final                        │
│         ┌──────────┐                   │
│         │ Winner   │                   │
│         └──────────┘                   │
│                                          │
│ ┌──────────┐      ┌──────────┐         │
│ │ Eagles   │      │ Wolves   │         │
│ │ (3)      │      │ (4)      │         │
│ └──────────┘      └──────────┘         │
└─────────────────────────────────────────┘
```

---

## 6️⃣ 실제 구현 코드

### 6-1. Tournament Bracket 컴포넌트

```typescript
// src/components/tournament/TournamentBracket.tsx
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TournamentBracketProps {
  tournamentId: string;
}

export function TournamentBracket({ tournamentId }: TournamentBracketProps) {
  const [bracket, setBracket] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchBracket = async () => {
      try {
        const bracketRef = collection(db, "tournaments", tournamentId, "bracket");
        const q = query(bracketRef, orderBy("roundNumber", "asc"), orderBy("matchNumber", "asc"));
        
        const snapshot = await getDocs(q);
        const bracketData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setBracket(bracketData);
      } catch (error) {
        console.error("Bracket 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBracket();
  }, [tournamentId]);
  
  if (loading) return <div>로딩 중...</div>;
  
  // 라운드별로 그룹화
  const groupedByRound = bracket.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<string, any[]>);
  
  return (
    <div className="space-y-8">
      {Object.entries(groupedByRound).map(([round, matches]) => (
        <div key={round} className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 capitalize">
            {round.replace("_", " ")}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">{match.homeTeamName || "TBD"}</div>
                    <div className="text-sm text-gray-500">vs</div>
                    <div className="font-semibold">{match.awayTeamName || "TBD"}</div>
                  </div>
                  {match.winnerTeamId && (
                    <div className="text-green-600 font-bold">✓</div>
                  )}
                </div>
                
                {match.scheduledDate && (
                  <div className="text-sm text-gray-500 mt-2">
                    {match.scheduledDate.toDate().toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 6-2. Playoff Bracket Generator 컴포넌트

```typescript
// src/components/tournament/PlayoffBracketGenerator.tsx
import { useState } from "react";
import { useLeagueStandings } from "@/hooks/useLeagueStandings";
import { createPlayoffBracket } from "@/services/tournamentBracketService";

interface PlayoffBracketGeneratorProps {
  leagueId: string;
  onComplete: () => void;
}

export function PlayoffBracketGenerator({ leagueId, onComplete }: PlayoffBracketGeneratorProps) {
  const { standings, loading } = useLeagueStandings(leagueId);
  const [topCount, setTopCount] = useState(4);
  const [startDate, setStartDate] = useState("");
  const [generating, setGenerating] = useState(false);
  
  const topTeams = standings.slice(0, topCount);
  
  const handleGenerate = async () => {
    if (topTeams.length < 2) {
      alert("최소 2팀 이상 필요합니다");
      return;
    }
    
    if (!startDate) {
      alert("시작일을 선택해주세요");
      return;
    }
    
    setGenerating(true);
    try {
      await createPlayoffBracket({
        leagueId,
        teams: topTeams,
        format: topCount === 4 ? "top4" : "top8",
        startDate: new Date(startDate),
      });
      
      alert("플레이오프 브라켓이 생성되었습니다");
      onComplete();
    } catch (error) {
      console.error("브라켓 생성 실패:", error);
      alert("브라켓 생성에 실패했습니다");
    } finally {
      setGenerating(false);
    }
  };
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Playoff Bracket 생성</h2>
      
      <div className="space-y-4">
        {/* 상위 팀 수 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">상위 팀 수</label>
          <select
            value={topCount}
            onChange={(e) => setTopCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value={4}>Top 4</option>
            <option value={8}>Top 8</option>
          </select>
        </div>
        
        {/* 상위 팀 목록 */}
        <div>
          <label className="block text-sm font-semibold mb-2">상위 팀</label>
          <div className="border border-gray-200 rounded-lg p-4">
            {topTeams.map((team, index) => (
              <div key={team.teamId} className="flex items-center justify-between p-2">
                <span className="font-semibold">
                  {index + 1}. {team.teamName}
                </span>
                <span className="text-sm text-gray-500">{team.points} pts</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 시작일 */}
        <div>
          <label className="block text-sm font-semibold mb-2">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={generating || topTeams.length < 2 || !startDate}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "브라켓 생성 중..." : "Playoff Bracket 생성"}
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Single Elimination 알고리즘
- [ ] Playoff Bracket 생성 함수
- [ ] Tournament Bracket 컴포넌트
- [ ] Playoff Bracket Generator 컴포넌트

### Phase 2 (다음)
- [ ] Double Elimination 알고리즘
- [ ] Bracket 시각화
- [ ] 승자 자동 업데이트

### Phase 3 (확장)
- [ ] 3위 결정전
- [ ] 시드 배정
- [ ] Bracket 수정 기능

---

**작성일**: 2024년  
**상태**: ✅ Tournament Bracket Engine 설계 완료
